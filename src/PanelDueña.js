
import { useMemo, useState } from "react";
import "./PanelDueña.css";

const CLAVE_SOCIOS = "bibigym_socios";
const CLAVE_PRECIO = "bibigym_precio_mensual";
const CLAVE_PANEL = "bibigym_panel_autorizado";

const CLAVE_PASSWORD = "bibigym2026";

const obtenerFechaActual = () => {
  const fecha = new Date();

  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1
  ).padStart(2, "0")}-${String(
    fecha.getDate()
  ).padStart(2, "0")}`;
};

const obtenerMesActual = () =>
  obtenerFechaActual().slice(0, 7);

const fechaDesdeTexto = (texto) => {
  if (!texto) return new Date();

  const [anio, mes, dia] = texto.split("-").map(Number);

  return new Date(anio, mes - 1, dia, 12);
};

const calcularDias = (fechaTexto) => {
  if (!fechaTexto) return 0;

  const hoy = fechaDesdeTexto(obtenerFechaActual());
  const objetivo = fechaDesdeTexto(fechaTexto);

  return Math.round((objetivo - hoy) / 86400000);
};

const formatearFecha = (fechaTexto) => {
  if (!fechaTexto) return "—";

  return fechaTexto.split("-").reverse().join("/");
};

const formatearPrecio = (importe) =>
  Number(importe || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const obtenerSocios = () => {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_SOCIOS));

    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
};

const guardarSocios = (socios) => {
  localStorage.setItem(CLAVE_SOCIOS, JSON.stringify(socios));
};

const obtenerPrecio = () => {
  try {
    const precio = Number(localStorage.getItem(CLAVE_PRECIO));

    return Number.isFinite(precio) && precio > 0
      ? precio
      : 30000;
  } catch {
    return 30000;
  }
};

const obtenerEstado = (socio) => {
  const dias = calcularDias(socio.fechaVencimiento);

  if (dias < 0) {
    return { tipo: "vencida", texto: "Vencida", dias };
  }

  if (dias <= 3) {
    return {
      tipo: "proxima",
      texto:
        dias === 0
          ? "Vence hoy"
          : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`,
      dias,
    };
  }

  return { tipo: "aldia", texto: "Al día", dias };
};

const obtenerUltimoPago = (socio) => {
  if (!Array.isArray(socio.pagos) || socio.pagos.length === 0) {
    return null;
  }

  return [...socio.pagos].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha))
  )[0];
};

// Reconoce las formas de pago habituales.
const esEfectivo = (formaPago) =>
  String(formaPago || "")
    .trim()
    .toLowerCase()
    .includes("efectivo");

const esTransferencia = (formaPago) =>
  String(formaPago || "")
    .trim()
    .toLowerCase()
    .includes("transfer");

function PanelDueña({ onVolver }) {
  const [autorizado, setAutorizado] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_PANEL) === "true";
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState("");
  const [mensajeLogin, setMensajeLogin] = useState("");
  const [seccion, setSeccion] = useState("resumen");
  const [socios, setSocios] = useState(obtenerSocios);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [precio, setPrecio] = useState(String(obtenerPrecio()));
  const [mensajePrecio, setMensajePrecio] = useState("");

  const ingresar = (e) => {
    e.preventDefault();

    if (password !== CLAVE_PASSWORD) {
      setMensajeLogin("La contraseña es incorrecta.");
      return;
    }

    try {
      localStorage.setItem(CLAVE_PANEL, "true");
    } catch {
      // Sin acción.
    }

    setAutorizado(true);
    setPassword("");
    setMensajeLogin("");
  };

  const cerrarSesion = () => {
    try {
      localStorage.removeItem(CLAVE_PANEL);
    } catch {
      // Sin acción.
    }

    setAutorizado(false);
    setSocioSeleccionado(null);
  };

  const actualizar = () => {
    setSocios(obtenerSocios());
    setSocioSeleccionado(null);
  };

  const guardarPrecio = () => {
    const nuevoPrecio = Number(precio);

    if (!Number.isFinite(nuevoPrecio) || nuevoPrecio <= 0) {
      setMensajePrecio("Ingresá un precio válido.");
      return;
    }

    try {
      localStorage.setItem(CLAVE_PRECIO, String(nuevoPrecio));
      setPrecio(String(nuevoPrecio));
      setMensajePrecio("Precio actualizado correctamente.");
    } catch {
      setMensajePrecio("No se pudo guardar el precio.");
    }
  };

  const estadisticas = useMemo(() => {
    let alDia = 0;
    let proximos = 0;
    let vencidos = 0;
    let recaudacion = 0;
    let efectivo = 0;
    let transferencias = 0;

    const mesActual = obtenerMesActual();

    socios.forEach((socio) => {
      const estado = obtenerEstado(socio);

      if (estado.tipo === "aldia") alDia++;
      if (estado.tipo === "proxima") proximos++;
      if (estado.tipo === "vencida") vencidos++;

      if (Array.isArray(socio.pagos)) {
        socio.pagos.forEach((pago) => {
          if (String(pago.fecha || "").startsWith(mesActual)) {
            const importe = Number(pago.importe || 0);

            recaudacion += importe;

            if (esEfectivo(pago.formaPago)) {
              efectivo += importe;
            } else if (esTransferencia(pago.formaPago)) {
              transferencias += importe;
            }
          }
        });
      }
    });

    return {
      total: socios.length,
      alDia,
      proximos,
      vencidos,
      recaudacion,
      efectivo,
      transferencias,
    };
  }, [socios]);

  const sociosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return socios
      .filter((socio) => {
        const estado = obtenerEstado(socio);

        if (filtro !== "todos" && estado.tipo !== filtro) {
          return false;
        }

        if (!texto) return true;

        const nombre =
          `${socio.nombre || ""} ${socio.apellido || ""}`.toLowerCase();

        const dni = String(socio.dni || "").toLowerCase();
        const telefono = String(socio.telefono || "").toLowerCase();

        return (
          nombre.includes(texto) ||
          dni.includes(texto) ||
          telefono.includes(texto)
        );
      })
      .sort((a, b) => {
        const nombreA =
          `${a.apellido || ""} ${a.nombre || ""}`.toLowerCase();

        const nombreB =
          `${b.apellido || ""} ${b.nombre || ""}`.toLowerCase();

        return nombreA.localeCompare(nombreB);
      });
  }, [socios, busqueda, filtro]);

  const todosLosPagos = useMemo(() => {
    const pagos = [];

    socios.forEach((socio) => {
      if (!Array.isArray(socio.pagos)) return;

      socio.pagos.forEach((pago) => {
        pagos.push({
          ...pago,
          socioNombre: `${socio.nombre || ""} ${
            socio.apellido || ""
          }`.trim(),
          socioDni: socio.dni,
        });
      });
    });

    return pagos.sort((a, b) =>
      String(b.fecha).localeCompare(String(a.fecha))
    );
  }, [socios]);

  const eliminarSocio = (socio) => {
    const nombre =
      `${socio.nombre || ""} ${socio.apellido || ""}`.trim();

    const confirmar = window.confirm(
      `¿Querés eliminar a ${nombre}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const nuevosSocios = socios.filter(
      (item) =>
        String(item.dni).trim() !== String(socio.dni).trim()
    );

    try {
      guardarSocios(nuevosSocios);
      setSocios(nuevosSocios);
      setSocioSeleccionado(null);
    } catch {
      window.alert("No se pudo eliminar el socio.");
    }
  };

  if (!autorizado) {
    return (
      <div className="panel-login">
        <div className="panel-login-icono">🔐</div>

        <span className="panel-kicker">BIBIGYM</span>

        <p>Accedé a la administración del gimnasio.</p>

        <form className="panel-login-form" onSubmit={ingresar}>
          <label htmlFor="clave-panel">Contraseña</label>

          <input
            id="clave-panel"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMensajeLogin("");
            }}
            placeholder="Ingresá la contraseña"
            autoComplete="current-password"
          />

          {mensajeLogin && (
            <p className="panel-error" role="alert">
              {mensajeLogin}
            </p>
          )}

          <button
            type="submit"
            className="panel-boton panel-boton-principal"
          >
            Entrar al panel
          </button>

          <button
            type="button"
            className="panel-boton panel-boton-secundario"
            onClick={onVolver}
          >
            Volver al control
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="panel-duena">
      <div className="panel-encabezado">
        <div>
          <span className="panel-kicker">ADMINISTRACIÓN</span>
          <h2>Panel Completo</h2>
          <p>Elegí qué parte querés administrar.</p>
        </div>

        <div className="panel-acciones">
          <button
            type="button"
            className="panel-boton panel-boton-salir"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <nav className="panel-navegacion" aria-label="Secciones del panel">
        <button
          type="button"
          className={seccion === "resumen" ? "panel-nav-activo" : ""}
          onClick={() => setSeccion("resumen")}
        >
          <span>▦</span>
          <strong>Resumen</strong>
          <small>Vista general</small>
        </button>

        <button
          type="button"
          className={seccion === "socios" ? "panel-nav-activo" : ""}
          onClick={() => setSeccion("socios")}
        >
          <span>♙</span>
          <strong>Socios</strong>
          <small>Ver y buscar socios</small>
        </button>

        <button
          type="button"
          className={seccion === "pagos" ? "panel-nav-activo" : ""}
          onClick={() => setSeccion("pagos")}
        >
          <span>$</span>
          <strong>Pagos</strong>
          <small>Resumen de recaudación</small>
        </button>

        <button
          type="button"
          className={seccion === "configuracion" ? "panel-nav-activo" : ""}
          onClick={() => setSeccion("configuracion")}
        >
          <span>⚙</span>
          <strong>Configuración</strong>
          <small>Precio mensual</small>
        </button>
      </nav>

      {/* RESUMEN */}

      {seccion === "resumen" && (
        <section className="panel-seccion">
          <div className="panel-seccion-titulo">
            <div>
              <span className="panel-kicker">RESUMEN</span>
              <h3>Estado del gimnasio</h3>
              <p>Información general de tus socios y pagos.</p>
            </div>
          </div>

          <div className="panel-estadisticas">
            <article className="panel-stat">
              <div className="panel-stat-icono">#</div>
              <div>
                <span>Total de socios</span>
                <strong>{estadisticas.total}</strong>
              </div>
            </article>

            <article className="panel-stat">
              <div className="panel-stat-icono panel-icono-verde">✓</div>
              <div>
                <span>Cuotas al día</span>
                <strong>{estadisticas.alDia}</strong>
              </div>
            </article>

            <article className="panel-stat">
              <div className="panel-stat-icono panel-icono-naranja">!</div>
              <div>
                <span>Vencen pronto</span>
                <strong>{estadisticas.proximos}</strong>
              </div>
            </article>

            <article className="panel-stat">
              <div className="panel-stat-icono panel-icono-rojo">×</div>
              <div>
                <span>Vencidos</span>
                <strong>{estadisticas.vencidos}</strong>
              </div>
            </article>

            <article className="panel-stat panel-stat-grande">
              <div className="panel-stat-icono">$</div>
              <div>
                <span>Recaudación del mes</span>
                <strong>{formatearPrecio(estadisticas.recaudacion)}</strong>
              </div>
            </article>
          </div>

          {/* Se quitaron los accesos rápidos duplicados de abajo. */}
        </section>
      )}

      {/* SOCIOS */}

      {seccion === "socios" && (
        <section className="panel-seccion">
          <div className="panel-seccion-titulo panel-titulo-con-controles">
            <div>
              <span className="panel-kicker">SOCIOS</span>
              <h3>Lista de socios</h3>
              <p>Buscá un socio para ver todos sus datos.</p>
            </div>

            <button
              type="button"
              className="panel-boton panel-boton-claro"
              onClick={actualizar}
            >
              Actualizar lista
            </button>
          </div>

          <div className="panel-busqueda-area">
            <div className="panel-busqueda">
              <span>⌕</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, DNI o teléfono..."
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos los socios</option>
              <option value="aldia">Al día</option>
              <option value="proxima">Vencen pronto</option>
              <option value="vencida">Vencidos</option>
            </select>
          </div>

          {sociosFiltrados.length === 0 ? (
            <div className="panel-vacio">
              <div>♡</div>
              <h4>No encontramos socios</h4>
              <p>Probá con otra búsqueda o filtro.</p>
            </div>
          ) : (
            <div className="panel-socios-grid">
              {sociosFiltrados.map((socio) => {
                const estado = obtenerEstado(socio);
                const ultimoPago = obtenerUltimoPago(socio);

                return (
                  <article className="socio-card" key={String(socio.dni)}>
                    <div className="socio-card-top">
                      <div className="socio-avatar">
                        {String(socio.nombre || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="socio-nombre">
                        <h4>{socio.nombre} {socio.apellido}</h4>
                        <span>DNI {socio.dni}</span>
                      </div>

                      <span className={`panel-estado panel-estado-${estado.tipo}`}>
                        {estado.texto}
                      </span>
                    </div>

                    <div className="socio-card-datos">
                      <div>
                        <span>Teléfono</span>
                        <strong>{socio.telefono || "—"}</strong>
                      </div>

                      <div>
                        <span>Vencimiento</span>
                        <strong>{formatearFecha(socio.fechaVencimiento)}</strong>
                      </div>

                      <div>
                        <span>Último pago</span>
                        <strong>
                          {ultimoPago
                            ? formatearPrecio(ultimoPago.importe)
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="socio-card-boton"
                      onClick={() => setSocioSeleccionado(socio)}
                    >
                      Ver ficha completa
                      <span>→</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PAGOS: SOLO TOTALES DEL MES */}

      {seccion === "pagos" && (
        <section className="panel-seccion">
          <div className="panel-seccion-titulo">
            <div>
              <span className="panel-kicker">PAGOS</span>
              <h3>Recaudación del mes</h3>
              <p>Totales de las cuotas cobradas durante el mes actual.</p>
            </div>
          </div>

          <div className="pagos-resumen">
            <div className="pago-total-mes">
              <span>Ganancia total del mes</span>
              <strong>{formatearPrecio(estadisticas.recaudacion)}</strong>
            </div>

            <div className="pago-total-efectivo">
              <span>Total en efectivo</span>
              <strong>{formatearPrecio(estadisticas.efectivo)}</strong>
            </div>

            <div className="pago-total-transferencias">
              <span>Total en transferencias</span>
              <strong>{formatearPrecio(estadisticas.transferencias)}</strong>
            </div>
          </div>
        </section>
      )}

      {/* CONFIGURACIÓN */}

      {seccion === "configuracion" && (
        <section className="panel-seccion">
          <div className="panel-seccion-titulo">
            <div>
              <span className="panel-kicker">CONFIGURACIÓN</span>
              <h3>Configuración del gimnasio</h3>
              <p>Modificá los valores generales de BibiGym.</p>
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-icono">$</div>

            <div className="config-card-texto">
              <h4>Precio de la mensualidad</h4>
              <p>
                Este importe se utilizará automáticamente cuando registres nuevos socios.
              </p>
            </div>

            <div className="config-card-form">
              <label htmlFor="precio-mensual">Precio actual</label>

              <div className="config-precio">
                <span>$</span>
                <input
                  id="precio-mensual"
                  type="number"
                  min="1"
                  step="1"
                  value={precio}
                  onChange={(e) => {
                    setPrecio(e.target.value);
                    setMensajePrecio("");
                  }}
                />
              </div>

              <button
                type="button"
                className="panel-boton panel-boton-principal"
                onClick={guardarPrecio}
              >
                Guardar precio
              </button>

              {mensajePrecio && (
                <p className="config-mensaje">{mensajePrecio}</p>
              )}
            </div>
          </div>

          <div className="config-info">
            <h4>Información</h4>
            <p>
              Los datos de socios, pagos y configuración se guardan localmente en este navegador.
            </p>
          </div>
        </section>
      )}

      {/* FICHA DEL SOCIO */}

      {socioSeleccionado && (
        <div className="panel-modal-overlay">
          <section className="panel-modal">
            <button
              type="button"
              className="panel-modal-cerrar"
              onClick={() => setSocioSeleccionado(null)}
              aria-label="Cerrar ficha"
            >
              ×
            </button>

            <div className="panel-modal-cabecera">
              <div className="panel-modal-avatar">
                {String(socioSeleccionado.nombre || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <span className="panel-kicker">FICHA DEL SOCIO</span>
                <h3>{socioSeleccionado.nombre} {socioSeleccionado.apellido}</h3>
                <p>DNI: {socioSeleccionado.dni}</p>
              </div>
            </div>

            <div className="panel-detalles">
              <div>
                <span>Teléfono</span>
                <strong>{socioSeleccionado.telefono || "—"}</strong>
              </div>

              <div>
                <span>Plan</span>
                <strong>{socioSeleccionado.plan || "Mensual"}</strong>
              </div>

              <div>
                <span>Fecha de alta</span>
                <strong>{formatearFecha(socioSeleccionado.fechaAlta)}</strong>
              </div>

              <div>
                <span>Vencimiento</span>
                <strong>{formatearFecha(socioSeleccionado.fechaVencimiento)}</strong>
              </div>
            </div>

            <div className="panel-historial">
              <div className="panel-historial-titulo">
                <h4>Historial de pagos</h4>
                <span>
                  {Array.isArray(socioSeleccionado.pagos)
                    ? socioSeleccionado.pagos.length
                    : 0}{" "}
                  pagos
                </span>
              </div>

              {!Array.isArray(socioSeleccionado.pagos) ||
              socioSeleccionado.pagos.length === 0 ? (
                <div className="panel-historial-vacio">
                  No hay pagos registrados.
                </div>
              ) : (
                <div className="panel-pagos">
                  {[...socioSeleccionado.pagos]
                    .reverse()
                    .map((pago, indice) => (
                      <div
                        className="panel-pago"
                        key={`${pago.fecha}-${indice}`}
                      >
                        <div>
                          <strong>{pago.concepto || "Pago"}</strong>
                          <span>
                            {formatearFecha(pago.fecha)} ·{" "}
                            {pago.formaPago || "Sin forma"}
                          </span>
                        </div>

                        <strong>{formatearPrecio(pago.importe)}</strong>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="panel-modal-acciones">
              <button
                type="button"
                className="panel-boton panel-boton-secundario"
                onClick={() => setSocioSeleccionado(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="panel-boton panel-boton-eliminar"
                onClick={() => eliminarSocio(socioSeleccionado)}
              >
                Eliminar socio
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default PanelDueña;
