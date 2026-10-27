
import "./RegistroSocio.css";

const PLANES_MENSUALES = [
  {
    id: "pesas_personalizadas",
    nombre: "Pesas personalizadas — Mensual",
    precio: 27000,
  },
  {
    id: "pesas_personalizadas_3_dias",
    nombre: "Pesas personalizadas — 3 días",
    precio: 21000,
  },
  {
    id: "pesas_sin_personalizado_3_dias",
    nombre: "Pesas sin personalización — 3 días",
    precio: 15000,
  },
  {
    id: "pase_libre",
    nombre: "Pase Libre",
    precio: 35000,
  },
];

const ACTIVIDADES = [
  { id: "spinning", nombre: "Spinning", precio: 27000 },
  { id: "trampolin", nombre: "Trampolín", precio: 25000 },
  { id: "aerobics", nombre: "Aerobics", precio: 15000 },
  { id: "box", nombre: "Box", precio: 15000 },
  {
    id: "barra_funcional",
    nombre: "Barra funcional",
    precio: 15000,
  },
  { id: "crossfit", nombre: "CrossFit", precio: 15000 },
];

const CLASES_SUELTAS = [
  { id: "trampolin_suelto", nombre: "Trampolín", precio: 3000 },
  { id: "pesas_suelta", nombre: "Pesas", precio: 3000 },
  { id: "aerobics_suelto", nombre: "Aerobics", precio: 2500 },
  { id: "spinning_suelto", nombre: "Spinning", precio: 4000 },
];

const formatearPrecio = (importe) =>
  Number(importe || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function RegistroSocio({
  datos,
  manejarCambio,
  guardarSocio,
  mensaje,
  volverInicio,
}) {
  const planSeleccionado =
    PLANES_MENSUALES.find(
      (plan) => plan.id === datos.plan
    ) || PLANES_MENSUALES[0];

  const actividadesSeleccionadas = Array.isArray(
    datos.actividades
  )
    ? datos.actividades
    : [];

  const totalActividades = ACTIVIDADES
    .filter((actividad) =>
      actividadesSeleccionadas.includes(actividad.id)
    )
    .reduce(
      (total, actividad) => total + actividad.precio,
      0
    );

  const totalMensual =
    planSeleccionado.precio + totalActividades;

    const clasesSueltasSeleccionadas = CLASES_SUELTAS.filter(
  (clase) =>
    Array.isArray(datos.clasesSueltas) &&
    datos.clasesSueltas.includes(clase.id)
);

const totalClasesSueltas = clasesSueltasSeleccionadas.reduce(
  (total, clase) => total + clase.precio,
  0
);

const alternarClaseSuelta = (id) => {
  const clasesActuales = Array.isArray(datos.clasesSueltas)
    ? datos.clasesSueltas
    : [];

  const nuevasClases = clasesActuales.includes(id)
    ? clasesActuales.filter((claseId) => claseId !== id)
    : [...clasesActuales, id];

  manejarCambio({
    target: {
      name: "clasesSueltas",
      value: nuevasClases,
    },
  });
};


  const alternarActividad = (id) => {
    const nuevasActividades = actividadesSeleccionadas.includes(id)
      ? actividadesSeleccionadas.filter(
          (actividadId) => actividadId !== id
        )
      : [...actividadesSeleccionadas, id];

    manejarCambio({
      target: {
        name: "actividades",
        value: nuevasActividades,
      },
    });
  };

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

      <form className="registro-formulario" onSubmit={guardarSocio}>
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
            <label htmlFor="plan">
              Plan mensual <span>*</span>
            </label>

            <div className="registro-select-contenedor">
              <select
                id="plan"
                name="plan"
                value={datos.plan || PLANES_MENSUALES[0].id}
                onChange={manejarCambio}
                required
              >
                {PLANES_MENSUALES.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} — {formatearPrecio(plan.precio)}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">⌄</span>
            </div>
            <small>Seleccioná un plan base mensual.</small>
          </div>

          <div className="registro-campo">
            <label htmlFor="formaPago">
              Forma de pago <span>*</span>
            </label>

            <div className="registro-select-contenedor">
              <select
                id="formaPago"
                name="formaPago"
                value={datos.formaPago || ""}
                onChange={manejarCambio}
                required
              >
                <option value="">Seleccioná una forma de pago</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
              <span aria-hidden="true">⌄</span>
            </div>
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

        <section className="registro-actividades">
          <div className="registro-actividades-encabezado">
            <h3>Actividades adicionales</h3>
            <p>
              Podés seleccionar una o varias actividades mensuales.
              Se sumarán al precio del plan base.
            </p>
          </div>

          <div className="registro-actividades-lista">
            {ACTIVIDADES.map((actividad) => {
              const seleccionada =
                actividadesSeleccionadas.includes(actividad.id);

              return (
                <label
                  key={actividad.id}
                  className={`registro-actividad-opcion ${
                    seleccionada ? "seleccionada" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={() => alternarActividad(actividad.id)}
                  />

                  <span className="registro-actividad-texto">
                    <strong>{actividad.nombre}</strong>
                    <small>Mensual</small>
                  </span>

                  <span className="registro-actividad-precio">
                    {formatearPrecio(actividad.precio)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="registro-actividades">
  <div className="registro-actividades-encabezado">
    <h3>Clases sueltas</h3>
    <p>
      Seleccioná las clases que se cobran por separado.
      No se suman a la mensualidad.
    </p>
  </div>

  <div className="registro-actividades-lista">
    {CLASES_SUELTAS.map((clase) => {
      const seleccionada =
        Array.isArray(datos.clasesSueltas) &&
        datos.clasesSueltas.includes(clase.id);

      return (
        <label
          key={clase.id}
          className={`registro-actividad-opcion ${
            seleccionada ? "seleccionada" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={() => alternarClaseSuelta(clase.id)}
          />

          <span className="registro-actividad-texto">
            <strong>{clase.nombre}</strong>
            <small>Clase suelta</small>
          </span>

          <span className="registro-actividad-precio">
            {formatearPrecio(clase.precio)}
          </span>
        </label>
      );
    })}
  </div>

  <div className="registro-total">
    <div className="registro-total-final">
      <span>Total de clases sueltas</span>
      <strong>{formatearPrecio(totalClasesSueltas)}</strong>
    </div>
  </div>
</section>

        <section className="registro-total">
          <div>
            <span>Plan base</span>
            <strong>{formatearPrecio(planSeleccionado.precio)}</strong>
          </div>

          <div>
            <span>Actividades adicionales</span>
            <strong>{formatearPrecio(totalActividades)}</strong>
          </div>

          <div className="registro-total-final">
            <span>Total mensual</span>
            <strong>{formatearPrecio(totalMensual)}</strong>
          </div>
        </section>


        {mensaje && (
          <div
            className={`registro-mensaje ${
              mensaje.startsWith("¡") ||
              mensaje.startsWith("Formulario validado") ||
              mensaje.startsWith("Socio registrado")
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

          <button type="submit" className="registro-boton-guardar">
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
