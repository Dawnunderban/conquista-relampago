// Lógica de Sockets e Integración del QR para la Pantalla del Auditorio

// Configurar URL del servidor dinámica (soportando localhost y despliegues en la nube)
const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

const socket = io(SERVER_URL);

// Elementos de la interfaz DOM
const pinJuegoEl = document.getElementById('pin-juego');
const contadorUsuariosEl = document.getElementById('contador-usuarios');
const contenedorQrEl = document.getElementById('contenedor-qr');
const urlJuegoEl = document.getElementById('url-juego');
const tiempoGlobalEl = document.getElementById('tiempo-global');
const tiempoRondaEl = document.getElementById('tiempo-ronda');
const listaVotosEl = document.getElementById('lista-votos');
const sectorAtacadoInfoEl = document.getElementById('sector-atacado-info');
const pantallaFinalEl = document.getElementById('pantalla-final');
const listaPodioEl = document.getElementById('lista-podio');

let qrInstance = null;

// Formatear segundos en formato MM:SS
function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Generación dinámica del Código QR
function generarCodigoQR(pin) {
  contenedorQrEl.innerHTML = '';
  if (!pin) {
    urlJuegoEl.textContent = 'Esperando PIN...';
    return;
  }

  // URL dinámica del cliente móvil
  const mobilePlayUrl = `${SERVER_URL}/jugar.html?pin=${pin}`;
  urlJuegoEl.textContent = mobilePlayUrl;

  // Generar QR usando qrcode.js CDN
  qrInstance = new QRCode(contenedorQrEl, {
    text: mobilePlayUrl,
    width: 160,
    height: 160,
    colorDark: "#2c3e50",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Inicializar y refrescar la lista de carreras en el panel de aciertos de ronda
function inicializarListaVotos(carreras, marcadores = {}) {
  listaVotosEl.innerHTML = '';
  if (!carreras || carreras.length === 0) {
    listaVotosEl.innerHTML = '<li style="color: #777;">Esperando configuración de carreras...</li>';
    return;
  }

  carreras.forEach((carrera) => {
    const aciertos = marcadores[carrera] || 0;
    const li = document.createElement('li');
    li.className = 'fila-voto';
    // Asignar un color de borde básico según el índice para diferenciar carreras visualmente
    li.style.borderLeftColor = obtenerColorCarrera(carrera);
    li.innerHTML = `
      <span style="font-weight: bold;">${carrera}</span>
      <span id="votos-${carrera}" style="font-size: 1.2rem; font-weight: bold;">${aciertos} aciertos</span>
    `;
    listaVotosEl.appendChild(li);
  });
}

// Retorna un color hexadecimal según la carrera para dar variedad visual en los bordes
function obtenerColorCarrera(carrera) {
  // Hash simple para obtener un color consistente por nombre de carrera
  let hash = 0;
  for (let i = 0; i < carrera.length; i++) {
    hash = carrera.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

// Renderizar o actualizar el mapa de sectores
function actualizarMapaUI(mapaState) {
  Object.keys(mapaState).forEach(sectorId => {
    const sectorEl = document.getElementById(sectorId);
    if (sectorEl) {
      const dueñoSpan = sectorEl.querySelector('.dueño-nombre');
      const indicadorEl = sectorEl.querySelector('.indicador-dominio');
      const dueño = mapaState[sectorId].dueño;

      dueñoSpan.textContent = dueño;

      if (dueño === 'Libre') {
        sectorEl.style.backgroundColor = '#ffffff';
        sectorEl.style.color = '#333';
        indicadorEl.textContent = '🏁 Sector Libre';
      } else {
        // Colorizar sector según el dueño (carrera)
        const color = obtenerColorCarrera(dueño);
        sectorEl.style.backgroundColor = color;
        // Cambiar color de fuente según brillo básico
        sectorEl.style.color = '#ffffff';
        indicadorEl.textContent = `🛡️ Dominado por ${dueño}`;
      }
    }
  });
}

// --- ESCUCHAR EVENTOS DE SOCKET.IO ---

// Estado actual completo al conectarse
socket.on('estado_actual', (estado) => {
  console.log('Estado actual del servidor recibido:', estado);
  
  if (estado.pin) {
    pinJuegoEl.textContent = estado.pin;
    generarCodigoQR(estado.pin);
  }
  
  contadorUsuariosEl.textContent = estado.usuariosConectados || 0;
  tiempoGlobalEl.textContent = formatearTiempo(estado.tiempoGlobal);
  tiempoRondaEl.textContent = `${estado.rondaTiempoRestante}s`;

  if (estado.carreras && estado.carreras.length > 0) {
    inicializarListaVotos(estado.carreras);
  }

  if (estado.mapa) {
    actualizarMapaUI(estado.mapa);
  }

  // Si se conecta a una partida ya iniciada
  if (estado.estadoJuego === 'jugando') {
    pantallaFinalEl.classList.remove('activa');
    if (estado.preguntaEnCurso) {
      sectorAtacadoInfoEl.innerHTML = `⚠️ ¡El <strong>${estado.mapa[estado.sectorEnCurso].nombre}</strong> está bajo ataque!`;
      const sectorBloque = document.getElementById(estado.sectorEnCurso);
      if (sectorBloque) sectorBloque.classList.add('atacado');
    }
  } else if (estado.estadoJuego === 'finalizado') {
    sectorAtacadoInfoEl.textContent = 'Partida terminada.';
  }
});

// Partida creada (Nuevo PIN generado)
socket.on('partida_creada', ({ pin }) => {
  console.log('Partida creada. PIN:', pin);
  pinJuegoEl.textContent = pin;
  generarCodigoQR(pin);
  pantallaFinalEl.classList.remove('activa');
  listaPodioEl.innerHTML = '';
});

// Carreras configuradas
socket.on('carreras_actualizadas', (carreras) => {
  console.log('Lista de carreras actualizada:', carreras);
  inicializarListaVotos(carreras);
});

// Actualización en vivo de jugadores conectados
socket.on('usuarios_conectados_actualizacion', (cantidad) => {
  contadorUsuariosEl.textContent = cantidad;
});

// Actualización del cronómetro global
socket.on('tiempo_global_actualizacion', (segundos) => {
  tiempoGlobalEl.textContent = formatearTiempo(segundos);
});

// Inicio oficial del juego
socket.on('juego_iniciado', ({ tiempoGlobal, mapa, carreras }) => {
  console.log('¡Juego iniciado!');
  pantallaFinalEl.classList.remove('activa');
  tiempoGlobalEl.textContent = formatearTiempo(tiempoGlobal);
  actualizarMapaUI(mapa);
  inicializarListaVotos(carreras);
  sectorAtacadoInfoEl.textContent = '¡El juego ha iniciado! Esperando ataque del expositor...';
});

// Una nueva pregunta ha sido lanzada
socket.on('pregunta_lanzada', ({ pregunta, sectorId, sectorNombre, tiempoRonda, marcadorRonda }) => {
  console.log(`Pregunta lanzada en sector ${sectorId}: ${pregunta.texto}`);
  
  // Limpiar clases "atacado" de todos los sectores y añadirla al sector atacado actual
  document.querySelectorAll('.sector-bloque').forEach(el => el.classList.remove('atacado'));
  
  const sectorBloque = document.getElementById(sectorId);
  if (sectorBloque) {
    sectorBloque.classList.add('atacado');
  }

  sectorAtacadoInfoEl.innerHTML = `⚠️ ¡El <strong>${sectorNombre}</strong> está bajo ataque con una pregunta de <strong>${pregunta.tiempo}s</strong>!`;
  tiempoRondaEl.textContent = `${tiempoRonda}s`;
  
  // Resetear contadores de votos mostrados
  inicializarListaVotos(Object.keys(marcadorRonda), marcadorRonda);
});

// Actualización del segundero de la pregunta en curso
socket.on('tiempo_ronda_actualizacion', (segundos) => {
  tiempoRondaEl.textContent = `${segundos}s`;
});

// Recepción en tiempo real de los aciertos por carrera en la ronda activa
socket.on('votos_ronda_actualizados', (marcadorRonda) => {
  Object.keys(marcadorRonda).forEach(carrera => {
    const votosSpan = document.getElementById(`votos-${carrera}`);
    if (votosSpan) {
      votosSpan.textContent = `${marcadorRonda[carrera]} aciertos`;
    }
  });
});

// Cierre de la ronda: anuncia ganador territorial y actualiza mapa
socket.on('ronda_terminada', ({ sectorId, sectorNombre, dueño, dueñoPrevio, marcadorFinalRonda, maxAciertos, hayEmpate, mapa }) => {
  console.log('Ronda finalizada en sector:', sectorId, 'Dueño:', dueño);
  
  // Quitar la animación de alerta del mapa
  document.querySelectorAll('.sector-bloque').forEach(el => el.classList.remove('atacado'));
  
  // Actualizar el mapa
  actualizarMapaUI(mapa);

  // Mostrar mensaje resumen de la batalla del sector
  if (maxAciertos === 0) {
    sectorAtacadoInfoEl.innerHTML = `⌛ Ronda cerrada en <strong>${sectorNombre}</strong>. Ninguna carrera obtuvo respuestas correctas. Sigue Libre.`;
  } else if (hayEmpate) {
    sectorAtacadoInfoEl.innerHTML = `⚔️ Ronda de Empate en <strong>${sectorNombre}</strong> con ${maxAciertos} aciertos. El territorio no cambia de dueño.`;
  } else {
    sectorAtacadoInfoEl.innerHTML = `🚩 ¡<strong>${dueño}</strong> ha conquistado el <strong>${sectorNombre}</strong> con ${maxAciertos} aciertos!`;
  }

  // Refrescar lista de marcadores con los valores finales
  Object.keys(marcadorFinalRonda).forEach(carrera => {
    const votosSpan = document.getElementById(`votos-${carrera}`);
    if (votosSpan) {
      votosSpan.textContent = `${marcadorFinalRonda[carrera]} aciertos (final)`;
    }
  });

  tiempoRondaEl.textContent = '0s';
});

// Finalización total del juego y cálculo del podio de ganadores
socket.on('juego_finalizado', ({ mapa, podio }) => {
  console.log('Juego finalizado. Podio:', podio);
  
  // Limpiar temporizadores visuales
  tiempoRondaEl.textContent = '0s';
  sectorAtacadoInfoEl.innerHTML = '🎮 <strong>¡El juego ha concluido!</strong>';
  
  // Actualizar mapa una última vez
  actualizarMapaUI(mapa);

  // Construir podio
  listaPodioEl.innerHTML = '';
  podio.forEach((item, index) => {
    const div = document.createElement('div');
    
    let clasePodio = 'podio-otro';
    let icono = '🎖️';
    
    if (index === 0) {
      clasePodio = 'podio-1';
      icono = '🥇';
    } else if (index === 1) {
      clasePodio = 'podio-2';
      icono = '🥈';
    } else if (index === 2) {
      clasePodio = 'podio-3';
      icono = '🥉';
    }

    div.className = `podio-item ${clasePodio}`;
    div.innerHTML = `
      <span>${icono} ${index + 1}° Lugar: ${item.carrera}</span>
      <span>${item.sectoresDominados} Sectores Dominados</span>
    `;
    listaPodioEl.appendChild(div);
  });

  // Mostrar la pantalla final
  pantallaFinalEl.classList.add('activa');
  window.scrollTo({ top: pantallaFinalEl.offsetTop, behavior: 'smooth' });
});
