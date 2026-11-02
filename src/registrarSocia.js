
import React, { useEffect, useRef, useState } from "react";
import "./registrarSocia.css";
import qrMercadoPago from "./assets/qr-mercadopago.png";
const faceapi = window.faceapi;

// =====================================
// CONFIGURACIÓN
// =====================================

const CLAVE_SOCIAS = "bibigym_socias";

const planesMensuales = [
  { id: "pesas-personalizadas-6", nombre: "Pesas personalizadas · Lunes a sábado", precio: 27000 },
  { id: "pesas-personalizadas-3", nombre: "Pesas personalizadas · 3 días", precio: 21000 },
  { id: "pesas-sin-personalizado", nombre: "Pesas sin personalizado · 3 días", precio: 15000 },
  { id: "pase-libre", nombre: "Pase Libre · Trampolín, Aerobics y Pesas", precio: 35000 }
];

const clasesGrupales = [
  { id: "trampolin", nombre: "Trampolín", precio: 25000 },
  { id: "spinning", nombre: "Spinning", precio: 27000 },
  { id: "aerobics", nombre: "Aerobics · Box y Barra Funcional", precio: 15000 },
  { id: "crossfit", nombre: "CrossFit", precio: 15000 }
];

const clasesSueltas = [
  { id: "trampolin", nombre: "Trampolín", precio: 4000 },
  { id: "pesas", nombre: "Pesas", precio: 3000 },
  { id: "aerobics", nombre: "Aerobics", precio: 2500 },
  { id: "spinning", nombre: "Spinning", precio: 4000 }
];

// =====================================
// FUNCIONES AUXILIARES
// =====================================

function formatoPrecio(valor) {
  return "$" + Number(valor || 0).toLocaleString("es-AR");
}

function fechaActual() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function leerSocias() {
  try {
    const guardadas = localStorage.getItem(CLAVE_SOCIAS);
    return guardadas ? JSON.parse(guardadas) : [];
  } catch (error) {
    console.error("Error leyendo las socias:", error);
    return [];
  }
}

function guardarSocias(socias) {
  localStorage.setItem(CLAVE_SOCIAS, JSON.stringify(socias));
}

function calcularPagos(pagos = []) {
  return pagos.reduce((resultado, pago) => {
    resultado.efectivoMensual += Number(pago.efectivoMensual || 0);
    resultado.transferenciaMensual += Number(pago.transferenciaMensual || 0);
    resultado.efectivoDia += Number(pago.efectivoDia || 0);
    resultado.transferenciaDia += Number(pago.transferenciaDia || 0);
    return resultado;
  }, {
    efectivoMensual: 0,
    transferenciaMensual: 0,
    efectivoDia: 0,
    transferenciaDia: 0
  });
}

function calcularEstado(socia) {
  const pagos = calcularPagos(socia.pagos);

  const abonadoMensual =
    pagos.efectivoMensual + pagos.transferenciaMensual;

  const abonadoDia =
    pagos.efectivoDia + pagos.transferenciaDia;

  const totalMensual = Number(socia.totalMensual || 0);
  const totalDia = Number(socia.totalDia || 0);

  return {
    totalMensual,
    totalDia,
    abonadoMensual,
    abonadoDia,
    deudaMensual: Math.max(0, totalMensual - abonadoMensual),
    deudaDia: Math.max(0, totalDia - abonadoDia),
    totalAbonado: abonadoMensual + abonadoDia,
    saldoTotal:
      Math.max(0, totalMensual - abonadoMensual) +
      Math.max(0, totalDia - abonadoDia)
  };
}

function evitarCambioConRuedita(evento) {
  evento.currentTarget.blur();
}

// =====================================
// COMPONENTE
// =====================================

function RegistrarSocia({
  onVolver,
  modoInicial = "registro",
  dniInicial = ""
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [modo, setModo] = useState(modoInicial);
  const [socias, setSocias] = useState(() => leerSocias());
  const [filtroFecha, setFiltroFecha] = useState("");

  // DATOS PERSONALES
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [gmail, setGmail] = useState("");

  // CÁMARA Y RECONOCIMIENTO FACIAL
  const [rostro, setRostro] = useState(null);
  const [descriptorFacial, setDescriptorFacial] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");

  // PLANES
  const [planSeleccionado, setPlanSeleccionado] = useState("");
  const [grupalesSeleccionadas, setGrupalesSeleccionadas] = useState([]);
  const [sueltasSeleccionadas, setSueltasSeleccionadas] = useState({});

  // FECHA
  const [fechaPago, setFechaPago] = useState(fechaActual());

  // PRIMER PAGO
  const [efectivoMensual, setEfectivoMensual] = useState("");
  const [transferenciaMensual, setTransferenciaMensual] = useState("");
  const [efectivoDia, setEfectivoDia] = useState("");
  const [transferenciaDia, setTransferenciaDia] = useState("");

  // BÚSQUEDA DE SOCIA Y PAGOS POSTERIORES
  const [dniBusqueda, setDniBusqueda] = useState("");
  const [sociaEncontrada, setSociaEncontrada] = useState(null);

  const [nuevoEfectivoMensual, setNuevoEfectivoMensual] = useState("");
  const [nuevaTransferenciaMensual, setNuevaTransferenciaMensual] = useState("");
  const [nuevoEfectivoDia, setNuevoEfectivoDia] = useState("");
  const [nuevaTransferenciaDia, setNuevaTransferenciaDia] = useState("");
  const [fechaNuevoPago, setFechaNuevoPago] = useState(fechaActual());

  // MENSAJES
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");

  // =====================================
  // RECIBIR DNI DESDE EL RECONOCIMIENTO
  // =====================================

  useEffect(() => {
    if (modoInicial === "pagos" && dniInicial) {
      setModo("pagos");
      setDniBusqueda(String(dniInicial));
      setSociaEncontrada(null);
      setMensaje("");
    }
  }, [modoInicial, dniInicial]);

  // =====================================
  // CÁMARA: SOLAMENTE EN REGISTRO
  // =====================================

  useEffect(() => {
    if (modo !== "registro") return;

    let cancelado = false;
    let stream = null;

    async function iniciarCamara() {
      try {
        setErrorCamara("");
        setCamaraActiva(false);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("El navegador no permite acceder a la cámara.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (cancelado) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!cancelado) {
          setCamaraActiva(true);
          setErrorCamara("");
        }
      } catch (error) {
        if (!cancelado) {
          setCamaraActiva(false);
          setErrorCamara(error.message || "No se pudo iniciar la cámara.");
        }
      }
    }

    iniciarCamara();

    return () => {
      cancelado = true;

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      streamRef.current = null;
    };
  }, [modo]);

  // =====================================
  // CAPTURAR ROSTRO
  // =====================================


async function capturarRostro() {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas || !video.videoWidth || video.readyState < 2) {
    setErrorCamara("La cámara todavía no está lista.");
    return;
  }

  try {
    setErrorCamara("");

    if (
      !faceapi.nets.tinyFaceDetector.isLoaded ||
      !faceapi.nets.faceLandmark68Net.isLoaded ||
      !faceapi.nets.faceRecognitionNet.isLoaded
    ) {
      setErrorCamara("El sistema facial todavía está cargando.");
      return;
    }

    // Detectar el rostro y obtener su descriptor.
    const deteccion = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.5
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!deteccion) {
      setErrorCamara(
        "No se detectó ningún rostro. Ubicate de frente a la cámara."
      );
      return;
    }

    // Guardar identificación facial.
    setDescriptorFacial(Array.from(deteccion.descriptor));

    // Capturar la imagen directamente desde la cámara.
    const ancho = video.videoWidth;
    const alto = video.videoHeight;

    canvas.width = ancho;
    canvas.height = alto;

    const contexto = canvas.getContext("2d", {
      alpha: false
    });

    contexto.save();
    contexto.translate(ancho, 0);
    contexto.scale(-1, 1);
    contexto.drawImage(video, 0, 0, ancho, alto);
    contexto.restore();

    // Comprimir la fotografía para reducir almacenamiento.
    const fotografia = canvas.toDataURL("image/jpeg", 0.75);

    setRostro(fotografia);
    setErrorCamara("");

  } catch (error) {
    console.error("Error capturando el rostro:", error);
    setErrorCamara("No se pudo registrar el rostro. Intentá nuevamente.");
  }
}


  // =====================================
  // SELECCIÓN DE PLANES Y CLASES
  // =====================================

  function cambiarClaseGrupal(id) {
    setGrupalesSeleccionadas(anterior =>
      anterior.includes(id)
        ? anterior.filter(item => item !== id)
        : [...anterior, id]
    );
  }

  function cambiarClaseSuelta(id, seleccionada) {
    setSueltasSeleccionadas(anterior => ({
      ...anterior,
      [id]: seleccionada ? 1 : 0
    }));
  }

  // =====================================
  // CÁLCULO DE TOTALES DEL REGISTRO
  // =====================================

  const planActual = planesMensuales.find(
    plan => plan.id === planSeleccionado
  );

  const totalPlan = planActual ? planActual.precio : 0;

  const totalGrupales = grupalesSeleccionadas.reduce((total, id) => {
    const clase = clasesGrupales.find(item => item.id === id);
    return total + (clase ? clase.precio : 0);
  }, 0);

  const totalMensual = totalPlan + totalGrupales;

  const totalDia = clasesSueltas.reduce((total, clase) => {
    return total + (
      sueltasSeleccionadas[clase.id] ? clase.precio : 0
    );
  }, 0);

  const pagoInicialMensual =
    (Number(efectivoMensual) || 0) +
    (Number(transferenciaMensual) || 0);

  const pagoInicialDia =
    (Number(efectivoDia) || 0) +
    (Number(transferenciaDia) || 0);

  const deudaInicialMensual = Math.max(
    0,
    totalMensual - pagoInicialMensual
  );

  const deudaInicialDia = Math.max(
    0,
    totalDia - pagoInicialDia
  );

  // =====================================
  // REGISTRAR UN MOVIMIENTO DE PAGO
  // =====================================

  function crearMovimiento({
    fecha,
    efectivoMensual = 0,
    transferenciaMensual = 0,
    efectivoDia = 0,
    transferenciaDia = 0
  }) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fecha,
      fechaHora: new Date().toISOString(),
      efectivoMensual: Number(efectivoMensual) || 0,
      transferenciaMensual: Number(transferenciaMensual) || 0,
      efectivoDia: Number(efectivoDia) || 0,
      transferenciaDia: Number(transferenciaDia) || 0,
      total:
        (Number(efectivoMensual) || 0) +
        (Number(transferenciaMensual) || 0) +
        (Number(efectivoDia) || 0) +
        (Number(transferenciaDia) || 0)
    };
  }

  // =====================================
  // REGISTRAR NUEVA SOCIA
  // =====================================

  function registrarSocia(evento) {
    evento.preventDefault();
    setMensaje("");

    const dniLimpio = dni.trim();

    if (!/^\d{7,8}$/.test(dniLimpio)) {
      setTipoMensaje("error");
      setMensaje("Ingresá un DNI válido de 7 u 8 números.");
      return;
    }

    if (!nombre.trim() || !apellido.trim()) {
      setTipoMensaje("error");
      setMensaje("Completá el nombre y apellido.");
      return;
    }

    if (socias.some(socia => socia.dni === dniLimpio)) {
      setTipoMensaje("error");
      setMensaje("Ya existe una socia registrada con ese DNI.");
      return;
    }

    if (!descriptorFacial) {
      setTipoMensaje("error");
      setMensaje("Primero capturá y registrá el rostro de la socia.");
      return;
    }

    if (!planSeleccionado && grupalesSeleccionadas.length === 0) {
      setTipoMensaje("error");
      setMensaje("Seleccioná al menos un plan o una clase grupal.");
      return;
    }

    if (pagoInicialMensual > totalMensual || pagoInicialDia > totalDia) {
      setTipoMensaje("error");
      setMensaje("Un importe abonado supera el total correspondiente.");
      return;
    }

    const pagosIniciales = [];

    if (pagoInicialMensual > 0 || pagoInicialDia > 0) {
      pagosIniciales.push(crearMovimiento({
        fecha: fechaPago,
        efectivoMensual,
        transferenciaMensual,
        efectivoDia,
        transferenciaDia
      }));
    }

    const nuevaSocia = {
      id: `${Date.now()}-${dniLimpio}`,
      dni: dniLimpio,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      gmail: gmail.trim(),
      rostro,
      descriptorFacial,
      plan: planActual || null,
      clasesGrupales: grupalesSeleccionadas.map(id => {
        return clasesGrupales.find(item => item.id === id);
      }),
      clasesSueltas: clasesSueltas
        .filter(clase => (sueltasSeleccionadas[clase.id] || 0) > 0)
        .map(clase => ({
          ...clase,
          cantidad: sueltasSeleccionadas[clase.id],
          subtotal: clase.precio * sueltasSeleccionadas[clase.id]
        })),
      totalMensual,
      totalDia,
      pagos: pagosIniciales,
      fechaRegistro: new Date().toISOString()
    };

    const actualizadas = [...socias, nuevaSocia];

    try {
      guardarSocias(actualizadas);
      setSocias(actualizadas);
      setTipoMensaje("exito");
      setMensaje("¡Socia registrada correctamente!");

      // Limpiar formulario.
      setDni("");
      setNombre("");
      setApellido("");
      setTelefono("");
      setGmail("");
      setRostro(null);
      setDescriptorFacial(null);
      setPlanSeleccionado("");
      setGrupalesSeleccionadas([]);
      setSueltasSeleccionadas({});
      setEfectivoMensual("");
      setTransferenciaMensual("");
      setEfectivoDia("");
      setTransferenciaDia("");
      setFechaPago(fechaActual());
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("No se pudo guardar. Puede que el almacenamiento esté lleno.");
    }
  }

  // =====================================
  // BUSCAR SOCIA POR DNI
  // =====================================

  function buscarSocia() {
    setMensaje("");

    const dniLimpio = dniBusqueda.trim();

    if (!dniLimpio) {
      setTipoMensaje("error");
      setMensaje("Ingresá el DNI de la socia.");
      setSociaEncontrada(null);
      return;
    }

    const encontrada = socias.find(
      socia => socia.dni === dniLimpio
    );

    if (!encontrada) {
      setSociaEncontrada(null);
      setTipoMensaje("error");
      setMensaje("No encontramos una socia con ese DNI.");
      return;
    }

    setSociaEncontrada(encontrada);
    setNuevoEfectivoMensual("");
    setNuevaTransferenciaMensual("");
    setNuevoEfectivoDia("");
    setNuevaTransferenciaDia("");
    setFechaNuevoPago(fechaActual());
    setTipoMensaje("exito");
    setMensaje("Socia encontrada.");
  }

  // =====================================
  // REGISTRAR UN PAGO POSTERIOR
  // =====================================

  function registrarNuevoPago(evento) {
    evento.preventDefault();
    setMensaje("");

    if (!sociaEncontrada) {
      setTipoMensaje("error");
      setMensaje("Primero buscá una socia.");
      return;
    }

    const estado = calcularEstado(sociaEncontrada);

    const efectivoM = Number(nuevoEfectivoMensual) || 0;
    const transferenciaM = Number(nuevaTransferenciaMensual) || 0;
    const efectivoD = Number(nuevoEfectivoDia) || 0;
    const transferenciaD = Number(nuevaTransferenciaDia) || 0;

    const pagoM = efectivoM + transferenciaM;
    const pagoD = efectivoD + transferenciaD;

    if (pagoM + pagoD <= 0) {
      setTipoMensaje("error");
      setMensaje("Ingresá al menos un importe para registrar el pago.");
      return;
    }

    if (!fechaNuevoPago) {
      setTipoMensaje("error");
      setMensaje("Seleccioná la fecha del pago.");
      return;
    }

    if (pagoM > estado.deudaMensual) {
      setTipoMensaje("error");
      setMensaje(
        `El pago mensual supera la deuda pendiente de ${formatoPrecio(estado.deudaMensual)}.`
      );
      return;
    }

    if (pagoD > estado.deudaDia) {
      setTipoMensaje("error");
      setMensaje(
        `El pago del día supera la deuda pendiente de ${formatoPrecio(estado.deudaDia)}.`
      );
      return;
    }

    const movimiento = crearMovimiento({
      fecha: fechaNuevoPago,
      efectivoMensual: efectivoM,
      transferenciaMensual: transferenciaM,
      efectivoDia: efectivoD,
      transferenciaDia: transferenciaD
    });

    const sociaActualizada = {
      ...sociaEncontrada,
      pagos: [...(sociaEncontrada.pagos || []), movimiento]
    };

    const actualizadas = socias.map(socia =>
      socia.id === sociaEncontrada.id ? sociaActualizada : socia
    );

    try {
      guardarSocias(actualizadas);
      setSocias(actualizadas);
      setSociaEncontrada(sociaActualizada);

      setNuevoEfectivoMensual("");
      setNuevaTransferenciaMensual("");
      setNuevoEfectivoDia("");
      setNuevaTransferenciaDia("");
      setFechaNuevoPago(fechaActual());

      setTipoMensaje("exito");
      setMensaje("¡El pago se guardó correctamente!");
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("No se pudo guardar el pago.");
    }
  }

  // =====================================
  // RESUMEN DE PAGOS DE LA SOCIA
  // =====================================

  const estadoSocia = sociaEncontrada
    ? calcularEstado(sociaEncontrada)
    : null;

  const pagosOrdenados = sociaEncontrada
    ? [...(sociaEncontrada.pagos || [])].sort((a, b) =>
        new Date(b.fechaHora || b.fecha) - new Date(a.fechaHora || a.fecha)
      )
    : [];

  const pagosFiltrados = pagosOrdenados.filter(pago =>
    !filtroFecha || pago.fecha === filtroFecha
  );

  // =====================================
  // VISTA
  // =====================================

  return (
    <main className="registro-fondo">
      <section className="registro-contenedor">

        {/* ENCABEZADO */}
        <header className="registro-cabecera">
          <div className="registro-marca">
            <h1>BibiGym</h1>
            <p>Gestión de socias</p>
          </div>

          <button
            type="button"
            className="registro-volver"
            onClick={onVolver}
          >
            ← Volver al acceso
          </button>
        </header>

        {/* CAMBIAR ENTRE REGISTRO Y PAGOS */}
        <nav className="registro-pestanas">
          <button
            type="button"
            className={modo === "registro" ? "activa" : ""}
            onClick={() => {
              setModo("registro");
              setMensaje("");
            }}
          >
            Registrar socia
          </button>

          <button
            type="button"
            className={modo === "pagos" ? "activa" : ""}
            onClick={() => {
              setModo("pagos");
              setMensaje("");
              setSociaEncontrada(null);
              setDniBusqueda("");
            }}
          >
            Registrar pago
          </button>
        </nav>

        {/* =====================================
            MODO REGISTRO
        ===================================== */}

        {modo === "registro" && (
          <form onSubmit={registrarSocia}>

            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>01</span>
                <h2>Datos personales</h2>
              </div>

              <div className="registro-grid">
                <label className="registro-campo">
                  DNI
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dni}
                    onChange={e =>
                      setDni(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    maxLength="8"
                    required
                  />
                </label>

                <label className="registro-campo">
                  Nombre
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => {
                      const valor = e.target.value;
                      setNombre(
                        valor.length > 0
                          ? valor.charAt(0).toLocaleUpperCase("es-AR") + valor.slice(1)
                          : ""
                      );
                    }}
                    required
                  />
                </label>

                <label className="registro-campo">
                  Apellido
                  <input
                    type="text"
                    value={apellido}
                    onChange={e => {
                      const valor = e.target.value;
                      setApellido(
                        valor.length > 0
                          ? valor.charAt(0).toLocaleUpperCase("es-AR") + valor.slice(1)
                          : ""
                      );
                    }}
                    required
                  />
                </label>

                <label className="registro-campo">
                  Teléfono
                  <input
                    type="tel"
                    inputMode="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    required
                  />
                </label>

                <label className="registro-campo">
                  Gmail
                  <input
                    type="email"
                    value={gmail}
                    onChange={e => setGmail(e.target.value)}
                    required
                  />
                </label>
              </div>
            </section>

            {/* ROSTRO */}
            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>02</span>
                <h2>Registro facial</h2>
              </div>

              <div className="registro-rostro">
                <div className="registro-video-contenedor">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ display: rostro ? "none" : "block" }}
                  />

                  {rostro && (
                    <img
                      src={rostro}
                      alt="Fotografía de la socia"
                    />
                  )}
                </div>

                <div className="registro-estado-facial">
  <p>
    {descriptorFacial
      ? "Rostro registrado correctamente."
      : camaraActiva
      ? "Ubicá el rostro de frente."
      : "Esperando acceso a la cámara..."}
  </p>

  {descriptorFacial && (
    <p className="registro-facial-exito">
      Identificación facial lista para registrar.
    </p>
  )}

<button
  type="button"
  className="registro-boton-secundario"
  onClick={() => {
    if (rostro) {
      setRostro(null);
      setDescriptorFacial(null);
      setErrorCamara("");
    } else {
      capturarRostro();
    }
  }}
  disabled={!camaraActiva}
>
  {rostro ? "Volver a capturar" : "Capturar rostro"}
</button>

{rostro && (
  <button
    type="button"
    className="registro-enlace"
    onClick={() => {
      setRostro(null);
      setDescriptorFacial(null);
      setErrorCamara("");
    }}
  >
    Eliminar fotografía
  </button>
)}

                  {errorCamara && (
                    <p className="registro-error">{errorCamara}</p>
                  )}
                </div>
              </div>

              <canvas ref={canvasRef} style={{ display: "none" }} />
            </section>

            {/* PLANES MENSUALES */}
            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>03</span>
                <h2>Planes mensuales</h2>
              </div>

              <div className="registro-opciones">
                {planesMensuales.map(plan => (
                  <label className="registro-opcion" key={plan.id}>
                    <input
                      type="radio"
                      name="planMensual"
                      checked={planSeleccionado === plan.id}
                      onChange={() => setPlanSeleccionado(plan.id)}
                    />

                    <span className="registro-opcion-texto">
                      {plan.nombre}
                    </span>

                    <strong>{formatoPrecio(plan.precio)}</strong>
                  </label>
                ))}
              </div>
            </section>

            {/* CLASES GRUPALES */}
            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>04</span>
                <h2>Clases grupales</h2>
              </div>

              <p className="registro-ayuda">
                Seleccioná las actividades.
              </p>

              <div className="registro-opciones">
                {clasesGrupales.map(clase => (
                  <div className="registro-clase" key={clase.id}>
                    <label className="registro-opcion">
                      <input
                        type="checkbox"
                        checked={grupalesSeleccionadas.includes(clase.id)}
                        onChange={() => cambiarClaseGrupal(clase.id)}
                      />

                      <span className="registro-opcion-texto">
                        {clase.nombre}
                      </span>

                      <strong>{formatoPrecio(clase.precio)}</strong>
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {/* CLASES SUELTAS */}
            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>05</span>
                <h2>Clases sueltas</h2>
              </div>

              <p className="registro-ayuda">
                Seleccioná las clases que realiza hoy la socia.
              </p>

              <div className="registro-opciones">
                {clasesSueltas.map(clase => (
                  <div className="registro-clase" key={clase.id}>
                    <label className="registro-opcion">
                      <input
                        type="checkbox"
                        checked={!!sueltasSeleccionadas[clase.id]}
                        onChange={e =>
                          cambiarClaseSuelta(clase.id, e.target.checked)
                        }
                      />

                      <span className="registro-opcion-texto">
                        {clase.nombre}
                      </span>

                      <strong>{formatoPrecio(clase.precio)}</strong>
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {/* PAGO INICIAL */}
            <section className="registro-seccion">
              <div className="registro-titulo-seccion">
                <span>06</span>
                <h2>Primer pago</h2>
              </div>

              <label className="registro-campo registro-fecha">
                Fecha del pago
                <input
                  type="date"
                  value={fechaPago}
                  onChange={e => setFechaPago(e.target.value)}
                />
              </label>

              {/* PAGO MENSUAL */}
              <div className="registro-pago-bloque">
                <div className="registro-pago-encabezado">
                  <h3>Pago mensual</h3>
                  <strong>{formatoPrecio(totalMensual)}</strong>
                </div>

                <div className="registro-pago-grid">
                  <label className="registro-campo">
                    Efectivo
                    <input
                      type="number"
                      onWheel={evitarCambioConRuedita}
                      min="0"
                      value={efectivoMensual}
                      onChange={e => setEfectivoMensual(e.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <label className="registro-campo">
                    Transferencia
                    <input
                      type="number"
                      onWheel={evitarCambioConRuedita}
                      min="0"
                      value={transferenciaMensual}
                      onChange={e => setTransferenciaMensual(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>

                <p className="registro-ayuda">
                  Abonado: {formatoPrecio(pagoInicialMensual)} ·
                  Pendiente: {formatoPrecio(deudaInicialMensual)}
                </p>
              </div>

              {/* PAGO DE CLASES SUELTAS */}
              <div className="registro-pago-bloque">
                <div className="registro-pago-encabezado">
                  <h3>Clases sueltas del día</h3>
                  <strong>{formatoPrecio(totalDia)}</strong>
                </div>

                <div className="registro-pago-grid">
                  <label className="registro-campo">
                    Efectivo
                    <input
                      type="number"
                      onWheel={evitarCambioConRuedita}
                      min="0"
                      value={efectivoDia}
                      onChange={e => setEfectivoDia(e.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <label className="registro-campo">
                    Transferencia
                    <input
                      type="number"
                      onWheel={evitarCambioConRuedita}
                      min="0"
                      value={transferenciaDia}
                      onChange={e => setTransferenciaDia(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>

                <p className="registro-ayuda">
                  Abonado: {formatoPrecio(pagoInicialDia)} ·
                  Pendiente: {formatoPrecio(deudaInicialDia)}
                </p>
              </div>

              {/* QR MERCADO PAGO */}
              {(Number(transferenciaMensual) > 0 ||
                Number(transferenciaDia) > 0) && (
                <div className="registro-qr">
                  <h3>Mercado Pago</h3>
                  <p>Escaneá el QR para realizar la transferencia.</p>

                  <img
                    src={qrMercadoPago}
                    alt="QR de Mercado Pago de BibiGym"
                    className="registro-imagen-qr"
                  />
                </div>
              )}

              {/* RESÚMENES SEPARADOS */}
              <div className="registro-resumen-pagos">
                <div className="registro-total registro-resumen-cuadro">
                  <h3>Resumen mensual</h3>

                  <div>
                    <span>Total mensual</span>
                    <strong>{formatoPrecio(totalMensual)}</strong>
                  </div>

                  <div>
                    <span>Abonado del mes</span>
                    <strong>{formatoPrecio(pagoInicialMensual)}</strong>
                  </div>

                  <div className="registro-saldo">
                    <span>Saldo pendiente</span>
                    <strong>{formatoPrecio(deudaInicialMensual)}</strong>
                  </div>

                  <p className="registro-estado-pago">
                    {totalMensual > 0 && deudaInicialMensual === 0
                      ? "Mes pagado"
                      : pagoInicialMensual > 0
                      ? "Pago mensual parcial"
                      : "Mes pendiente"}
                  </p>
                </div>

                {totalDia > 0 && (
                  <div className="registro-total registro-resumen-cuadro">
                    <h3>Resumen del día</h3>

                    <div>
                      <span>Total del día</span>
                      <strong>{formatoPrecio(totalDia)}</strong>
                    </div>

                    <div>
                      <span>Abonado del día</span>
                      <strong>{formatoPrecio(pagoInicialDia)}</strong>
                    </div>

                    <div className="registro-saldo">
                      <span>Saldo pendiente</span>
                      <strong>{formatoPrecio(deudaInicialDia)}</strong>
                    </div>

                    <p className="registro-estado-pago">
                      {deudaInicialDia === 0
                        ? "Día pagado"
                        : pagoInicialDia > 0
                        ? "Pago del día parcial"
                        : "Día pendiente"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <button type="submit" className="registro-boton-guardar">
              Registrar socia
            </button>
          </form>
        )}

        {/* =====================================
            MODO REGISTRAR PAGO POSTERIOR
        ===================================== */}

        {modo === "pagos" && (
          <section className="registro-seccion">

            <div className="registro-titulo-seccion">
              <span>01</span>
              <h2>Buscar socia</h2>
            </div>

            <div className="registro-busqueda">
              <label className="registro-campo">
                DNI de la socia
                <input
                  type="text"
                  inputMode="numeric"
                  value={dniBusqueda}
                  onChange={e =>
                    setDniBusqueda(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      buscarSocia();
                    }
                  }}
                  placeholder="Ingresar DNI"
                />
              </label>

<button
  type="button"
  className="registro-boton-secundario"
  onClick={capturarRostro}
  disabled={!camaraActiva}
>
  {rostro ? "Volver a capturar" : "Capturar rostro"}
</button>
            </div>

            {sociaEncontrada && estadoSocia && (
              <>
                <div className="registro-ficha-socia">
                  <div>
                    <span>DATOS DE LA SOCIA</span>
                    <h3>
                      {sociaEncontrada.nombre} {sociaEncontrada.apellido}
                    </h3>
                    <p>DNI: {sociaEncontrada.dni}</p>
                  </div>

                  {sociaEncontrada.rostro && (
                    <img
                      src={sociaEncontrada.rostro}
                      alt="Fotografía de la socia"
                    />
                  )}
                </div>

                {/* ESTADO DE CUENTA */}
                <div className="registro-total">
                  <h3>Estado de cuenta</h3>

                  <div>
                    <span>Total mensual</span>
                    <strong>{formatoPrecio(estadoSocia.totalMensual)}</strong>
                  </div>

                  <div>
                    <span>Abonado mensual</span>
                    <strong>{formatoPrecio(estadoSocia.abonadoMensual)}</strong>
                  </div>

                  <div className="registro-saldo">
                    <span>Deuda mensual</span>
                    <strong>{formatoPrecio(estadoSocia.deudaMensual)}</strong>
                  </div>

                  <div>
                    <span>Total de clases del día</span>
                    <strong>{formatoPrecio(estadoSocia.totalDia)}</strong>
                  </div>

                  <div>
                    <span>Abonado por clases del día</span>
                    <strong>{formatoPrecio(estadoSocia.abonadoDia)}</strong>
                  </div>

                  <div className="registro-saldo">
                    <span>Deuda de clases sueltas</span>
                    <strong>{formatoPrecio(estadoSocia.deudaDia)}</strong>
                  </div>
                </div>

                {/* NUEVO PAGO */}
                <form onSubmit={registrarNuevoPago}>
                  <div className="registro-titulo-seccion">
                    <span>02</span>
                    <h2>Registrar nuevo pago</h2>
                  </div>

                  <label className="registro-campo registro-fecha">
                    Fecha del pago
                    <input
                      type="date"
                      value={fechaNuevoPago}
                      onChange={e => setFechaNuevoPago(e.target.value)}
                      required
                    />
                  </label>

                  <div className="registro-pago-bloque">
                    <div className="registro-pago-encabezado">
                      <h3>Abonar deuda mensual</h3>
                      <strong>{formatoPrecio(estadoSocia.deudaMensual)}</strong>
                    </div>

                    <div className="registro-pago-grid">
                      <label className="registro-campo">
                        Efectivo
                        <input
                          type="number"
                          onWheel={evitarCambioConRuedita}
                          min="0"
                          max={estadoSocia.deudaMensual}
                          value={nuevoEfectivoMensual}
                          onChange={e => setNuevoEfectivoMensual(e.target.value)}
                          placeholder="0"
                        />
                      </label>

                      <label className="registro-campo">
                        Transferencia
                        <input
                          type="number"
                          onWheel={evitarCambioConRuedita}
                          min="0"
                          max={estadoSocia.deudaMensual}
                          value={nuevaTransferenciaMensual}
                          onChange={e => setNuevaTransferenciaMensual(e.target.value)}
                          placeholder="0"
                        />
                      </label>
                    </div>

                    <p className="registro-ayuda">
                      Se pueden combinar efectivo y transferencia.
                    </p>
                  </div>

                  <div className="registro-pago-bloque">
                    <div className="registro-pago-encabezado">
                      <h3>Abonar deuda de clases del día</h3>
                      <strong>{formatoPrecio(estadoSocia.deudaDia)}</strong>
                    </div>

                    <div className="registro-pago-grid">
                      <label className="registro-campo">
                        Efectivo
                        <input
                          type="number"
                          onWheel={evitarCambioConRuedita}
                          min="0"
                          max={estadoSocia.deudaDia}
                          value={nuevoEfectivoDia}
                          onChange={e => setNuevoEfectivoDia(e.target.value)}
                          placeholder="0"
                        />
                      </label>

                      <label className="registro-campo">
                        Transferencia
                        <input
                          type="number"
                          onWheel={evitarCambioConRuedita}
                          min="0"
                          max={estadoSocia.deudaDia}
                          value={nuevaTransferenciaDia}
                          onChange={e => setNuevaTransferenciaDia(e.target.value)}
                          placeholder="0"
                        />
                      </label>
                    </div>
                  </div>

                  {(Number(nuevaTransferenciaMensual) > 0 ||
                    Number(nuevaTransferenciaDia) > 0) && (
                    <div className="registro-qr">
                      <h3>Mercado Pago</h3>
                      <p>Escaneá el QR para realizar la transferencia.</p>

                      <img
                        src={qrMercadoPago}
                        alt="QR de Mercado Pago de BibiGym"
                        className="registro-imagen-qr"
                      />
                    </div>
                  )}

                  <div className="registro-total">
                    <h3>Este nuevo pago</h3>

                    <div>
                      <span>Efectivo</span>
                      <strong>
                        {formatoPrecio(
                          Number(nuevoEfectivoMensual || 0) +
                          Number(nuevoEfectivoDia || 0)
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Transferencia</span>
                      <strong>
                        {formatoPrecio(
                          Number(nuevaTransferenciaMensual || 0) +
                          Number(nuevaTransferenciaDia || 0)
                        )}
                      </strong>
                    </div>

                    <div className="registro-saldo">
                      <span>Total que se registra</span>
                      <strong>
                        {formatoPrecio(
                          Number(nuevoEfectivoMensual || 0) +
                          Number(nuevaTransferenciaMensual || 0) +
                          Number(nuevoEfectivoDia || 0) +
                          Number(nuevaTransferenciaDia || 0)
                        )}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="registro-boton-guardar"
                    disabled={estadoSocia.saldoTotal === 0}
                  >
                    Registrar pago
                  </button>
                </form>

                {/* HISTORIAL */}
                <div className="registro-historial">
                  <div className="registro-titulo-seccion">
                    <span>03</span>
                    <h2>Historial de pagos</h2>
                  </div>

                  {/* FILTRO POR FECHA */}
                  <div className="registro-filtro-fecha">
                    <label className="registro-campo">
                      Filtrar historial por fecha

                      <input
                        type="date"
                        value={filtroFecha}
                        onChange={e => setFiltroFecha(e.target.value)}
                      />
                    </label>

                    {filtroFecha && (
                      <button
                        type="button"
                        className="registro-boton-secundario"
                        onClick={() => setFiltroFecha("")}
                      >
                        Limpiar filtro
                      </button>
                    )}
                  </div>

                  {/* LISTADO DE PAGOS */}
                  {pagosOrdenados.length === 0 ? (
                    <p className="registro-ayuda">
                      Esta socia todavía no tiene pagos registrados.
                    </p>
                  ) : pagosFiltrados.length === 0 ? (
                    <p className="registro-ayuda">
                      No hay pagos registrados en esa fecha.
                    </p>
                  ) : (
                    pagosFiltrados.map(pago => (
                      <article className="registro-movimiento" key={pago.id}>
                        <div className="registro-movimiento-cabecera">
                          <strong>
                            {new Date(`${pago.fecha}T12:00:00`).toLocaleDateString("es-AR")}
                          </strong>

                          <strong>
                            {formatoPrecio(pago.total)}
                          </strong>
                        </div>

                        {/* DETALLE DEL PAGO MENSUAL */}
                        {(pago.efectivoMensual > 0 ||
                          pago.transferenciaMensual > 0) && (
                          <div className="registro-movimiento-detalle">
                            <span>Pago mensual</span>

                            <span>
                              Efectivo: {formatoPrecio(pago.efectivoMensual)}
                              {" · "}
                              Transferencia: {formatoPrecio(pago.transferenciaMensual)}
                            </span>
                          </div>
                        )}

                        {/* DETALLE DE CLASES DEL DÍA */}
                        {(pago.efectivoDia > 0 ||
                          pago.transferenciaDia > 0) && (
                          <div className="registro-movimiento-detalle">
                            <span>Clases del día</span>

                            <span>
                              Efectivo: {formatoPrecio(pago.efectivoDia)}
                              {" · "}
                              Transferencia: {formatoPrecio(pago.transferenciaDia)}
                            </span>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {mensaje && (
          <p className={`registro-mensaje ${tipoMensaje}`} role="status">
            {mensaje}
          </p>
        )}

      </section>
    </main>
  );
}

export default RegistrarSocia;
