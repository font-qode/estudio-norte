import { useState } from "react";

export default function TurnoConfirmado({
  reserva,
  cancelarReserva,
  volverAReservar,
  verAgenda,
}) {
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  return (
    <main>
      <h1>¡Turno confirmado!</h1>
      <button type="button" onClick={verAgenda}>
        Ver agenda del negocio
      </button>

      <p>Gracias, {reserva.nombre}.</p>
      <p>Servicio: {reserva.servicio}</p>
      <p>Fecha: {reserva.fecha}</p>
      <p>Horario: {reserva.horario}</p>
      <p>Teléfono: {reserva.telefono}</p>

      <button type="button" onClick={() => setMostrarConfirmacion(true)}>
        Cancelar turno
      </button>
      {mostrarConfirmacion && (
        <section role="region" aria-labelledby="titulo-cancelacion">
          <h2 id="titulo-cancelacion">¿Querés cancelar tu turno?</h2>

          <p>
            Tu turno del {reserva.fecha} a las {reserva.horario} quedará
            disponible para otra persona.
          </p>

          <button type="button" onClick={cancelarReserva}>
            Sí, cancelar turno
          </button>

          <button type="button" onClick={() => setMostrarConfirmacion(false)}>
            Conservar turno
          </button>
        </section>
      )}
      <button type="button" onClick={volverAReservar}>
        Reservar otro turno
      </button>
    </main>
  );
}
