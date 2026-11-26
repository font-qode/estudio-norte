import "./App.css";
import { Activity, useState } from "react";
import Agenda from "./components/Agenda";
import FormularioReserva from "./components/FormularioReserva";
import TurnoConfirmado from "./components/TurnoConfirmado";
import TurnoCancelado from "./components/TurnoCancelado";

const horarios = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

function App() {
  const [mostrarAgenda, setMostrarAgenda] = useState(false);
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

  const [bloqueos, setBloqueos] = useState(() => {
    try {
      const contenido = localStorage.getItem("bloqueos");
      const datos = contenido ? JSON.parse(contenido) : [];

      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  });

  function guardarBloqueos(nuevosBloqueos, mensajeDeError) {
    try {
      localStorage.setItem("bloqueos", JSON.stringify(nuevosBloqueos));
    } catch {
      alert(mensajeDeError);
      return false;
    }

    setBloqueos(nuevosBloqueos);
    return true;
  }

  function guardarReserva(nuevaReserva) {
    const nuevasReservas = [...reservas, nuevaReserva];

    try {
      localStorage.setItem("reserva", JSON.stringify(nuevasReservas));
    } catch {
      alert("No se pudo guardar el turno en este navegador.");
      return;
    }

    setReservas(nuevasReservas);
    setReserva(nuevaReserva);
    setReservaCancelada(false);
  }

  function cancelarReserva() {
    if (!reserva) {
      return;
    }

    const nuevasReservas = reservas.filter((turno) => turno.id !== reserva.id);

    try {
      localStorage.setItem("reserva", JSON.stringify(nuevasReservas));
    } catch {
      alert("No se pudo cancelar el turno. Intentá nuevamente.");
      return;
    }

    setReservas(nuevasReservas);
    setReservaCancelada(true);
    setReserva(null);
  }

  function volverAReservar() {
    setReserva(null);
    setReservaCancelada(false);
  }

  function verAgenda() {
    setMostrarAgenda(true);
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
            reservas={reservas}
            bloqueos={bloqueos}
            horarios={horarios}
            guardarReserva={guardarReserva}
            verAgenda={verAgenda}
          />
        )}
      </Activity>
      {mostrarAgenda && (
        <Agenda
          reservas={reservas}
          bloqueos={bloqueos}
          horarios={horarios}
          guardarBloqueos={guardarBloqueos}
          volver={() => setMostrarAgenda(false)}
        />
      )}
    </>
  );
}

export default App;
