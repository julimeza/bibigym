
import { useState } from "react";
import "./App.css";
import logoBibi from "./assets/logo-bibigym.png";
import RegistroSocio from "./RegistroSocio";

const obtenerFechaActual = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const datosIniciales = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  plan: "Mensual",
  fechaAlta: obtenerFechaActual(),
};

function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [dni, setDni] = useState("");
  const [socio, setSocio] = useState(datosIniciales);
  const [mensaje, setMensaje] = useState("");

  const manejarBuscarSocio = (e) => {
    e.preventDefault();

    if (!dni.trim()) {
      setMensaje("Ingresá el DNI del socio.");
      return;
    }

    setMensaje("");
    console.log("Buscar socio con DNI:", dni.trim());

    // Próximo paso: conectar con la base de datos.
  };

  const abrirRegistro = () => {
    setSocio({
      ...datosIniciales,
      fechaAlta: obtenerFechaActual(),
    });

    setMensaje("");
    setPantalla("registro");
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    let valorFinal = value;

    if (name === "nombre" || name === "apellido") {
      valorFinal = value
        .toLocaleLowerCase("es")
        .replace(
          /(^|[\s'-])(\p{L})/gu,
          (coincidencia, separador, letra) =>
            separador + letra.toLocaleUpperCase("es")
        );
    }

    setSocio((anterior) => ({
      ...anterior,
      [name]: valorFinal,
    }));
  };

  const guardarSocio = (e) => {
    e.preventDefault();

    setMensaje("");

    console.log("Datos del nuevo socio:", socio);

    // Próximo paso: enviar los datos al backend.
    setMensaje(
      "Formulario validado. Falta conectar la base de datos para guardar el socio."
    );
  };

  const volverInicio = () => {
    setMensaje("");
    setPantalla("inicio");
  };

  return (
    <main
      className={`fondo ${
        pantalla === "registro" ? "fondo-registro" : ""
      }`}
    >
      <section
        className={`tarjeta ${
          pantalla === "registro" ? "tarjeta-registro" : ""
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
            <h1 className="titulo">BibiGym</h1>
            <p className="subtitulo">
              {pantalla === "inicio"
                ? "Control de acceso"
                : "Registro de socio"}
            </p>
          </div>
        </header>

        {pantalla === "inicio" ? (
          <>
            <form className="bloque" onSubmit={manejarBuscarSocio}>
              <label htmlFor="dni" className="etiqueta">
                DNI del socio
              </label>

              <input
                id="dni"
                type="text"
                className="input"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingresá el DNI"
                autoComplete="off"
                inputMode="numeric"
              />

              <button type="submit" className="boton boton-primario">
                <span>Buscar socio</span>
                <span className="flecha" aria-hidden="true">
                  →
                </span>
              </button>
            </form>

            <div className="separador" aria-hidden="true">
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
            manejarCambio={manejarCambio}
            guardarSocio={guardarSocio}
            mensaje={mensaje}
            volverInicio={volverInicio}
          />
        )}

        {pantalla === "inicio" && mensaje && (
          <p className="mensaje-formulario" role="status">
            {mensaje}
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
