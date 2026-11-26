export default function TurnoCancelado({ volverAReservar }) {
  return (
    <main>
      <h1>Turno cancelado</h1>

      <p>Cancelaste tu reserva. Podés elegir un nuevo turno.</p>

      <button type="button" onClick={volverAReservar}>
        Volver a reservar
      </button>
    </main>
  );
}
