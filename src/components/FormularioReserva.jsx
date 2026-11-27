import { useEffect, useState } from "react";

export default function FormularioReserva({
  bloqueos,
  horarios,
  guardarReserva,
  verAgenda,
  probarConexion,
}) {
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  // Indica que hay una reserva enviándose al servidor.
  const [guardando, setGuardando] = useState(false);

  // Guarda la fecha consultada, sus horarios ocupados y el estado de carga.
  const [disponibilidad, setDisponibilidad] = useState({
    fecha: "",
    ocupados: [],
    cargando: false,
    error: "",
  });

  useEffect(() => {
    if (!fecha) {
      return;
    }

    // Permite cancelar la consulta si el cliente cambia de fecha.
    const controlador = new AbortController();

    async function consultarHorarios() {
      setDisponibilidad({
        fecha,
        ocupados: [],
        cargando: true,
        error: "",
      });

      try {
        const respuesta = await fetch(
          `http://localhost:3000/api/horarios-ocupados?fecha=${fecha}`,
          { signal: controlador.signal },
        );

        if (!respuesta.ok) {
          throw new Error("No se pudieron consultar los horarios.");
        }

        const ocupados = await respuesta.json();

        if (controlador.signal.aborted) {
          return;
        }

        setDisponibilidad({
          fecha,
          ocupados,
          cargando: false,
          error: "",
        });
      } catch (error) {
        // Una consulta cancelada ya fue reemplazada por otra.
        if (controlador.signal.aborted) {
          return;
        }

        setDisponibilidad({
          fecha,
          ocupados: [],
          cargando: false,
          error: error.message,
        });
      }
    }

    consultarHorarios();

    return () => controlador.abort();
  }, [fecha]);

  const hoy = new Date();

  const fechaMinima = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");

  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  // Comprueba que la respuesta corresponde al día elegido y terminó de cargar.
  const disponibilidadLista =
    disponibilidad.fecha === fecha &&
    !disponibilidad.cargando &&
    !disponibilidad.error;

  const horariosDisponibles = horarios.filter((hora) => {
    // Espera la consulta antes de ofrecer horarios.
    if (!disponibilidadLista) {
      return false;
    }

    // Comprueba si PostgreSQL devolvió este horario como ocupado.
    const ocupado = disponibilidad.ocupados.includes(hora);

    const bloqueado = bloqueos.some(
      (bloqueo) => bloqueo.fecha === fecha && bloqueo.horario === hora,
    );

    if (ocupado || bloqueado) {
      return false;
    }

    if (fecha !== fechaMinima) {
      return true;
    }

    const [horas, minutos] = hora.split(":").map(Number);
    const minutosDelTurno = horas * 60 + minutos;

    return minutosDelTurno > minutosActuales;
  });

  async function confirmarReserva() {
    // Evita volver a enviar mientras esperamos la respuesta.
    if (guardando) {
      return;
    }
    if (!servicio || !fecha || !horario || !nombre.trim() || !telefono.trim()) {
      return;
    }

    if (fecha < fechaMinima) {
      alert("Elegí una fecha desde hoy en adelante.");
      return;
    }

    const momentoActual = new Date();
    const inicioDelTurno = new Date(`${fecha}T${horario}:00`);

    if (inicioDelTurno <= momentoActual) {
      alert("Ese horario ya pasó. Elegí otro turno.");
      setHorario("");
      return;
    }

    if (!horariosDisponibles.includes(horario)) {
      alert("Ese horario ya no está disponible. Elegí otro.");
      setHorario("");
      return;
    }

    setGuardando(true);

    try {
      // Espera a que App termine la petición al backend.
      await guardarReserva({
        servicio,
        fecha,
        horario,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });
    } finally {
      // Habilita nuevamente el botón si seguimos en el formulario.
      setGuardando(false);
    }
  }

  return (
    <main>
      <h1>Reservá tu turno</h1>
      <button type="button" onClick={verAgenda}>
        Ver agenda del negocio
      </button>
      <button type="button" onClick={probarConexion}>
        Probar conexión
      </button>

      <label htmlFor="servicio">Elegí un servicio</label>

      <select
        id="servicio"
        value={servicio}
        onChange={(event) => {
          setServicio(event.target.value);
          setHorario("");
        }}
      >
        <option value="">Seleccionar servicio</option>
        <option value="corte">Corte</option>
        <option value="barba">Barba</option>
        <option value="corte-y-barba">Corte y barba</option>
      </select>

      <div>
        <label htmlFor="fecha">Elegí una fecha</label>

        <input
          id="fecha"
          type="date"
          min={fechaMinima}
          value={fecha}
          onChange={(event) => {
            setFecha(event.target.value);
            setHorario("");
          }}
        />
      </div>

      {servicio && fecha && (
        <div>
          <p>Elegí un horario</p>

          {/* Avisa mientras se consultan los horarios de la fecha elegida. */}
          {(disponibilidad.fecha !== fecha || disponibilidad.cargando) && (
            <p>Consultando horarios...</p>
          )}

          {/* Muestra el error si falló la consulta. */}
          {disponibilidad.fecha === fecha && disponibilidad.error && (
            <p role="alert">{disponibilidad.error}</p>
          )}

          {/* Avisa cuando la consulta terminó y no quedan horarios libres. */}
          {disponibilidadLista && horariosDisponibles.length === 0 && (
            <p>No quedan horarios disponibles para esta fecha. Elegí otra.</p>
          )}

          {horariosDisponibles.map((hora) => (
            <button
              key={hora}
              type="button"
              onClick={() => setHorario(hora)}
              aria-pressed={horario === hora}
            >
              {hora}
              {horario === hora && " ✓"}
            </button>
          ))}
        </div>
      )}

      {horario && (
        <div>
          <h2>Tus datos</h2>

          <div>
            <label htmlFor="nombre">Nombre y apellido</label>

            <input
              id="nombre"
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="telefono">Teléfono</label>

            <input
              id="telefono"
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={confirmarReserva}
            disabled={guardando || !nombre.trim() || !telefono.trim()}
          >
            {guardando ? "Guardando..." : "Confirmar turno"}
          </button>
        </div>
      )}

      <p>Servicio seleccionado: {servicio || "Todavía no elegiste uno"}</p>
      <p>Fecha seleccionada: {fecha || "Todavía no elegiste una"}</p>
      <p>Horario seleccionado: {horario || "Todavía no elegiste uno"}</p>
    </main>
  );
}
