import { useState, useEffect, useMemo } from "react";
import "./PanelDueña.css";

const CLAVE_PASSWORD = "bibigym2026";

function fechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function obtenerSocios() {
  try {
    return JSON.parse(localStorage.getItem("bibigym_socios") || "[]");
  } catch {
    return [];
  }
}

function obtenerPagos(socios) {
  return socios.flatMap((socio) =>
    (socio.pagos || []).map((pago, indice) => ({
      ...pago,
      socioNombre: obtenerNombre(socio),
      dni: socio.dni || "",
      importe: Number(pago.importe) || 0,
      pagoId: `${socio.dni || obtenerNombre(socio)}-${pago.fecha || ""}-${indice}`,
    }))
  );
}

function obtenerNombre(socio) {
  return [socio.nombre, socio.apellido].filter(Boolean).join(" ") || "Sin nombre";
}

function fechaLegible(fecha) {
  if (!fecha) return "Sin fecha";

  const partes = String(fecha).slice(0, 10).split("-");
  if (partes.length !== 3) return fecha;

  const [anio, mes, dia] = partes;
  if (!anio || !mes || !dia) return fecha;

  return `${dia}/${mes}/${anio}`;
}

function dinero(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function obtenerEstado(socio) {
  if (!socio.fechaVencimiento) return "Sin vencimiento";

  const hoy = new Date(`${fechaHoy()}T00:00:00`);
  const vencimiento = new Date(`${socio.fechaVencimiento}T00:00:00`);

  if (Number.isNaN(vencimiento.getTime())) return "Sin vencimiento";

  const diferencia = Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) / 86400000
  );

  if (diferencia < 0) return "Vencido";
  if (diferencia <= 5) return "Por vencer";
  return "Al día";
}


export default function PanelDueña({ onVolver }) {
  const [autorizado, setAutorizado] = useState(
    localStorage.getItem("bibigym_panel_autorizado") === "true"
  );
  const [clave, setClave] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [socios, setSocios] = useState(obtenerSocios);
  const [seccion, setSeccion] = useState("resumen");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy());
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    const sincronizar = () => setSocios(obtenerSocios());

    window.addEventListener("storage", sincronizar);

    return () => window.removeEventListener("storage", sincronizar);
  }, []);

  const movimientos = useMemo(() => obtenerPagos(socios), [socios]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos
      .filter((pago) => {
        const fecha = pago.fecha || "";

        // Mostrar únicamente los pagos de la fecha seleccionada
        const coincideFecha = fecha === fechaSeleccionada;

        const metodo = String(pago.formaPago || "").toLowerCase();

        const coincideMetodo =
          filtroMetodo === "Todos" ||
          (filtroMetodo === "Efectivo" &&
            metodo.includes("efectivo")) ||
          (filtroMetodo === "Transferencia" &&
            (metodo.includes("transfer") ||
              metodo.includes("mercado pago")));

        const texto = `${pago.socioNombre} ${pago.dni} ${
          pago.concepto || ""
        } ${pago.formaPago || ""}`.toLowerCase();

        return (
          coincideFecha &&
          coincideMetodo &&
          texto.includes(busqueda.toLowerCase())
        );
      })
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [movimientos, fechaSeleccionada, filtroMetodo, busqueda]);

  const estadisticas = useMemo(() => {
    const hoy = fechaHoy();
    const mesActual = hoy.slice(0, 7);
    const pagosMes = movimientos.filter((p) =>
      (p.fecha || "").startsWith(mesActual)
    );

    const sumar = (lista) =>
      lista.reduce((total, pago) => total + pago.importe, 0);

    const efectivo = sumar(
      pagosMes.filter((p) =>
        String(p.formaPago || "").toLowerCase().includes("efectivo")
      )
    );

    const transferencias = sumar(
      pagosMes.filter((p) => {
        const metodo = String(p.formaPago || "").toLowerCase();
        return metodo.includes("transfer") || metodo.includes("mercado pago");
      })
    );

    const otrosMedios = sumar(
      pagosMes.filter((p) => {
        const metodo = String(p.formaPago || "").toLowerCase();
        return !metodo.includes("efectivo") &&
          !metodo.includes("transfer") &&
          !metodo.includes("mercado pago");
      })
    );

    return {
      totalSocios: socios.length,
      alDia: socios.filter((s) => obtenerEstado(s) === "Al día").length,
      porVencer: socios.filter((s) => obtenerEstado(s) === "Por vencer").length,
      vencidos: socios.filter((s) => obtenerEstado(s) === "Vencido").length,
      sinVencimiento: socios.filter(
        (s) => obtenerEstado(s) === "Sin vencimiento"
      ).length,
      recaudacion: sumar(pagosMes),
      efectivo,
      transferencias,
      otrosMedios,
      pagosMes: pagosMes.length,
    };
  }, [socios, movimientos]);

  const sociosFiltrados = useMemo(() => {
    return socios
      .filter((socio) => {
        const texto = `${socio.nombre || ""} ${socio.apellido || ""} ${
          socio.dni || ""
        } ${socio.telefono || ""}`.toLowerCase();

        const coincideBusqueda = texto.includes(busqueda.toLowerCase());
        const estado = obtenerEstado(socio);
        const coincideEstado =
          filtroEstado === "Todos" || estado === filtroEstado;

        return coincideBusqueda && coincideEstado;
      })
      .sort((a, b) => obtenerNombre(a).localeCompare(obtenerNombre(b)));
  }, [socios, busqueda, filtroEstado]);

  const pagosDelSocio = useMemo(() => {
    if (!socioSeleccionado) return [];

    return (socioSeleccionado.pagos || [])
      .map((pago, indice) => ({ ...pago, _indice: indice }))
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [socioSeleccionado]);

  const iniciarSesion = (e) => {
    e.preventDefault();

    if (clave === CLAVE_PASSWORD) {
      localStorage.setItem("bibigym_panel_autorizado", "true");
      setAutorizado(true);
      setErrorLogin("");
      setClave("");
    } else {
      setErrorLogin("La contraseña es incorrecta.");
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("bibigym_panel_autorizado");
    setAutorizado(false);
    setClave("");
  };

  const eliminarSocio = () => {
    if (!socioSeleccionado) return;

    const actualizados = socios.filter(
      (socio) => socio.dni !== socioSeleccionado.dni
    );

    localStorage.setItem("bibigym_socios", JSON.stringify(actualizados));
    setSocios(actualizados);
    setSocioSeleccionado(null);
    setConfirmarEliminar(false);
  };

  const abrirSocio = (socio) => {
    setSocioSeleccionado(socio);
    setConfirmarEliminar(false);
  };

  if (!autorizado) {
    return (
      <main className="pd-login">
        <form className="pd-login-card" onSubmit={iniciarSesion}>
          <div className="pd-logo">BG</div>
          <p className="pd-eyebrow">BIBIGYM</p>
          <h1>Panel de administración</h1>
          <p>Ingresá tu contraseña para continuar.</p>

          <label htmlFor="pd-clave">Contraseña</label>
          <input
            id="pd-clave"
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
            required
          />

          {errorLogin && <p className="pd-error">{errorLogin}</p>}

          <button className="pd-btn pd-btn-primary" type="submit">
            Ingresar
          </button>

          {onVolver && (
            <button
              className="pd-btn pd-btn-secondary"
              type="button"
              onClick={onVolver}
            >
              Volver
            </button>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="pd-app">
      <header className="pd-header">
        <div>
          <p className="pd-eyebrow">BIBIGYM · ADMINISTRACIÓN</p>
          <h1>Panel de la dueña</h1>
          <p className="pd-muted">
            Control de socios, cuotas y movimientos del gimnasio.
          </p>
        </div>

        <div className="pd-header-actions">
          {onVolver && (
            <button className="pd-btn pd-btn-secondary" onClick={onVolver}>
              Volver al sistema
            </button>
          )}
          <button className="pd-btn pd-btn-secondary" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="pd-nav">
        {[
          ["resumen", "Resumen"],
          ["socios", "Socios"],
          ["pagos", "Pagos y movimientos"],
        ].map(([id, texto]) => (
          <button
            key={id}
            className={`pd-nav-btn ${seccion === id ? "active" : ""}`}
            onClick={() => {
              setSeccion(id);
              setBusqueda("");
            }}
          >
            {texto}
          </button>
        ))}
      </nav>

      {seccion === "resumen" && (
        <section className="pd-section">
          <div className="pd-section-heading">
            <div>
              <h2>Resumen general</h2>
              <p className="pd-muted">Estado actual del gimnasio.</p>
            </div>
            <span className="pd-date">{fechaLegible(fechaHoy())}</span>
          </div>

          <div className="pd-stats-grid">
            <article className="pd-stat-card">
              <span>Total de socios</span>
              <strong>{estadisticas.totalSocios}</strong>
              <small>Registrados en el sistema</small>
            </article>
            <article className="pd-stat-card pd-stat-green">
              <span>Cuotas al día</span>
              <strong>{estadisticas.alDia}</strong>
              <small>Más de 5 días hasta vencer</small>
            </article>
            <article className="pd-stat-card pd-stat-yellow">
              <span>Por vencer</span>
              <strong>{estadisticas.porVencer}</strong>
              <small>Vencen dentro de 5 días</small>
            </article>
            <article className="pd-stat-card pd-stat-red">
              <span>Cuotas vencidas</span>
              <strong>{estadisticas.vencidos}</strong>
              <small>Revisar pagos pendientes</small>
            </article>
          </div>

          <div className="pd-panel">
            <div className="pd-section-heading">
              <div>
                <h2>Recaudación del mes</h2>
                <p className="pd-muted">
                  Suma de los pagos registrados durante este mes.
                </p>
              </div>
              <strong className="pd-revenue">
                {dinero(estadisticas.recaudacion)}
              </strong>
            </div>

            <div className="pd-income-grid">
              <div className="pd-income-item">
                <span>Efectivo</span>
                <strong>{dinero(estadisticas.efectivo)}</strong>
              </div>
              <div className="pd-income-item">
                <span>Transferencias / Mercado Pago</span>
                <strong>{dinero(estadisticas.transferencias)}</strong>
              </div>
              <div className="pd-income-item">
                <span>Otros medios</span>
                <strong>{dinero(estadisticas.otrosMedios)}</strong>
              </div>
              <div className="pd-income-item">
                <span>Pagos registrados este mes</span>
                <strong>{estadisticas.pagosMes}</strong>
              </div>
            </div>
          </div>

          <div className="pd-panel">
            <div className="pd-section-heading">
              <div>
                <h2>Socios que requieren atención</h2>
                <p className="pd-muted">
                  Cuotas vencidas, próximas a vencer o sin vencimiento cargado.
                </p>
              </div>
              <button
                className="pd-btn pd-btn-secondary"
                onClick={() => setSeccion("socios")}
              >
                Ver todos los socios
              </button>
            </div>

            {socios.filter((s) => obtenerEstado(s) !== "Al día").length ===
            0 ? (
              <p className="pd-empty">No hay socios pendientes de revisión.</p>
            ) : (
              <div className="pd-table-wrap">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>DNI</th>
                      <th>Vencimiento</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {socios
                      .filter((s) => obtenerEstado(s) !== "Al día")
                      .sort((a, b) =>
                        (a.fechaVencimiento || "").localeCompare(
                          b.fechaVencimiento || ""
                        )
                      )
                      .slice(0, 8)
                      .map((socio, indice) => (
                        <tr key={socio.dni || indice}>
                          <td>{obtenerNombre(socio)}</td>
                          <td>{socio.dni || "—"}</td>
                          <td>{fechaLegible(socio.fechaVencimiento)}</td>
                          <td>
                            <span
                              className={`pd-status pd-status-${obtenerEstado(
                                socio
                              )
                                .toLowerCase()
                                .replaceAll(" ", "-")}`}
                            >
                              {obtenerEstado(socio)}
                            </span>
                          </td>
                          <td>
                            <button
                              className="pd-link-btn"
                              onClick={() => abrirSocio(socio)}
                            >
                              Ver ficha
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {seccion === "socios" && (
        <section className="pd-section">
          <div className="pd-section-heading">
            <div>
              <h2>Gestión de socios</h2>
              <p className="pd-muted">
                Información personal, actividades y estado de la cuota.
              </p>
            </div>
            <span className="pd-count">
              {sociosFiltrados.length} resultado(s)
            </span>
          </div>

          <div className="pd-filters">
            <input
              type="search"
              placeholder="Buscar por nombre, DNI o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Al día</option>
              <option>Por vencer</option>
              <option>Vencido</option>
              <option>Sin vencimiento</option>
            </select>
          </div>

          {sociosFiltrados.length === 0 ? (
            <div className="pd-empty-card">
              <h3>No se encontraron socios</h3>
              <p>Probá cambiar la búsqueda o el filtro.</p>
            </div>
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>DNI</th>
                    <th>Teléfono</th>
                    <th>Plan</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sociosFiltrados.map((socio, indice) => (
                    <tr key={socio.dni || indice}>
                      <td>{obtenerNombre(socio)}</td>
                      <td>{socio.dni || "—"}</td>
                      <td>{socio.telefono || "—"}</td>
                      <td>{socio.nombrePlan || socio.plan || "Sin plan"}</td>
                      <td>{fechaLegible(socio.fechaVencimiento)}</td>
                      <td>
                        <span
                          className={`pd-status pd-status-${obtenerEstado(
                            socio
                          )
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {obtenerEstado(socio)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="pd-link-btn"
                          onClick={() => abrirSocio(socio)}
                        >
                          Ver ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {seccion === "pagos" && (
        <section className="pd-section">
          <div className="pd-section-heading">
            <div>
              <h2>Pagos y movimientos</h2>
              <p className="pd-muted">
                Consultá los pagos registrados y filtrá por fecha o medio de pago.
              </p>
            </div>
            <strong className="pd-revenue">
              {dinero(
                movimientosFiltrados.reduce((total, p) => total + p.importe, 0)
              )}
            </strong>
          </div>


<div className="pd-filters pd-filters-multiple">
  <input
    type="search"
    placeholder="Buscar socio, DNI o concepto..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
  />

  <input
    type="date"
    value={fechaSeleccionada}
    onChange={(e) => setFechaSeleccionada(e.target.value)}
    aria-label="Seleccionar fecha de los pagos"
  />

  <select
    value={filtroMetodo}
    onChange={(e) => setFiltroMetodo(e.target.value)}
  >
    <option value="Todos">Todos los medios</option>
    <option value="Efectivo">Efectivo</option>
    <option value="Transferencia">Transferencia</option>
  </select>
</div>


          <div className="pd-panel pd-panel-flush">
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Socio</th>
                    <th>DNI</th>
                    <th>Concepto</th>
                    <th>Forma de pago</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((pago) => (
                    <tr key={pago.pagoId}>
                      <td>{fechaLegible(pago.fecha)}</td>
                      <td>{pago.socioNombre}</td>
                      <td>{pago.dni || "—"}</td>
                      <td>{pago.concepto || "Pago"}</td>
                      <td>{pago.formaPago || "No especificado"}</td>
                      <td className="pd-amount">{dinero(pago.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {movimientosFiltrados.length === 0 && (
                <p className="pd-empty">
                  No hay pagos que coincidan con esos filtros.
                </p>
              )}
            </div>
          </div>

          <p className="pd-footnote">
            La recaudación refleja los pagos guardados en el historial de cada
            socio. Los pagos que no tengan fecha o forma de pago pueden quedar
            fuera de algunos filtros o de los subtotales por medio de pago.
          </p>
        </section>
      )}

      {socioSeleccionado && (
        <div
          className="pd-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSocioSeleccionado(null);
              setConfirmarEliminar(false);
            }
          }}
        >
          <section
            className="pd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-modal-title"
          >
            <div className="pd-modal-header">
              <div>
                <p className="pd-eyebrow">FICHA DEL SOCIO</p>
                <h2 id="pd-modal-title">{obtenerNombre(socioSeleccionado)}</h2>
                <span
                  className={`pd-status pd-status-${obtenerEstado(
                    socioSeleccionado
                  )
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {obtenerEstado(socioSeleccionado)}
                </span>
              </div>
              <button
                className="pd-close"
                onClick={() => {
                  setSocioSeleccionado(null);
                  setConfirmarEliminar(false);
                }}
                aria-label="Cerrar ficha"
              >
                ×
              </button>
            </div>

            <div className="pd-details-grid">
              <div>
                <span>DNI</span>
                <strong>{socioSeleccionado.dni || "—"}</strong>
              </div>
              <div>
                <span>Teléfono</span>
                <strong>{socioSeleccionado.telefono || "—"}</strong>
              </div>
              <div>
                <span>Fecha de alta</span>
                <strong>{fechaLegible(socioSeleccionado.fechaAlta)}</strong>
              </div>
              <div>
                <span>Vencimiento</span>
                <strong>
                  {fechaLegible(socioSeleccionado.fechaVencimiento)}
                </strong>
              </div>
              <div>
                <span>Plan</span>
                <strong>
                  {socioSeleccionado.nombrePlan ||
                    socioSeleccionado.plan ||
                    "Sin plan"}
                </strong>
              </div>
              <div>
                <span>Precio mensual registrado</span>
                <strong>
                  {dinero(
                    socioSeleccionado.totalMensual ??
                      socioSeleccionado.precioPlan ??
                      0
                  )}
                </strong>
              </div>
            </div>

            <div className="pd-detail-block">
              <h3>Actividades</h3>
              {Array.isArray(socioSeleccionado.actividades) &&
              socioSeleccionado.actividades.length > 0 ? (
                <div className="pd-tags">
                  {socioSeleccionado.actividades.map((actividad, i) => (
                    <span key={`${actividad}-${i}`}>{actividad}</span>
                  ))}
                </div>
              ) : (
                <p className="pd-muted">
                  {socioSeleccionado.detalleActividades ||
                    "No hay actividades registradas."}
                </p>
              )}
            </div>

            <div className="pd-detail-block">
              <h3>Historial de pagos ({pagosDelSocio.length})</h3>
              {pagosDelSocio.length === 0 ? (
                <p className="pd-empty">Este socio no tiene pagos registrados.</p>
              ) : (
                <div className="pd-table-wrap">
                  <table className="pd-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Medio</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosDelSocio.map((pago) => (
                        <tr key={pago._indice}>
                          <td>{fechaLegible(pago.fecha)}</td>
                          <td>{pago.concepto || "Pago"}</td>
                          <td>{pago.formaPago || "No especificado"}</td>
                          <td className="pd-amount">{dinero(pago.importe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pd-modal-footer">
              {!confirmarEliminar ? (
                <button
                  className="pd-btn pd-btn-danger"
                  onClick={() => setConfirmarEliminar(true)}
                >
                  Eliminar socio
                </button>
              ) : (
                <div className="pd-confirm-delete">
                  <p>
                    ¿Seguro que querés eliminar a este socio y su historial
                    guardado en este navegador?
                  </p>
                  <button className="pd-btn pd-btn-danger" onClick={eliminarSocio}>
                    Sí, eliminar
                  </button>
                  <button
                    className="pd-btn pd-btn-secondary"
                    onClick={() => setConfirmarEliminar(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <button
                className="pd-btn pd-btn-secondary"
                onClick={() => {
                  setSocioSeleccionado(null);
                  setConfirmarEliminar(false);
                }}
              >
                Cerrar ficha
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
