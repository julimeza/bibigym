
import "./RegistroSocio.css";

function RegistroSocio({
  datos,
  manejarCambio,
  guardarSocio,
  mensaje,
  volverInicio,
}) {
  return (
    <div className="registro-socio">
      <button
        type="button"
        className="registro-volver"
        onClick={volverInicio}
      >
        <span aria-hidden="true">←</span>
        Volver al inicio
      </button>

      <div className="registro-divisor">
        <span>INFORMACIÓN DEL SOCIO</span>
      </div>

      <form
        className="registro-formulario"
        onSubmit={guardarSocio}
      >
        <div className="registro-campos">
          <div className="registro-campo">
            <label htmlFor="nombre">
              Nombre <span>*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={datos.nombre}
              onChange={manejarCambio}
              autoComplete="given-name"
              required
            />
          </div>

          <div className="registro-campo">
            <label htmlFor="apellido">
              Apellido <span>*</span>
            </label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              value={datos.apellido}
              onChange={manejarCambio}
              autoComplete="family-name"
              required
            />
          </div>

          <div className="registro-campo">
            <label htmlFor="dni">
              DNI <span>*</span>
            </label>
            <input
              id="dni"
              name="dni"
              type="text"
              inputMode="numeric"
              value={datos.dni}
              onChange={manejarCambio}
              autoComplete="off"
              required
            />
          </div>

          <div className="registro-campo">
            <label htmlFor="telefono">
              Teléfono <span>*</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={datos.telefono}
              onChange={manejarCambio}
              autoComplete="tel"
              required
            />
          </div>

          <div className="registro-campo">
            <label htmlFor="plan">Plan</label>
            <div className="registro-select-contenedor">
              <select id="plan" name="plan" value="Mensual" disabled>
                <option value="Mensual">Mensual</option>
              </select>
              <span aria-hidden="true">⌄</span>
            </div>
            <small>Plan inicial de inscripción</small>
          </div>

          <div className="registro-campo">
            <label htmlFor="fechaAlta">
              Fecha de inscripción <span>*</span>
            </label>
            <input
              id="fechaAlta"
              name="fechaAlta"
              type="date"
              value={datos.fechaAlta}
              onChange={manejarCambio}
              required
            />
          </div>
        </div>

        {mensaje && (
          <div
            className={`registro-mensaje ${
              mensaje.startsWith("¡") ||
              mensaje.startsWith("Formulario validado")
                ? "registro-mensaje-exito"
                : "registro-mensaje-error"
            }`}
            role="status"
          >
            {mensaje}
          </div>
        )}

        <div className="registro-acciones">
          <button
            type="button"
            className="registro-boton-cancelar"
            onClick={volverInicio}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="registro-boton-guardar"
          >
            Guardar socio
            <span aria-hidden="true"> →</span>
          </button>
        </div>
      </form>

      <div className="registro-pie">
        <span className="registro-pie-punto" />
        <span>Gestión de socios · BibiGym</span>
      </div>
    </div>
  );
}

export default RegistroSocio;
