import { useState } from "react";

export default function FormularioReserva({
  reservas,
  bloqueos,
  horarios,
  guardarReserva,
  verAgenda,
  probarConexion
}) {
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const hoy = new Date();

  const fechaMinima = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");

  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  const horariosDisponibles = horarios.filter((hora) => {
    const ocupado = reservas.some(
      (turno) => turno.fecha === fecha && turno.horario === hora
    );

    const bloqueado = bloqueos.some(
      (bloqueo) => bloqueo.fecha === fecha && bloqueo.horario === hora
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

  function confirmarReserva() {
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

    guardarReserva({
      id: crypto.randomUUID(),
      servicio,
      fecha,
      horario,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
    });
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

          {horariosDisponibles.length === 0 && (
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
            disabled={!nombre.trim() || !telefono.trim()}
          >
            Confirmar turno
          </button>
        </div>
      )}

      <p>Servicio seleccionado: {servicio || "Todavía no elegiste uno"}</p>
      <p>Fecha seleccionada: {fecha || "Todavía no elegiste una"}</p>
      <p>Horario seleccionado: {horario || "Todavía no elegiste uno"}</p>
    </main>
  );
}
