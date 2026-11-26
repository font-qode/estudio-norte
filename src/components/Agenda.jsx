import { useState } from "react";

function Agenda({
  reservas,
  bloqueos,
  horarios,
  guardarBloqueos,
  volver,
}) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    reservas[reservas.length - 1]?.fecha ?? "",
  );

  // Guarda el horario que el dueño selecciona para bloquear.
  const [horarioABloquear, setHorarioABloquear] = useState("");

  const reservasDelDia = reservas
    .filter((turno) => turno.fecha === fechaSeleccionada)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  // Obtiene los bloqueos de la fecha seleccionada y los ordena por hora.
  const bloqueosDelDia = bloqueos
    .filter((bloqueo) => bloqueo.fecha === fechaSeleccionada)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  // Ofrece los horarios que están libres para ese día.
  const horariosLibres = horarios.filter((hora) => {
    const ocupado = reservasDelDia.some((turno) => turno.horario === hora);

    const bloqueado = bloqueosDelDia.some(
      (bloqueo) => bloqueo.horario === hora,
    );

    return !ocupado && !bloqueado;
  });

  function confirmarBloqueo() {
    if (!fechaSeleccionada || !horarios.includes(horarioABloquear)) {
      return;
    }

    const inicio = new Date(`${fechaSeleccionada}T${horarioABloquear}:00`);

    if (Number.isNaN(inicio.getTime()) || inicio <= new Date()) {
      alert("Elegí una fecha y un horario futuros.");
      return;
    }

    if (!horariosLibres.includes(horarioABloquear)) {
      alert("Ese horario ya está reservado o bloqueado.");
      return;
    }

    const guardado = guardarBloqueos(
      [...bloqueos, { fecha: fechaSeleccionada, horario: horarioABloquear }],
      "No se pudo guardar el bloqueo.",
    );

    if (guardado) {
      setHorarioABloquear("");
    }
  }

  function desbloquearHorario({ fecha, horario }) {
    const nuevosBloqueos = bloqueos.filter(
      (bloqueo) => bloqueo.fecha !== fecha || bloqueo.horario !== horario,
    );

    guardarBloqueos(nuevosBloqueos, "No se pudo quitar el bloqueo.");
  }

  return (
    <main>
      <h1>Agenda del negocio</h1>

      <button type="button" onClick={volver}>
        Volver
      </button>

      <div>
        <label htmlFor="fecha-agenda">Consultar día</label>

        <input
          id="fecha-agenda"
          type="date"
          value={fechaSeleccionada}
          onChange={(event) => {
            setFechaSeleccionada(event.target.value);

            // Al cambiar de día, reinicia el horario a bloquear.
            setHorarioABloquear("");
          }}
        />
      </div>

      {/* Muestra los controles de bloqueo cuando hay una fecha elegida. */}
      {fechaSeleccionada && (
        <section>
          <h2>Bloquear horario</h2>

          <label htmlFor="horario-bloqueo">Horario</label>

          <select
            id="horario-bloqueo"
            value={horarioABloquear}
            onChange={(event) => setHorarioABloquear(event.target.value)}
          >
            <option value="">Seleccionar horario</option>

            {horariosLibres.map((hora) => (
              <option key={hora} value={hora}>
                {hora}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={confirmarBloqueo}
            disabled={!horarioABloquear}
          >
            Bloquear horario
          </button>

          {/* Avisa cuando todos los horarios están reservados o bloqueados. */}
          {horariosLibres.length === 0 && (
            <p>No hay horarios libres para bloquear en esta fecha.</p>
          )}

          {/* Permite ver los bloqueos guardados para el día seleccionado. */}
          {bloqueosDelDia.length > 0 && (
            <div>
              <h3>Horarios bloqueados</h3>

              <ul>
                {bloqueosDelDia.map((bloqueo) => (
                  <li key={bloqueo.horario}>
                    {bloqueo.horario}

                    {/* Quita este bloqueo y actualiza los horarios disponibles. */}
                    <button
                      type="button"
                      onClick={() => desbloquearHorario(bloqueo)}
                    >
                      Desbloquear
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {reservasDelDia.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Teléfono</th>
            </tr>
          </thead>

          <tbody>
            {reservasDelDia.map((turno) => (
              <tr key={turno.id}>
                <td>{turno.fecha}</td>
                <td>{turno.horario}</td>
                <td>{turno.nombre}</td>
                <td>{turno.servicio}</td>
                <td>{turno.telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay turnos para la fecha seleccionada.</p>
      )}
    </main>
  );
}

export default Agenda;
