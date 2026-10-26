import { useState } from "react";
import "./App.css";
import logoBibi from "./assets/logo-bibigym.png";
import RegistroSocio from "./RegistroSocio";
import PanelDueña from "./PanelDueña";

const CLAVE_SOCIOS = "bibigym_socios";
const CLAVE_PRECIO = "bibigym_precio_mensual";

const obtenerFechaActual = () => {
  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const leerPrecioGuardado = () => {
  try {
    const precio = Number(localStorage.getItem(CLAVE_PRECIO));

    return Number.isFinite(precio) && precio > 0
      ? precio
      : 30000;
  } catch {
    return 30000;
  }
};

const datosIniciales = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  plan: "Mensual",
  formaPago: "",
  fechaAlta: obtenerFechaActual(),
};

const obtenerSocios = () => {
  try {
    const socios = JSON.parse(
      localStorage.getItem(CLAVE_SOCIOS)
    );

    return Array.isArray(socios) ? socios : [];
  } catch {
    return [];
  }
};

const guardarSocios = (socios) => {
  localStorage.setItem(
    CLAVE_SOCIOS,
    JSON.stringify(socios)
  );
};

const fechaDesdeTexto = (texto) => {
  const [anio, mes, dia] = texto.split("-").map(Number);

  return new Date(anio, mes - 1, dia, 12);
};

const fechaATexto = (fecha) => {
  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1
  ).padStart(2, "0")}-${String(
    fecha.getDate()
  ).padStart(2, "0")}`;
};

const sumarUnMes = (fechaTexto) => {
  const fecha = fechaDesdeTexto(fechaTexto);
  const diaOriginal = fecha.getDate();

  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + 1);

  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(Math.min(diaOriginal, ultimoDia));

  return fechaATexto(fecha);
};

const obtenerVencimiento = (socio) => {
  if (socio.fechaVencimiento) {
    return socio.fechaVencimiento;
  }

  return sumarUnMes(
    socio.fechaAlta || obtenerFechaActual()
  );
};

const calcularDias = (fechaTexto) => {
  const hoy = fechaDesdeTexto(
    obtenerFechaActual()
  );

  const objetivo = fechaDesdeTexto(fechaTexto);

  return Math.round(
    (objetivo - hoy) / 86400000
  );
};

const formatearFecha = (fechaTexto) => {
  if (!fechaTexto) {
    return "—";
  }

  return fechaTexto.split("-").reverse().join("/");
};

const formatearPrecio = (importe) =>
  Number(importe || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const obtenerEstadoCuota = (socio) => {
  const fechaVencimiento = obtenerVencimiento(socio);
  const diasRestantes = calcularDias(
    fechaVencimiento
  );

  if (diasRestantes < 0) {
    return {
      tipo: "vencida",
      titulo: "Cuota vencida",
      detalle:
        diasRestantes === -1
          ? "La cuota venció ayer."
          : `La cuota venció hace ${Math.abs(
              diasRestantes
            )} días.`,
      diasRestantes,
      fechaVencimiento,
    };
  }

  if (diasRestantes === 0) {
    return {
      tipo: "hoy",
      titulo: "¡Tu cuota vence hoy!",
      detalle:
        "Registrá el pago para renovar la cuota.",
      diasRestantes,
      fechaVencimiento,
    };
  }

  if (diasRestantes <= 3) {
    return {
      tipo: "proximo",
      titulo: `Tu cuota vence en ${diasRestantes} ${
        diasRestantes === 1 ? "día" : "días"
      }`,
      detalle:
        "Recordá realizar el pago antes del vencimiento.",
      diasRestantes,
      fechaVencimiento,
    };
  }

  return {
    tipo: "aldia",
    titulo: `${diasRestantes} días restantes`,
    detalle: "Tu cuota está al día.",
    diasRestantes,
    fechaVencimiento,
  };
};

function App() {
  const [pantalla, setPantalla] = useState("inicio");

  const [dni, setDni] = useState("");

  const [socio, setSocio] = useState({
    ...datosIniciales,
  });

  const [mensaje, setMensaje] = useState("");

  const [socioEncontrado, setSocioEncontrado] =
    useState(null);

  const [precioMensual, setPrecioMensual] =
    useState(leerPrecioGuardado);

  const [nuevoPrecio, setNuevoPrecio] = useState(
    String(leerPrecioGuardado())
  );

  const [mostrarConfiguracion, setMostrarConfiguracion] =
    useState(false);

  const [mostrarPago, setMostrarPago] =
    useState(false);

  const [importePago, setImportePago] =
    useState("");

  const [formaPago, setFormaPago] =
    useState("Efectivo");

  const [mensajePago, setMensajePago] =
    useState("");

  const [mensajePrecio, setMensajePrecio] =
    useState("");

  const manejarBuscarSocio = (e) => {
    e.preventDefault();

    const dniBuscado = dni.trim();

    if (!dniBuscado) {
      setSocioEncontrado(null);
      setMensaje("Ingresá el DNI del socio.");
      return;
    }

    const encontrado = obtenerSocios().find(
      (item) =>
        String(item.dni).trim() === dniBuscado
    );

    if (!encontrado) {
      setSocioEncontrado(null);

      setMensaje(
        "No encontramos un socio con ese DNI. Verificá el número o registrá al socio."
      );

      return;
    }

    setSocioEncontrado(encontrado);
    setMensaje("");
  };

  const abrirRegistro = () => {
    setSocio({
      ...datosIniciales,
      fechaAlta: obtenerFechaActual(),
    });

    setMensaje("");
    setMensajePrecio("");
    setNuevoPrecio(String(precioMensual));
    setMostrarConfiguracion(false);
    setSocioEncontrado(null);

    setPantalla("registro");
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    let valorFinal = value;

    if (
      name === "nombre" ||
      name === "apellido"
    ) {
      valorFinal = value
        .toLocaleLowerCase("es")
        .replace(
          /(^|[\s'-])(\p{L})/gu,
          (
            coincidencia,
            separador,
            letra
          ) =>
            separador +
            letra.toLocaleUpperCase("es")
        );
    }

    setSocio((anterior) => ({
      ...anterior,
      [name]: valorFinal,
    }));
  };

  const guardarSocio = (e) => {
    e.preventDefault();

    const dniNuevo = String(
      socio.dni
    ).trim();

    if (!dniNuevo) {
      setMensaje("Ingresá el DNI del socio.");
      return;
    }

    if (!socio.formaPago) {
      setMensaje(
        "Seleccioná una forma de pago."
      );
      return;
    }

    const socios = obtenerSocios();

    if (
      socios.some(
        (item) =>
          String(item.dni).trim() ===
          dniNuevo
      )
    ) {
      setMensaje(
        "Ya existe un socio registrado con ese DNI. Verificá los datos."
      );

      return;
    }

    const fechaPago =
      socio.fechaAlta ||
      obtenerFechaActual();

    const nuevoSocio = {
      ...socio,

      dni: dniNuevo,

      fechaAlta: fechaPago,

      fechaVencimiento:
        sumarUnMes(fechaPago),

      pagos: [
        {
          fecha: fechaPago,
          importe: precioMensual,
          formaPago: socio.formaPago,
          concepto:
            "Inscripción / primera cuota",
        },
      ],
    };

    try {
      guardarSocios([
        ...socios,
        nuevoSocio,
      ]);
    } catch {
      setMensaje(
        "No se pudo guardar el socio en este navegador."
      );

      return;
    }

    setDni(dniNuevo);

    setSocioEncontrado(nuevoSocio);

    setMensaje(
      "Socio registrado correctamente."
    );

    setPantalla("inicio");
  };

  const guardarNuevoPrecio = () => {
    const precio = Number(nuevoPrecio);

    if (
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      setMensajePrecio(
        "Ingresá un precio mayor que cero."
      );

      return;
    }

    try {
      localStorage.setItem(
        CLAVE_PRECIO,
        String(precio)
      );

      setPrecioMensual(precio);

      setNuevoPrecio(String(precio));

      setMensajePrecio(
        "Precio mensual actualizado correctamente."
      );

      setMostrarConfiguracion(false);
    } catch {
      setMensajePrecio(
        "No se pudo guardar el precio en este navegador."
      );
    }
  };

  const abrirPago = () => {
    setImportePago(
      String(precioMensual)
    );

    setFormaPago("Efectivo");

    setMensajePago("");

    setMostrarPago(true);
  };

  const registrarPago = (e) => {
    e.preventDefault();

    if (!socioEncontrado) {
      return;
    }

    const importe = Number(
      importePago
    );

    if (
      !Number.isFinite(importe) ||
      importe <= 0
    ) {
      setMensajePago(
        "Ingresá un importe válido."
      );

      return;
    }

    const socios = obtenerSocios();

    const indice = socios.findIndex(
      (item) =>
        String(item.dni).trim() ===
        String(
          socioEncontrado.dni
        ).trim()
    );

    if (indice === -1) {
      setMensajePago(
        "No se encontró al socio para actualizar su cuota."
      );

      return;
    }

    const fechaPago =
      obtenerFechaActual();

    const socioActual =
      socios[indice];

    const pagoNuevo = {
      fecha: fechaPago,
      importe,
      formaPago,
      concepto:
        "Renovación mensual",
    };

    const socioActualizado = {
      ...socioActual,

      fechaVencimiento:
        sumarUnMes(fechaPago),

      pagos: [
        ...(Array.isArray(
          socioActual.pagos
        )
          ? socioActual.pagos
          : []),
        pagoNuevo,
      ],
    };

    socios[indice] =
      socioActualizado;

    try {
      guardarSocios(socios);
    } catch {
      setMensajePago(
        "No se pudo guardar el pago en este navegador."
      );

      return;
    }

    setSocioEncontrado(
      socioActualizado
    );

    setMostrarPago(false);

    setMensaje(
      "Pago registrado y cuota renovada correctamente."
    );
  };

  const volverInicio = () => {
    setMensaje("");
    setMensajePrecio("");
    setMostrarConfiguracion(false);
    setPantalla("inicio");
  };

  const estadoCuota =
    socioEncontrado
      ? obtenerEstadoCuota(
          socioEncontrado
        )
      : null;

  const historialPagos =
    socioEncontrado &&
    Array.isArray(
      socioEncontrado.pagos
    )
      ? [
          ...socioEncontrado.pagos,
        ].reverse()
      : [];

  return (
    <main
      className={`fondo ${
        pantalla === "registro"
          ? "fondo-registro"
          : ""
      } ${
        pantalla === "duena"
          ? "fondo-panel"
          : ""
      }`}
    >
      {/* BOTÓN FUERA DE LA TARJETA */}
      {pantalla === "inicio" && (
        <button
          type="button"
          className="boton-menu-duena-exterior"
          onClick={() =>
            setPantalla("duena")
          }
        >
          <span className="boton-panel-icono">
            ⚙
          </span>

          <span>
            Panel Completo
          </span>
        </button>
      )}

      <section
        className={`tarjeta ${
          pantalla === "registro"
            ? "tarjeta-registro"
            : ""
        } ${
          pantalla === "duena"
            ? "tarjeta-panel"
            : ""
        }`}
      >
        <header className="cabecera">
          <div className="logo-marco">
            <img
              src={logoBibi}
              alt="Logo BibiGym"
              className="logo-img"
            />
          </div>

          <div className="encabezado-texto">
            <h1 className="titulo">
              BibiGym
            </h1>

            <p className="subtitulo">
              {pantalla === "inicio"
                ? "Control de acceso"
                : pantalla === "duena"
                ? "Panel Completo"
                : "Registro de socio"}
            </p>
          </div>
        </header>

        {pantalla === "duena" ? (
          <PanelDueña
            onVolver={() =>
              setPantalla("inicio")
            }
          />
        ) : pantalla === "inicio" ? (
          <>
            <form
              className="bloque"
              onSubmit={
                manejarBuscarSocio
              }
            >
              <label
                htmlFor="dni"
                className="etiqueta"
              >
                DNI del socio
              </label>

              <input
                id="dni"
                type="text"
                className="input"
                value={dni}
                onChange={(e) => {
                  setDni(
                    e.target.value
                  );

                  setSocioEncontrado(
                    null
                  );

                  setMensaje("");
                }}
                placeholder="Ingresá el DNI"
                autoComplete="off"
                inputMode="numeric"
              />

              <button
                type="submit"
                className="boton boton-primario"
              >
                <span>
                  Buscar socio
                </span>

                <span
                  className="flecha"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            </form>

            {socioEncontrado &&
              estadoCuota && (
                <div className="aviso-overlay">
                  <section
                    className={`aviso-modal aviso-${estadoCuota.tipo}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="titulo-aviso-cuota"
                  >
                    <button
                      type="button"
                      className="aviso-cerrar"
                      onClick={() =>
                        setSocioEncontrado(
                          null
                        )
                      }
                      aria-label="Cerrar aviso"
                    >
                      ×
                    </button>

                    <div className="aviso-icono">
                      {estadoCuota.tipo ===
                      "aldia"
                        ? "✓"
                        : "!"}
                    </div>

                    <p className="aviso-etiqueta">
                      BIBIGYM · ESTADO DE CUOTA
                    </p>

                    <h2 id="titulo-aviso-cuota">
                      {
                        socioEncontrado.nombre
                      }{" "}
                      {
                        socioEncontrado.apellido
                      }
                    </h2>

                    <p className="aviso-dias">
                      {
                        estadoCuota.titulo
                      }
                    </p>

                    <p className="aviso-detalle">
                      {
                        estadoCuota.detalle
                      }
                    </p>

                    <div className="aviso-fecha">
                      Vencimiento:{" "}
                      {formatearFecha(
                        estadoCuota.fechaVencimiento
                      )}
                    </div>

                    <div className="pago-resumen">
                      <p>
                        <strong>
                          Mensualidad actual:
                        </strong>{" "}
                        {formatearPrecio(
                          precioMensual
                        )}
                      </p>

                      <p>
                        <strong>
                          Última forma de pago:
                        </strong>{" "}
                        {historialPagos[0]
                          ?.formaPago ||
                          "Sin información"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="boton boton-primario boton-renovar"
                      onClick={abrirPago}
                    >
                      Registrar pago y renovar
                    </button>

                    <button
                      type="button"
                      className="boton aviso-boton"
                      onClick={() =>
                        setSocioEncontrado(
                          null
                        )
                      }
                    >
                      Cerrar
                    </button>
                  </section>
                </div>
              )}

            <div
              className="separador"
              aria-hidden="true"
            >
              <span>o</span>
            </div>

            <button
              type="button"
              className="boton boton-secundario"
              onClick={abrirRegistro}
            >
              Registrar socio nuevo
            </button>
          </>
        ) : (
          <RegistroSocio
            datos={socio}
            manejarCambio={
              manejarCambio
            }
            guardarSocio={
              guardarSocio
            }
            mensaje={mensaje}
            volverInicio={
              volverInicio
            }
            precioMensual={
              precioMensual
            }
            nuevoPrecio={
              nuevoPrecio
            }
            setNuevoPrecio={
              setNuevoPrecio
            }
            mostrarConfiguracion={
              mostrarConfiguracion
            }
            setMostrarConfiguracion={
              setMostrarConfiguracion
            }
            guardarNuevoPrecio={
              guardarNuevoPrecio
            }
            mensajePrecio={
              mensajePrecio
            }
            setMensajePrecio={
              setMensajePrecio
            }
          />
        )}

        {pantalla === "inicio" &&
          mensaje && (
            <p
              className="mensaje-formulario"
              role="status"
            >
              {mensaje}
            </p>
          )}
      </section>

      {mostrarPago &&
        socioEncontrado && (
          <div className="aviso-overlay">
            <section
              className="aviso-modal modal-pago"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-pago"
            >
              <button
                type="button"
                className="aviso-cerrar"
                onClick={() =>
                  setMostrarPago(false)
                }
                aria-label="Cerrar pago"
              >
                ×
              </button>

              <p className="aviso-etiqueta">
                BIBIGYM · NUEVO PAGO
              </p>

              <h2 id="titulo-modal-pago">
                {
                  socioEncontrado.nombre
                }{" "}
                {
                  socioEncontrado.apellido
                }
              </h2>

              <form
                className="formulario-pago"
                onSubmit={
                  registrarPago
                }
              >
                <label htmlFor="importePago">
                  Importe recibido ($)
                </label>

                <input
                  id="importePago"
                  type="number"
                  min="1"
                  step="1"
                  value={importePago}
                  onChange={(e) =>
                    setImportePago(
                      e.target.value
                    )
                  }
                  required
                />

                <label htmlFor="formaPagoRenovacion">
                  Forma de pago
                </label>

                <select
                  id="formaPagoRenovacion"
                  value={formaPago}
                  onChange={(e) =>
                    setFormaPago(
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="Efectivo">
                    Efectivo
                  </option>

                  <option value="Transferencia">
                    Transferencia
                  </option>
                </select>

                <p className="aviso-detalle">
                  Fecha del pago:{" "}
                  {formatearFecha(
                    obtenerFechaActual()
                  )}
                </p>

                {mensajePago && (
                  <p role="alert">
                    {mensajePago}
                  </p>
                )}

                <button
                  type="submit"
                  className="boton boton-primario"
                >
                  Confirmar pago y renovar cuota
                </button>

                <button
                  type="button"
                  className="boton aviso-boton"
                  onClick={() =>
                    setMostrarPago(false)
                  }
                >
                  Cancelar
                </button>
              </form>
            </section>
          </div>
        )}
    </main>
  );
}

export default App;