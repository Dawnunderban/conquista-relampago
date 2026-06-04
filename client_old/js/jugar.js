const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

const socket = io(SERVER_URL);

// DOM Elements
const formRegistro = document.getElementById('form-registro');
const pinInput = document.getElementById('pin-acceso');
const nicknameInput = document.getElementById('nickname');
const carreraSelect = document.getElementById('carrera');
const btnUnirse = document.getElementById('btn-unirse');
const msjErrorRegistro = document.getElementById('mensaje-error-registro');

const pantallas = {
  registro: document.getElementById('pantalla-registro'),
  espera: document.getElementById('pantalla-espera'),
  pregunta: document.getElementById('pantalla-pregunta'),
  finalizado: document.getElementById('pantalla-finalizado')
};

const bienvenidaMsj = document.getElementById('mensaje-bienvenida');
const tiempoRestanteEl = document.getElementById('tiempo-restante');
const textoPreguntaEl = document.getElementById('texto-pregunta');
const botonesRespuesta = document.querySelectorAll('.btn-respuesta');
const feedbackRespuesta = document.getElementById('feedback-respuesta');

let misDatos = { nickname: '', carrera: '' };

// Leer PIN de la URL si el usuario llega por el QR
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('pin')) {
  pinInput.value = urlParams.get('pin');
}

function cambiarPantalla(pantallaActiva) {
  Object.values(pantallas).forEach(p => p.classList.remove('activa'));
  pantallaActiva.classList.add('activa');
}

// Actualizar select de carreras
socket.on('estado_actual', (estado) => {
  if (estado.carreras && estado.carreras.length > 0 && carreraSelect.options.length <= 1) {
    carreraSelect.innerHTML = '<option value="" disabled selected>Selecciona tu carrera...</option>';
    estado.carreras.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      carreraSelect.appendChild(opt);
    });
  }

  if (estado.estadoJuego === 'finalizado') {
    cambiarPantalla(pantallas.finalizado);
  }
});

socket.on('carreras_actualizadas', (carreras) => {
  if (carreras && carreras.length > 0) {
    carreraSelect.innerHTML = '<option value="" disabled selected>Selecciona tu carrera...</option>';
    carreras.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      carreraSelect.appendChild(opt);
    });
  }
});

// Intentar Registrar
formRegistro.addEventListener('submit', (e) => {
  e.preventDefault();
  const pin = pinInput.value.trim();
  const nickname = nicknameInput.value.trim();
  const carrera = carreraSelect.value;

  if (!pin || !nickname || !carrera) return;

  btnUnirse.disabled = true;
  btnUnirse.textContent = 'Uniéndose...';
  msjErrorRegistro.style.display = 'none';

  socket.emit('registrar_jugador', { pin, nickname, carrera });
});

socket.on('registro_exitoso', ({ nickname, carrera }) => {
  misDatos = { nickname, carrera };
  bienvenidaMsj.innerHTML = `¡Listo, <strong>${nickname}</strong>!<br><span style="font-size:0.9rem;">Defendiendo a: ${carrera}</span>`;
  cambiarPantalla(pantallas.espera);
});

socket.on('registro_error', (msj) => {
  btnUnirse.disabled = false;
  btnUnirse.textContent = 'UNIRSE A LA BATALLA';
  msjErrorRegistro.textContent = msj;
  msjErrorRegistro.style.display = 'block';
});

// Recepción de preguntas
socket.on('pregunta_lanzada', ({ pregunta, tiempoRonda }) => {
  // Solo los que ya ingresaron pueden jugar la ronda
  if (!misDatos.nickname) return;

  textoPreguntaEl.textContent = pregunta.texto;
  tiempoRestanteEl.textContent = tiempoRonda;
  
  document.querySelector('.texto-opcion-A').textContent = pregunta.opciones.A || '';
  document.querySelector('.texto-opcion-B').textContent = pregunta.opciones.B || '';
  document.querySelector('.texto-opcion-C').textContent = pregunta.opciones.C || '';
  document.querySelector('.texto-opcion-D').textContent = pregunta.opciones.D || '';

  botonesRespuesta.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.border = '2px solid #333';
  });
  feedbackRespuesta.style.display = 'none';

  cambiarPantalla(pantallas.pregunta);
});

socket.on('tiempo_ronda_actualizacion', (segundos) => {
  tiempoRestanteEl.textContent = segundos;
});

// Accionar botones de respuesta
botonesRespuesta.forEach(btn => {
  btn.addEventListener('click', () => {
    const opcion = btn.dataset.opcion;
    
    // Bloquear al instante para evitar múltiples envíos
    botonesRespuesta.forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.5';
    });
    btn.style.opacity = '1';
    btn.style.border = '4px solid #000';

    socket.emit('enviar_respuesta', {
      nickname: misDatos.nickname,
      carrera: misDatos.carrera,
      opcionSeleccionada: opcion
    });
  });
});

socket.on('respuesta_recibida', ({ esCorrecta }) => {
  feedbackRespuesta.style.display = 'block';
  // Nota: En gamificación a veces no se dice si es correcta hasta el final, 
  // pero el servidor envía "esCorrecta".
  feedbackRespuesta.textContent = '¡RESPUESTA RECIBIDA! (Espera el cierre de ronda)';
  feedbackRespuesta.style.backgroundColor = '#d1ecf1';
  feedbackRespuesta.style.color = '#0c5460';
});

socket.on('ronda_terminada', () => {
  // Solo mover si estoy en la pantalla de pregunta
  if (misDatos.nickname && pantallas.pregunta.classList.contains('activa')) {
    botonesRespuesta.forEach(btn => btn.style.border = '2px solid #333');
    cambiarPantalla(pantallas.espera);
  }
});

socket.on('juego_finalizado', () => {
  cambiarPantalla(pantallas.finalizado);
});
