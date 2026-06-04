// Lógica del Panel de Administración del Expositor

// Configurar URL del servidor dinámica (soportando localhost y despliegues en la nube)
const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

const socket = io(SERVER_URL);

// Variables de estado locales
let carrerasLocales = [];
let preguntasLocales = [];
let pinActivo = null;
let juegoIniciado = false;
let rondaEnCurso = false;

// Elementos del DOM
const pinAdminEl = document.getElementById('pin-admin');
const estadoJuegoAdminEl = document.getElementById('estado-juego-admin');
const usuariosConectadosAdminEl = document.getElementById('usuarios-conectados-admin');
const carrerasConfiguradasAdminEl = document.getElementById('carreras-configuradas-admin');

// Botones de flujo principal
const btnCrearPartida = document.getElementById('btn-crear-partida');
const btnIniciarJuego = document.getElementById('btn-iniciar-juego');
const btnFinalizarJuego = document.getElementById('btn-finalizar-juego');

// Sección Carreras
const carreraInput = document.getElementById('carrera-input');
const btnAgregarCarrera = document.getElementById('btn-agregar-carrera');
const listaCarrerasAgregadas = document.getElementById('lista-carreras-agregadas');
const btnGuardarConfiguracionCarreras = document.getElementById('btn-guardar-configuracion-carreras');

// Formulario Preguntas
const formPregunta = document.getElementById('form-pregunta');
const preguntaTextoInput = document.getElementById('pregunta-texto');
const opcionAInput = document.getElementById('opcion-a');
const opcionBInput = document.getElementById('opcion-b');
const opcionCInput = document.getElementById('opcion-c');
const opcionDInput = document.getElementById('opcion-d');
const preguntaCorrectaSelect = document.getElementById('pregunta-correcta');
const preguntaTiempoInput = document.getElementById('pregunta-tiempo');
const preguntaSectorSelect = document.getElementById('pregunta-sector');
const btnGuardarPregunta = document.getElementById('btn-guardar-pregunta');

// Controladores en vivo
const listaPreguntasGuardadas = document.getElementById('lista-preguntas-guardadas');
const infoPreguntaActiva = document.getElementById('info-pregunta-activa');
const infoSectorActivo = document.getElementById('info-sector-activo');
const tiempoRondaAdmin = document.getElementById('tiempo-ronda-admin');
const btnCerrarRonda = document.getElementById('btn-cerrar-ronda');


// --- RENDERIZADO DE INTERFAZ LOCAL ---

// Renderizar carreras añadidas en el DOM
function renderizarCarrerasLocales() {
  listaCarrerasAgregadas.innerHTML = '';
  carrerasLocales.forEach((carrera, index) => {
    const li = document.createElement('li');
    li.style.marginBottom = '5px';
    li.innerHTML = `
      <span>${carrera}</span>
      <button style="background-color: #c0392b; padding: 2px 6px; font-size: 0.8rem; margin-left: 10px;" onclick="eliminarCarreraLocal(${index})">Eliminar</button>
    `;
    listaCarrerasAgregadas.appendChild(li);
  });

  // Habilitar guardar si hay al menos 2 carreras
  btnGuardarConfiguracionCarreras.disabled = carrerasLocales.length < 2 || carrerasLocales.length > 6;
}

// Eliminar carrera localmente antes de enviar
window.eliminarCarreraLocal = function(index) {
  carrerasLocales.splice(index, 1);
  renderizarCarrerasLocales();
};

// Renderizar banco de preguntas guardadas en el DOM
function renderizarPreguntasBanco() {
  listaPreguntasGuardadas.innerHTML = '';
  if (preguntasLocales.length === 0) {
    listaPreguntasGuardadas.innerHTML = '<li style="color: #888;">No hay preguntas guardadas aún.</li>';
    return;
  }

  preguntasLocales.forEach((pregunta, index) => {
    const li = document.createElement('li');
    li.style.border = '1px solid #ddd';
    li.style.padding = '10px';
    li.style.marginBottom = '10px';
    li.style.backgroundColor = '#fff';
    li.style.borderRadius = '4px';
    
    // Obtener etiqueta legible del sector
    const sectorNombres = {
      "territorio-0": "Sector Norte (0)",
      "territorio-1": "Sector Centro (1)",
      "territorio-2": "Sector Sur (2)",
      "territorio-3": "Sector Este (3)"
    };

    li.innerHTML = `
      <div>
        <strong>P${index + 1}: ${pregunta.texto}</strong> <br>
        <span style="font-size: 0.85rem; color: #555;">
          Respuestas: A) ${pregunta.opciones.A} | B) ${pregunta.opciones.B} | C) ${pregunta.opciones.C} | D) ${pregunta.opciones.D} <br>
          Correcta: <strong>${pregunta.correcta}</strong> | Tiempo: <strong>${pregunta.tiempo}s</strong> | Sector Objetivo: <strong>${sectorNombres[pregunta.sector]}</strong>
        </span>
      </div>
      <div style="margin-top: 8px;">
        <button id="btn-lanzar-${index}" style="background-color: #27ae60; font-size: 0.85rem; padding: 4px 10px;" 
                onclick="lanzarPreguntaAlAuditorio(${index}, '${pregunta.sector}')" ${(!juegoIniciado || rondaEnCurso) ? 'disabled' : ''}>
          🚀 Lanzar al Mapa
        </button>
      </div>
    `;
    listaPreguntasGuardadas.appendChild(li);
  });
}


// --- ACCIONES DE COMPORTAMIENTO ---

// Lanzar una pregunta al auditorio
window.lanzarPreguntaAlAuditorio = function(preguntaIndex, sectorId) {
  if (!juegoIniciado) {
    alert("Inicia el juego antes de lanzar preguntas.");
    return;
  }
  if (rondaEnCurso) {
    alert("Ya hay una ronda activa en curso.");
    return;
  }
  
  socket.emit('lanzar_pregunta', { preguntaIndex, sectorId });
};


// --- EVENTOS DEL DOM ---

// Agregar carrera localmente
btnAgregarCarrera.addEventListener('click', () => {
  const nombre = carreraInput.value.trim();
  if (nombre === '') return;
  if (carrerasLocales.includes(nombre)) {
    alert('Esta carrera ya ha sido agregada.');
    return;
  }
  if (carrerasLocales.length >= 6) {
    alert('Solo se permite un máximo de 6 carreras.');
    return;
  }
  carrerasLocales.push(nombre);
  carreraInput.value = '';
  renderizarCarrerasLocales();
});

// Guardar y enviar la configuración de carreras al servidor
btnGuardarConfiguracionCarreras.addEventListener('click', () => {
  if (carrerasLocales.length < 2 || carrerasLocales.length > 6) {
    alert('La cantidad de carreras debe ser de 2 a 6.');
    return;
  }
  socket.emit('configurar_carreras', carrerasLocales);
});

// Guardar nueva pregunta en el servidor
btnGuardarPregunta.addEventListener('click', () => {
  const texto = preguntaTextoInput.value.trim();
  const a = opcionAInput.value.trim();
  const b = opcionBInput.value.trim();
  const c = opcionCInput.value.trim();
  const d = opcionDInput.value.trim();
  const correcta = preguntaCorrectaSelect.value;
  const tiempo = parseInt(preguntaTiempoInput.value);
  const sector = preguntaSectorSelect.value;

  if (!texto || !a || !b || !c || !d || isNaN(tiempo) || tiempo <= 0) {
    alert('Por favor, rellene todos los campos de la pregunta de manera correcta.');
    return;
  }

  const nuevaPregunta = {
    texto,
    opciones: { A: a, B: b, C: c, D: d },
    correcta,
    tiempo,
    sector
  };

  socket.emit('guardar_pregunta', nuevaPregunta);
});

// Crear nueva partida (genera PIN)
btnCrearPartida.addEventListener('click', () => {
  socket.emit('crear_partida');
});

// Iniciar juego (arrancar los 20 minutos)
btnIniciarJuego.addEventListener('click', () => {
  if (preguntasLocales.length < 3) {
    if (!confirm('Se sugiere tener al menos 3 a 5 preguntas guardadas antes de iniciar. ¿Desea iniciar de todos modos?')) {
      return;
    }
  }
  socket.emit('iniciar_juego');
});

// Cerrar ronda manualmente
btnCerrarRonda.addEventListener('click', () => {
  socket.emit('terminar_ronda');
});

// Finalizar juego forzadamente
btnFinalizarJuego.addEventListener('click', () => {
  if (confirm('¿Está seguro de que desea finalizar la partida y computar el podio ahora mismo?')) {
    socket.emit('finalizar_juego');
  }
});


// --- RECEPCIÓN DE SOCKET.IO ---

// Estado actual del servidor
socket.on('estado_actual', (estado) => {
  console.log('Estado cargado en Admin:', estado);
  
  if (estado.pin) {
    pinActivo = estado.pin;
    pinAdminEl.textContent = pinActivo;
    btnIniciarJuego.disabled = false;
  }

  usuariosConectadosAdminEl.textContent = estado.usuariosConectados || 0;
  estadoJuegoAdminEl.textContent = estado.estadoJuego.toUpperCase();

  if (estado.carreras && estado.carreras.length > 0) {
    carrerasLocales = estado.carreras;
    carrerasConfiguradasAdminEl.textContent = carrerasLocales.join(', ');
    renderizarCarrerasLocales();
  }

  if (estado.estadoJuego === 'jugando') {
    juegoIniciado = true;
    btnIniciarJuego.disabled = true;
    btnFinalizarJuego.disabled = false;
    btnCrearPartida.disabled = true;
    
    // Si hay una ronda activa en curso al reconectarse
    if (estado.preguntaEnCurso) {
      rondaEnCurso = true;
      infoPreguntaActiva.textContent = estado.preguntaEnCurso.texto;
      infoSectorActivo.textContent = estado.mapa[estado.sectorEnCurso].nombre;
      tiempoRondaAdmin.textContent = `${estado.rondaTiempoRestante}s`;
      btnCerrarRonda.disabled = false;
    }
    renderizarPreguntasBanco();
  } else if (estado.estadoJuego === 'finalizado') {
    juegoIniciado = false;
    rondaEnCurso = false;
    btnIniciarJuego.disabled = true;
    btnFinalizarJuego.disabled = true;
    btnCrearPartida.disabled = false;
    renderizarPreguntasBanco();
  }
});

// Partida creada con éxito
socket.on('partida_creada', ({ pin }) => {
  pinActivo = pin;
  pinAdminEl.textContent = pin;
  estadoJuegoAdminEl.textContent = 'ESPERA';
  juegoIniciado = false;
  rondaEnCurso = false;
  preguntasLocales = [];
  carrerasLocales = [];
  carrerasConfiguradasAdminEl.textContent = 'Ninguna';
  
  btnIniciarJuego.disabled = true; // Requiere configurar carreras antes
  btnFinalizarJuego.disabled = true;
  btnCerrarRonda.disabled = true;
  
  listaCarrerasAgregadas.innerHTML = '';
  listaPreguntasGuardadas.innerHTML = '<li style="color: #888;">No hay preguntas guardadas aún.</li>';
  
  infoPreguntaActiva.textContent = 'Ninguna';
  infoSectorActivo.textContent = 'Ninguno';
  tiempoRondaAdmin.textContent = '0s';

  alert(`Nueva partida creada. PIN: ${pin}. Favor de configurar carreras y preguntas.`);
});

// Carreras confirmadas en el servidor
socket.on('carreras_actualizadas', (carreras) => {
  carrerasLocales = carreras;
  carrerasConfiguradasAdminEl.textContent = carreras.join(', ');
  btnIniciarJuego.disabled = false; // Ya hay carreras, se puede iniciar
  alert('¡Carreras autorizadas con éxito!');
});

// Pregunta guardada con éxito en el backend
socket.on('pregunta_guardada', ({ total }) => {
  // Rellenar localmente y renderizar
  const texto = preguntaTextoInput.value;
  const a = opcionAInput.value;
  const b = opcionBInput.value;
  const c = opcionCInput.value;
  const d = opcionDInput.value;
  const correcta = preguntaCorrectaSelect.value;
  const tiempo = preguntaTiempoInput.value;
  const sector = preguntaSectorSelect.value;

  preguntasLocales.push({
    texto,
    opciones: { A: a, B: b, C: c, D: d },
    correcta,
    tiempo,
    sector
  });

  // Limpiar campos del formulario
  preguntaTextoInput.value = '';
  opcionAInput.value = '';
  opcionBInput.value = '';
  opcionCInput.value = '';
  opcionDInput.value = '';

  renderizarPreguntasBanco();
  alert(`Pregunta guardada con éxito. Banco total: ${total}`);
});

// Actualización en vivo del contador de usuarios
socket.on('usuarios_conectados_actualizacion', (cantidad) => {
  usuariosConectadosAdminEl.textContent = cantidad;
});

// Confirmación de inicio de juego
socket.on('juego_iniciado', () => {
  juegoIniciado = true;
  estadoJuegoAdminEl.textContent = 'JUGANDO';
  btnIniciarJuego.disabled = true;
  btnFinalizarJuego.disabled = false;
  btnCrearPartida.disabled = true;
  renderizarPreguntasBanco();
  alert('¡El juego ha iniciado oficialmente en la gran pantalla!');
});

// Pregunta activa lanzada
socket.on('pregunta_lanzada', ({ pregunta, sectorId, sectorNombre, tiempoRonda }) => {
  rondaEnCurso = true;
  infoPreguntaActiva.textContent = pregunta.texto;
  infoSectorActivo.textContent = sectorNombre;
  tiempoRondaAdmin.textContent = `${tiempoRonda}s`;
  btnCerrarRonda.disabled = false;

  // Deshabilitar botones de lanzar otras preguntas
  renderizarPreguntasBanco();
});

// Actualización del segundero de la pregunta activa
socket.on('tiempo_ronda_actualizacion', (segundos) => {
  tiempoRondaAdmin.textContent = `${segundos}s`;
});

// Ronda terminada (tiempo agotado o cerrado manual)
socket.on('ronda_terminada', ({ sectorNombre, dueño, maxAciertos, hayEmpate }) => {
  rondaEnCurso = false;
  btnCerrarRonda.disabled = true;
  infoPreguntaActiva.textContent = 'Ninguna (Ronda Finalizada)';
  infoSectorActivo.textContent = 'Ninguno';
  tiempoRondaAdmin.textContent = '0s';

  // Habilitar de nuevo el lanzamiento de preguntas
  renderizarPreguntasBanco();

  let msj = `Ronda finalizada en ${sectorNombre}. `;
  if (maxAciertos === 0) {
    msj += `Ninguna carrera obtuvo aciertos correctos.`;
  } else if (hayEmpate) {
    msj += `Empate con ${maxAciertos} aciertos. El sector mantiene su dueño original.`;
  } else {
    msj += `¡Conquistado por ${dueño} con ${maxAciertos} aciertos!`;
  }
  alert(msj);
});

// Juego finalizado
socket.on('juego_finalizado', () => {
  juegoIniciado = false;
  rondaEnCurso = false;
  estadoJuegoAdminEl.textContent = 'FINALIZADO';
  btnIniciarJuego.disabled = true;
  btnFinalizarJuego.disabled = true;
  btnCerrarRonda.disabled = true;
  btnCrearPartida.disabled = false; // Permite crear una nueva partida
  
  infoPreguntaActiva.textContent = 'Juego Concluido';
  infoSectorActivo.textContent = 'Ninguno';
  tiempoRondaAdmin.textContent = '0s';
  
  renderizarPreguntasBanco();
  alert('¡La partida ha finalizado! Revisa el podio en la pantalla del auditorio.');
});

socket.on('error_servidor', (msj) => {
  alert(`Error del Servidor: ${msj}`);
});
