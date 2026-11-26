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

// Inicia el servidor.
app.listen(PORT, () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});