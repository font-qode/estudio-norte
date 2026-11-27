import "./App.css";
import { Activity, useState } from "react";
import Agenda from "./components/Agenda";
import FormularioReserva from "./components/FormularioReserva";
import TurnoConfirmado from "./components/TurnoConfirmado";
import TurnoCancelado from "./components/TurnoCancelado";

const horarios = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

function App() {
  const [mostrarAgenda, setMostrarAgenda] = useState(false);
  // Guarda las reservas que consultamos al backend para la agenda.
const [reservasAgenda, setReservasAgenda] = useState([]);
  const [reservaCancelada, setReservaCancelada] = useState(false);
  const [reservas, setReservas] = useState(() => {
    try {
      const contenido = localStorage.getItem("reserva");
      const datos = contenido ? JSON.parse(contenido) : null;

      if (!datos) {
        return [];
      }

      if (Array.isArray(datos)) {
        return datos;
      }

      // Conserva la reserva guardada con la versión anterior.
      return [{ ...datos, id: "reserva-anterior" }];
    } catch {
      return [];
    }
  });

  const [reserva, setReserva] = useState(
    () => reservas[reservas.length - 1] ?? null,
  );

  // Los bloqueos se cargan desde PostgreSQL al abrir la agenda.
const [bloqueos, setBloqueos] = useState([]);

  // Guarda un único bloqueo en PostgreSQL.
async function bloquearHorario(fecha, horario) {
  try {
    const respuesta = await fetch(
      "http://localhost:3000/api/bloqueos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, horario }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo guardar el bloqueo.");
    }

    // Agrega el bloqueo con el id generado por PostgreSQL.
    setBloqueos((anteriores) => [...anteriores, datos]);
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// Quita un bloqueo de PostgreSQL y después actualiza React.
async function desbloquearHorario(id) {
  try {
    const respuesta = await fetch(
      `http://localhost:3000/api/bloqueos/${id}`,
      { method: "DELETE" }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo quitar el bloqueo.");
    }

    setBloqueos((anteriores) =>
      anteriores.filter((bloqueo) => bloqueo.id !== id)
    );

    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

  // Envía la reserva a Express para guardarla en PostgreSQL.
async function guardarReserva(nuevaReserva) {
  try {
    const respuesta = await fetch(
      "http://localhost:3000/api/reservas",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nuevaReserva),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo guardar la reserva.");
    }

    // Usa la reserva que devuelve PostgreSQL, incluido su id.
    setReservas((anteriores) => [...anteriores, datos]);
    setReserva(datos);
    setReservaCancelada(false);

    return true;
  } catch (error) {
    console.error("Error al guardar la reserva:", error);
    alert(error.message);
    return false;
  }
}

  // Solicita al backend que elimine el turno de PostgreSQL.
async function cancelarReserva() {
  if (!reserva) {
    return;
  }

  const id = reserva.id;

  try {
    const respuesta = await fetch(
      `http://localhost:3000/api/reservas/${id}`,
      {
        method: "DELETE",
      }
    );

    const datos = await respuesta.json();

    // Si ya no existe, también podemos mostrarla como cancelada.
    if (!respuesta.ok && respuesta.status !== 404) {
      throw new Error(datos.mensaje || "No se pudo cancelar el turno.");
    }

    // Actualiza las listas de React después de la respuesta del servidor.
    setReservas((anteriores) =>
      anteriores.filter((turno) => turno.id !== id)
    );

    setReservasAgenda((anteriores) =>
      anteriores.filter((turno) => turno.id !== id)
    );

    setReserva(null);
    setReservaCancelada(true);
  } catch (error) {
    console.error("Error al cancelar el turno:", error);
    alert(error.message);
  }
}

  function volverAReservar() {
    setReserva(null);
    setReservaCancelada(false);
  }

  // Consulta las reservas al backend antes de abrir la agenda.
// Consulta reservas y bloqueos antes de abrir la agenda.
async function verAgenda() {
  try {
    const [respuestaReservas, respuestaBloqueos] = await Promise.all([
      fetch("http://localhost:3000/api/reservas"),
      fetch("http://localhost:3000/api/bloqueos"),
    ]);

    if (!respuestaReservas.ok || !respuestaBloqueos.ok) {
      throw new Error("No se pudieron cargar los datos de la agenda.");
    }

    const [datosReservas, datosBloqueos] = await Promise.all([
      respuestaReservas.json(),
      respuestaBloqueos.json(),
    ]);

    setReservasAgenda(datosReservas);
    setBloqueos(datosBloqueos);
    setMostrarAgenda(true);
  } catch (error) {
    console.error("Error al cargar la agenda:", error);
    alert(error.message);
  }
}

  // Consulta al backend y muestra su respuesta.
async function probarConexion() {
  try {
    const respuesta = await fetch("http://localhost:3000/api/estado");

    if (!respuesta.ok) {
      throw new Error("El servidor respondió con un error.");
    }

    const datos = await respuesta.json();

    alert(datos.mensaje);
  } catch (error) {
    console.error("Error al consultar el backend:", error);
    alert("No se pudo conectar con el servidor.");
  }
}

  return (
    <>
      <Activity mode={mostrarAgenda ? "hidden" : "visible"}>
        {reservaCancelada ? (
          <TurnoCancelado volverAReservar={volverAReservar} />
        ) : reserva ? (
          <TurnoConfirmado
            reserva={reserva}
            cancelarReserva={cancelarReserva}
            volverAReservar={volverAReservar}
            verAgenda={verAgenda}
          />
        ) : (
          <FormularioReserva
            probarConexion={probarConexion}
            bloqueos={bloqueos}
            horarios={horarios}
            guardarReserva={guardarReserva}
            verAgenda={verAgenda}
          />
        )}
      </Activity>
      {mostrarAgenda && (
        <Agenda
          reservas={reservasAgenda}
          bloqueos={bloqueos}
          horarios={horarios}
          bloquearHorario={bloquearHorario}
          desbloquearHorario={desbloquearHorario}
          volver={() => setMostrarAgenda(false)}
        />
      )}
    </>
  );
}

export default App;
