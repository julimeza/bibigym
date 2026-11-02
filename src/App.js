import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/logo-bibigym.png";
import RegistrarSocia from "./registrarSocia";

const faceapi = window.faceapi;

let modelosFacialesPromise = null;

// =====================================
// FUNCIONES PARA FECHAS Y CUOTAS
// =====================================

function convertirFecha(fecha) {
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);

  if (!anio || !mes || !dia) return null;

  return new Date(anio, mes - 1, dia);
}

function sumarMesCalendario(fecha) {
  const resultado = new Date(fecha);
  const diaOriginal = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + 1);

  const ultimoDia = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0
  ).getDate();

  resultado.setDate(Math.min(diaOriginal, ultimoDia));

  return resultado;
}

function diferenciaDias(fecha) {
  const hoy = new Date();

  const hoyUTC = Date.UTC(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  const fechaUTC = Date.UTC(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );

  return Math.round((fechaUTC - hoyUTC) / 86400000);
}

function formatoFecha(fecha) {
  if (!fecha) return "Sin fecha";

  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function obtenerInformacionCuota(socia) {
  const totalMensual = Number(socia.totalMensual || 0);

  const pagosOrdenados = [...(socia.pagos || [])].sort((a, b) =>
    String(a.fecha || "").localeCompare(String(b.fecha || ""))
  );

  const abonadoMensual = pagosOrdenados.reduce((total, pago) => {
    return total +
      Number(pago.efectivoMensual || 0) +
      Number(pago.transferenciaMensual || 0);
  }, 0);

  const deuda = Math.max(0, totalMensual - abonadoMensual);

  // Buscar cuándo se completó el pago mensual.
  // Los pagos parciales se acumulan hasta cubrir el total.

  let acumulado = 0;
  let fechaCompleta = null;

  if (totalMensual > 0) {
    for (const pago of pagosOrdenados) {
      const importe =
        Number(pago.efectivoMensual || 0) +
        Number(pago.transferenciaMensual || 0);

      acumulado += importe;

      if (acumulado >= totalMensual) {
        fechaCompleta = convertirFecha(pago.fecha);
        acumulado = 0;
      }
    }
  }

  // Si existe una fecha de vencimiento guardada, utilizarla.
  let vencimiento = socia.fechaVencimiento
    ? convertirFecha(socia.fechaVencimiento)
    : null;

  if (!vencimiento && fechaCompleta) {
    vencimiento = sumarMesCalendario(fechaCompleta);
  }

  let diasRestantes = null;
  let estado = "pendiente";
  let aviso = "Cuota pendiente";

  if (deuda > 0) {
    estado = "deuda";
    aviso = "Tiene un saldo pendiente";
  } else if (vencimiento) {
    diasRestantes = diferenciaDias(vencimiento);

    if (diasRestantes < 0) {
      estado = "vencida";
      aviso = "Cuota vencida";
    } else if (diasRestantes === 0) {
      estado = "vencida";
      aviso = "Cuota vencida";
    } else if (diasRestantes <= 3) {
      estado = "por-vencer";
      aviso = `Faltan ${diasRestantes} ${
        diasRestantes === 1 ? "día" : "días"
      } para el vencimiento`;
    } else {
      estado = "vigente";
      aviso = "Cuota vigente";
    }
  }

  return {
    totalMensual,
    abonadoMensual,
    deuda,
    fechaCompleta,
    vencimiento,
    diasRestantes,
    estado,
    aviso
  };
}

// =====================================
// COMPONENTE PRINCIPAL
// =====================================

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sociasFacialesRef = useRef([]);

  const [estadoCamara, setEstadoCamara] = useState("apagada");
  const [mensaje, setMensaje] = useState("La cámara está apagada.");
  const [camaraSolicitada, setCamaraSolicitada] = useState(false);
  const [pantalla, setPantalla] = useState("acceso");
  const [reintentar, setReintentar] = useState(0);

  const [modelosCargados, setModelosCargados] = useState(false);
  const [rostroDetectado, setRostroDetectado] = useState(false);
  const [errorModelos, setErrorModelos] = useState(false);

const [sociaReconocida, setSociaReconocida] = useState(null);

const sociaReconocidaRef = useRef(null);
const sociaCerradaIdRef = useRef(null);

  // =====================================
  // CARGAR MODELOS FACIALES
  // =====================================

useEffect(() => {
  let cancelado = false;

  async function cargarModelos() {
    try {
      // Evita iniciar dos cargas simultáneas de los mismos modelos.
      if (!modelosFacialesPromise) {
        modelosFacialesPromise = Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models")
        ]);
      }

      await modelosFacialesPromise;

      // Comprobar que los tres modelos estén realmente cargados.
      const listos =
        faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded;

      if (!listos) {
        throw new Error("Uno o más modelos faciales no están disponibles.");
      }

      if (!cancelado) {
        setModelosCargados(true);
        setErrorModelos(false);
        console.log("Modelos faciales cargados correctamente.");
      }

    } catch (error) {
      console.error("Error cargando modelos faciales:", error);

      modelosFacialesPromise = null;

      if (!cancelado) {
        setModelosCargados(false);
        setErrorModelos(true);
      }
    }
  }

  cargarModelos();

  return () => {
    cancelado = true;
  };
}, []);

// =====================================
// ACTUALIZAR LISTA DE SOCIAS
// =====================================

useEffect(() => {
  function actualizarSocias() {
    try {
      const guardadas = JSON.parse(
        localStorage.getItem("bibigym_socias") || "[]"
      );

      sociasFacialesRef.current = guardadas
        .filter(socia =>
          Array.isArray(socia.descriptorFacial) &&
          socia.descriptorFacial.length === 128
        )
        .map(socia => ({
          ...socia,
          descriptorPreparado: new Float32Array(
            socia.descriptorFacial
          )
        }));

    } catch (error) {
      console.error("Error leyendo socias:", error);
      sociasFacialesRef.current = [];
    }
  }

  actualizarSocias();

  const intervalo = setInterval(actualizarSocias, 10000);

  window.addEventListener("focus", actualizarSocias);
  window.addEventListener("storage", actualizarSocias);

  return () => {
    clearInterval(intervalo);
    window.removeEventListener("focus", actualizarSocias);
    window.removeEventListener("storage", actualizarSocias);
  };
}, [pantalla]);

// =====================================
// RECONOCIMIENTO FACIAL CONTINUO
// =====================================

useEffect(() => {
  if (estadoCamara !== "activa") return;
  if (!modelosCargados) return;

  let cancelado = false;
  let temporizador = null;
  let procesando = false;
  let ultimoEstadoRostro = false;

  async function detectarEIdentificar() {
    if (cancelado || procesando) return;

    if (sociaReconocidaRef.current) {
      temporizador = setTimeout(detectarEIdentificar, 500);
      return;
    }

    const modelosListos =
      faceapi.nets.tinyFaceDetector.isLoaded &&
      faceapi.nets.faceLandmark68Net.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded;

    if (!modelosListos) {
      temporizador = setTimeout(detectarEIdentificar, 1000);
      return;
    }

    const video = videoRef.current;

    if (!video || video.readyState < 2 || !video.videoWidth) {
      temporizador = setTimeout(detectarEIdentificar, 500);
      return;
    }

    procesando = true;

    try {
      const resultado = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 128,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (cancelado) return;

      const hayRostro = Boolean(resultado);

      // Actualizar React solamente cuando cambia la detección.
      if (hayRostro !== ultimoEstadoRostro) {
        ultimoEstadoRostro = hayRostro;
        setRostroDetectado(hayRostro);
      }

      if (!resultado) {
        sociaCerradaIdRef.current = null;

        if (!sociaReconocidaRef.current) {
          setMensaje(
            "Esperando que una socia se coloque frente a la cámara."
          );
        }

        return;
      }

      const socias = sociasFacialesRef.current;

      let mejorCoincidencia = null;
      let menorDistancia = Infinity;

      for (const socia of socias) {
        const distancia = faceapi.euclideanDistance(
          resultado.descriptor,
          socia.descriptorPreparado
        );

        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          mejorCoincidencia = socia;
        }
      }

      if (mejorCoincidencia && menorDistancia < 0.50) {
        const idReconocido = mejorCoincidencia.id;

        if (idReconocido === sociaCerradaIdRef.current) {
          return;
        }

        if (!sociaReconocidaRef.current) {
          sociaReconocidaRef.current = mejorCoincidencia;
          setSociaReconocida(mejorCoincidencia);
          setMensaje("Socia identificada correctamente.");
        }

      } else {
        setMensaje("Rostro detectado. Socia no identificada.");
      }

    } catch (error) {
      console.error("Error en reconocimiento facial:", error);

    } finally {
      procesando = false;

      if (!cancelado) {
        // Menos inferencias por segundo para liberar recursos.
        temporizador = setTimeout(detectarEIdentificar, 1000);
      }
    }
  }

  detectarEIdentificar();

  return () => {
    cancelado = true;
    clearTimeout(temporizador);
    setRostroDetectado(false);
  };

}, [estadoCamara, modelosCargados]);

  // =====================================
  // ACTIVAR Y CONTROLAR CÁMARA
  // =====================================

useEffect(() => {
  let cancelado = false;
  let stream = null;

  // Guardamos una referencia estable al elemento de video.
  const videoElement = videoRef.current;

  async function iniciarCamara() {
    if (pantalla !== "acceso") return;
    if (!camaraSolicitada) return;

    try {
      setEstadoCamara("cargando");
      setMensaje("Preparando cámara...");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("incompatible");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          aspectRatio: { ideal: 4 / 3 }
        },
        audio: false
      });

      if (cancelado) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
      }

      if (!cancelado) {
        setEstadoCamara("activa");
        setMensaje(
          "Cámara activa. Colocá tu rostro frente a la cámara."
        );
      }
    } catch (error) {
      if (cancelado) return;

      console.error("Error al iniciar la cámara:", error);

      setEstadoCamara("error");

      if (error.message === "incompatible") {
        setMensaje(
          "Tu navegador no permite acceder a la cámara. Utilizá una conexión segura."
        );
      } else if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setMensaje("Necesitamos permiso para utilizar la cámara.");
      } else if (error.name === "NotFoundError") {
        setMensaje("No encontramos una cámara disponible.");
      } else if (error.name === "NotReadableError") {
        setMensaje(
          "La cámara está siendo utilizada por otra aplicación."
        );
      } else {
        setMensaje("No pudimos iniciar la cámara. Intentá nuevamente.");
      }
    }
  }

  iniciarCamara();

  return () => {
    cancelado = true;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (streamRef.current === stream) {
      streamRef.current = null;
    }

    if (videoElement) {
      videoElement.srcObject = null;
    }
  };
}, [reintentar, pantalla, camaraSolicitada]);

  // =====================================
  // ACCIONES
  // =====================================

  function reactivarCamara() {
    setCamaraSolicitada(true);
    setReintentar(anterior => anterior + 1);
  }

function cerrarCamara() {
  streamRef.current?.getTracks().forEach(track => track.stop());
  streamRef.current = null;

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  sociaReconocidaRef.current = null;
  sociaCerradaIdRef.current = null;

  setCamaraSolicitada(false);
  setEstadoCamara("apagada");
  setMensaje("La cámara está apagada.");
  setSociaReconocida(null);
}

  function abrirRegistro() {
    cerrarCamara();
    setPantalla("registro");
  }

  function abrirPagos() {
    cerrarCamara();
    setPantalla("pagos");
  }

  function volverAlAcceso() {
    setPantalla("acceso");
  }

function cerrarFichaSocia() {
  if (sociaReconocidaRef.current) {
    sociaCerradaIdRef.current = sociaReconocidaRef.current.id;
  }

  sociaReconocidaRef.current = null;
  setSociaReconocida(null);
}

function irARegistrarPago() {
  if (!sociaReconocidaRef.current) return;

  const dni = sociaReconocidaRef.current.dni;

  sociaReconocidaRef.current = null;
  setSociaReconocida(null);

  cerrarCamara();
  setPantalla("pagos");
  setDniParaPago(dni);
}

  const [dniParaPago, setDniParaPago] = useState("");

  // =====================================
  // MÓDULO REGISTRAR SOCIA
  // =====================================

  if (pantalla === "registro" || pantalla === "pagos") {
    return (
      <RegistrarSocia
        onVolver={volverAlAcceso}
        modoInicial={pantalla === "pagos" ? "pagos" : "registro"}
        dniInicial={dniParaPago}
      />
    );
  }

  // =====================================
  // DATOS DE LA SOCIA RECONOCIDA
  // =====================================

  const informacionCuota = sociaReconocida
    ? obtenerInformacionCuota(sociaReconocida)
    : null;

  // =====================================
  // PANTALLA PRINCIPAL
  // =====================================

  return (
    <main className="fondo">
      <section className="tarjeta">
        <header className="cabecera">
          <div className="logo-marco">
            <img
              src={logo}
              alt="Logo BibiGym"
              className="logo-img"
            />
          </div>

          <div className="encabezado-texto">
            <h1 className="titulo">BibiGym</h1>
            <p className="subtitulo">Control de acceso</p>
          </div>
        </header>

        <div className="bloque-camara">
          <div className="camara-contenedor">
            <video
              ref={videoRef}
              className="camara-video"
              autoPlay
              muted
              playsInline
            />

            {estadoCamara !== "activa" && (
              <div className="camara-overlay">
                <div className="camara-icono">
                  {estadoCamara === "error" ? "!" : "..."}
                </div>

                <p>
                  {estadoCamara === "cargando"
                    ? "Iniciando cámara..."
                    : "Cámara no disponible"}
                </p>
              </div>
            )}
          </div>

          <div
            className={`camara-estado ${estadoCamara}`}
            aria-live="polite"
          >
            <span className="camara-punto"></span>
            <p>{mensaje}</p>
          </div>

          <div className="estado-reconocimiento">
            {errorModelos ? (
              <p>No se pudieron cargar los modelos faciales.</p>
            ) : !modelosCargados ? (
              <p>Cargando sistema de reconocimiento facial...</p>
            ) : rostroDetectado ? (
              <p>Rostro detectado correctamente.</p>
            ) : (
              <p>Sistema facial preparado. Esperando rostro...</p>
            )}
          </div>

          {estadoCamara !== "activa" && (
            <button
              type="button"
              className="boton boton-primario"
              onClick={reactivarCamara}
            >
              {estadoCamara === "error"
                ? "Activar cámara nuevamente"
                : "Abrir cámara"}
            </button>
          )}

          {estadoCamara === "activa" && (
            <button
              type="button"
              className="boton boton-primario"
              onClick={cerrarCamara}
            >
              Cerrar cámara
            </button>
          )}
        </div>

        <div className="separador">
          <span></span>
        </div>

        <div className="botones-inicio">
          <button
            type="button"
            className="boton boton-secundario"
            onClick={abrirRegistro}
          >
            Registrar socia nueva
          </button>

          <button
            type="button"
            className="boton boton-secundario"
            onClick={abrirPagos}
          >
            Registrar pago
          </button>
        </div>
      </section>

      {/* =====================================
          FICHA FLOTANTE DE LA SOCIA
      ===================================== */}

      {sociaReconocida && informacionCuota && (
        <div className="modal-socia-fondo">
          <section
            className="modal-socia"
            role="dialog"
            aria-modal="true"
            aria-label="Información de la socia"
          >
            <button
              type="button"
              className="modal-socia-cerrar"
              onClick={cerrarFichaSocia}
              aria-label="Cerrar información de la socia"
            >
              ×
            </button>

            <div className="modal-socia-encabezado">
              {sociaReconocida.rostro ? (
                <img
                  src={sociaReconocida.rostro}
                  alt={`Fotografía de ${sociaReconocida.nombre}`}
                  className="modal-socia-foto"
                />
              ) : (
                <div className="modal-socia-foto modal-socia-sin-foto">
                  BG
                </div>
              )}

              <div className="modal-socia-identidad">
                <span className="modal-socia-etiqueta">
                  SOCIA IDENTIFICADA
                </span>

                <h2>
                  {sociaReconocida.nombre} {sociaReconocida.apellido}
                </h2>

                <p>DNI: {sociaReconocida.dni}</p>

                <p>
                  Plan: {sociaReconocida.plan?.nombre || "Sin plan mensual"}
                </p>
              </div>
            </div>

            <div className="modal-socia-separador"></div>

            <div className="modal-socia-cuota">
              <div className="modal-socia-titulo">
                <h3>Estado de la cuota</h3>

                <span className={`estado-cuota ${informacionCuota.estado}`}>
                  {informacionCuota.aviso}
                </span>
              </div>

              <div className="modal-socia-datos">
                <div>
                  <span>Inicio de cuota</span>
                  <strong>
                    {formatoFecha(informacionCuota.fechaCompleta)}
                  </strong>
                </div>

                <div>
                  <span>Vencimiento</span>
                  <strong>
                    {formatoFecha(informacionCuota.vencimiento)}
                  </strong>
                </div>

                <div className="modal-socia-dias">
                  <span>Días restantes</span>
                  <strong>
                    {informacionCuota.diasRestantes === null
                      ? "—"
                      : Math.max(0, informacionCuota.diasRestantes)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-socia-pagos">
              <div>
                <span>Total mensual</span>
                <strong>
                  ${informacionCuota.totalMensual.toLocaleString("es-AR")}
                </strong>
              </div>

              <div>
                <span>Abonado</span>
                <strong>
                  ${informacionCuota.abonadoMensual.toLocaleString("es-AR")}
                </strong>
              </div>

              <div className="modal-socia-deuda">
                <span>Deuda pendiente</span>
                <strong>
                  ${informacionCuota.deuda.toLocaleString("es-AR")}
                </strong>
              </div>
            </div>

            {informacionCuota.deuda > 0 && (
              <button
                type="button"
                className="modal-socia-boton-pago"
                onClick={irARegistrarPago}
              >
                Registrar pago
                <span>→</span>
              </button>
            )}

            <p className="modal-socia-pie">
              Esta ventana permanecerá abierta hasta que la cierres.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
