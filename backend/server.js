/* global require */
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = 3000;

// Permite que el frontend local consulte este servidor.
app.use(cors({ origin: "http://localhost:5173" }));

// Permite recibir cuerpos de solicitudes en formato JSON.
app.use(express.json());

// Coordina el guardado de reservas y bloqueos para un mismo horario.
async function guardarEnHorario(fecha, horario, consulta, valores) {
  let cliente;
  let descartarConexion = false;

  try {
    cliente = await pool.connect();

    // Todas las consultas de esta operación usan la misma conexión.
    await cliente.query("BEGIN ISOLATION LEVEL READ COMMITTED");

    // Si otra solicitud está trabajando con este horario, espera.
    // El bloqueo se libera al terminar la transacción.
    await cliente.query(
      `
        SELECT pg_advisory_xact_lock(
          hashtext($1::text || ' ' || $2::text)::bigint
        )
      `,
      [fecha, horario]
    );

    // Revisa la hora después de obtener el bloqueo.
    const validacion = await cliente.query(
      `
        SELECT ($1::date + $2::time) >
          (clock_timestamp() AT TIME ZONE
            'America/Argentina/Buenos_Aires') AS futuro
      `,
      [fecha, horario]
    );

    if (!validacion.rows[0].futuro) {
      await cliente.query("ROLLBACK");

      return {
        estado: 400,
        datos: { mensaje: "Elegí una fecha y un horario futuros." },
      };
    }

    // Comprueba las dos tablas antes de guardar.
    const ocupacion = await cliente.query(
      `
        SELECT EXISTS (
          SELECT 1 FROM reservas
          WHERE fecha = $1::date AND horario = $2::time

          UNION ALL

          SELECT 1 FROM bloqueos
          WHERE fecha = $1::date AND horario = $2::time
        ) AS ocupado
      `,
      [fecha, horario]
    );

    if (ocupacion.rows[0].ocupado) {
      await cliente.query("ROLLBACK");

      return {
        estado: 409,
        datos: {
          mensaje: "Ese horario ya está reservado o bloqueado.",
        },
      };
    }

    // Ejecuta el INSERT que recibió desde la ruta.
    const resultado = await cliente.query(consulta, valores);

    await cliente.query("COMMIT");

    return {
      estado: 201,
      datos: resultado.rows[0],
    };
  } catch (error) {
    // Deshace la operación si alguna consulta falla.
    if (cliente) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Una conexión que falló al recuperarse se retira del pool.
        descartarConexion = true;
      }
    }

    if (error.code === "23505") {
      return {
        estado: 409,
        datos: { mensaje: "Ese horario ya está ocupado." },
      };
    }

    if (error.code === "22007" || error.code === "22008") {
      return {
        estado: 400,
        datos: { mensaje: "La fecha ingresada no es válida." },
      };
    }

    console.error("Error al guardar el horario:", error.message);

    return {
      estado: 500,
      datos: { mensaje: "No se pudo guardar la operación." },
    };
  } finally {
    // Devuelve la conexión al pool o la descarta si quedó dañada.
    if (cliente) {
      cliente.release(descartarConexion);
    }
  }
}

// Ruta para comprobar que el servidor responde.
app.get("/api/estado", (req, res) => {
  res.json({
    mensaje: "Servidor de Estudio Norte funcionando",
  });
});

// Consulta PostgreSQL para comprobar la conexión.
app.get("/api/base-de-datos", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT current_database() AS base"
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error de conexión:", error.message);

    res.status(500).json({
      mensaje: "No se pudo conectar con PostgreSQL",
    });
  }
});

// Consulta las reservas guardadas y las devuelve como JSON.
app.get("/api/reservas", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        servicio,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        TO_CHAR(horario, 'HH24:MI') AS horario,
        nombre,
        telefono
      FROM reservas
      ORDER BY fecha, horario
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar reservas:", error.message);

    res.status(500).json({
      mensaje: "No se pudieron obtener las reservas",
    });
  }
});

// Recibe los datos del frontend y guarda una reserva.
app.post("/api/reservas", async (req, res) => {
  const { servicio, fecha, horario, nombre, telefono } = req.body ?? {};

  // Comprueba que todos los campos sean textos con contenido.
  const campos = [servicio, fecha, horario, nombre, telefono];

  if (campos.some((campo) => typeof campo !== "string" || !campo.trim())) {
    return res.status(400).json({
      mensaje: "Completá todos los datos de la reserva.",
    });
  }

  // Comprueba los servicios y horarios que ofrecemos.
  const servicios = ["corte", "barba", "corte-y-barba"];
  const horarios = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

  if (
    !servicios.includes(servicio) ||
    !horarios.includes(horario) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    nombre.trim().length > 100 ||
    telefono.trim().length > 30
  ) {
    return res.status(400).json({
      mensaje: "Revisá el servicio, la fecha y los datos ingresados.",
    });
  }

    // Usa el control compartido con los bloqueos.
  const resultado = await guardarEnHorario(
    fecha,
    horario,
    `
      INSERT INTO reservas (
        servicio, fecha, horario, nombre, telefono
      )
      VALUES ($1, $2::date, $3::time, $4, $5)
      RETURNING
        id,
        servicio,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        TO_CHAR(horario, 'HH24:MI') AS horario,
        nombre,
        telefono
    `,
    [servicio, fecha, horario, nombre.trim(), telefono.trim()]
  );

  res.status(resultado.estado).json(resultado.datos);
});

// Devuelve los horarios ocupados para la fecha consultada.
app.get("/api/horarios-ocupados", async (req, res) => {
  const { fecha } = req.query;

  // Verifica que recibamos una fecha con formato YYYY-MM-DD.
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({
      mensaje: "Ingresá una fecha válida.",
    });
  }

  try {
    const resultado = await pool.query(
      `
        SELECT TO_CHAR(horario, 'HH24:MI') AS horario
        FROM reservas
        WHERE fecha = $1::date

        UNION

        SELECT TO_CHAR(horario, 'HH24:MI') AS horario
        FROM bloqueos
        WHERE fecha = $1::date

        ORDER BY horario
      `,
      [fecha]
    );

    // Convierte las filas en una lista como ["09:00", "10:30"].
    const horariosOcupados = resultado.rows.map(
      (turno) => turno.horario
    );

    res.json(horariosOcupados);
  } catch (error) {
    if (error.code === "22007" || error.code === "22008") {
      return res.status(400).json({
        mensaje: "La fecha ingresada no existe.",
      });
    }

    console.error("Error al consultar horarios:", error.message);

    res.status(500).json({
      mensaje: "No se pudieron consultar los horarios ocupados.",
    });
  }
});

// Elimina una reserva usando su identificador.
app.delete("/api/reservas/:id", async (req, res) => {
  const id = Number(req.params.id);

  // Verifica que el identificador sea un entero positivo válido.
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    return res.status(400).json({
      mensaje: "El identificador de la reserva no es válido.",
    });
  }

  try {
    const resultado = await pool.query(
      "DELETE FROM reservas WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "La reserva ya no existe.",
      });
    }

    res.json({
      mensaje: "Reserva cancelada correctamente.",
      id: resultado.rows[0].id,
    });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error.message);

    res.status(500).json({
      mensaje: "No se pudo cancelar la reserva.",
    });
  }
});

// Consulta los bloqueos guardados en PostgreSQL.
app.get("/api/bloqueos", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        TO_CHAR(horario, 'HH24:MI') AS horario
      FROM bloqueos
      ORDER BY fecha, horario
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar bloqueos:", error.message);

    res.status(500).json({
      mensaje: "No se pudieron obtener los bloqueos.",
    });
  }
});

// Guarda un bloqueo comprobando también las reservas existentes.
app.post("/api/bloqueos", async (req, res) => {
  const { fecha, horario } = req.body ?? {};

  const horarios = [
    "09:00", "09:30", "10:00",
    "10:30", "11:00", "11:30",
  ];

  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !horarios.includes(horario)
  ) {
    return res.status(400).json({
      mensaje: "Elegí una fecha y un horario válidos.",
    });
  }

  const resultado = await guardarEnHorario(
    fecha,
    horario,
    `
      INSERT INTO bloqueos (fecha, horario)
      VALUES ($1::date, $2::time)
      RETURNING
        id,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        TO_CHAR(horario, 'HH24:MI') AS horario
    `,
    [fecha, horario]
  );

  res.status(resultado.estado).json(resultado.datos);
});

// Elimina un bloqueo de PostgreSQL.
app.delete("/api/bloqueos/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    return res.status(400).json({
      mensaje: "El identificador del bloqueo no es válido.",
    });
  }

  try {
    await pool.query(
      "DELETE FROM bloqueos WHERE id = $1",
      [id]
    );

    // También responde correctamente si el bloqueo ya fue eliminado.
    res.json({ mensaje: "Horario desbloqueado.", id });
  } catch (error) {
    console.error("Error al desbloquear:", error.message);

    res.status(500).json({
      mensaje: "No se pudo quitar el bloqueo.",
    });
  }
});

// Inicia el servidor.
app.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});