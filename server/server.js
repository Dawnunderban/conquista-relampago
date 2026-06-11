const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir conexiones externas (útil si el cliente se aloja en Vercel)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

// Servir archivos estáticos del frontend para facilitar pruebas locales e integración
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Estado global en memoria para "Conquista Relámpago"
let gameState = {
  pin: null,
  carreras: [], // Nombres de las carreras configuradas (min 2, max 6)
  preguntas: [], // Banco de preguntas
  preguntaActualIndex: -1,
  mapa: {
    "MEDICINA": { nombre: "Sector Medicina", dueño: "Libre" },
    "DERECHO": { nombre: "Sector Derecho", dueño: "Libre" },
    "ARTE": { nombre: "Sector Arte", dueño: "Libre" },
    "CIENCIAS": { nombre: "Sector Ciencias", dueño: "Libre" },
    "INGENIERÍA": { nombre: "Sector Ingeniería", dueño: "Libre" }
  },
  jugadores: {}, // socket.id -> { nickname, carrera }
  marcadorRonda: {}, // carrera -> número de respuestas correctas en la ronda
  estadoJuego: "espera", // "espera", "jugando", "finalizado"
  tiempoGlobal: 1200, // 20 minutos en segundos
  intervalIdGlobal: null,
  rondaTiempoRestante: 0,
  rondaIntervalId: null,
  preguntaEnCurso: null,
  sectorEnCurso: null
};

// ══════════════════════════════════════════════════════════════════════
//  PREGUNTAS DE PRUEBA — solo para desarrollo/demo.
//  Para activarlas durante una prueba rápida, descomenta la línea
//  "gameState.preguntas = PREGUNTAS_PRUEBA;" que está justo debajo.
// ══════════════════════════════════════════════════════════════════════
const PREGUNTAS_PRUEBA = [
  {
    texto: '¿Cuántos continentes hay en el planeta Tierra?',
    opciones: { A: '5', B: '6', C: '7', D: '8' },
    correcta: 'C',
    tiempo: 20,
    sector: 'CIENCIAS'
  },
  {
    texto: '¿En qué año llegó el hombre a la Luna por primera vez?',
    opciones: { A: '1965', B: '1969', C: '1972', D: '1975' },
    correcta: 'B',
    tiempo: 20,
    sector: 'INGENIERÍA'
  },
  {
    texto: '¿Cuál es el elemento más abundante en la corteza terrestre?',
    opciones: { A: 'Hierro', B: 'Silicio', C: 'Oxígeno', D: 'Aluminio' },
    correcta: 'C',
    tiempo: 20,
    sector: 'CIENCIAS'
  },
  {
    texto: '¿Quién pintó la Mona Lisa?',
    opciones: { A: 'Miguel Ángel', B: 'Rafael', C: 'Leonardo da Vinci', D: 'Botticelli' },
    correcta: 'C',
    tiempo: 20,
    sector: 'ARTE'
  },
  {
    texto: '¿Cuántos huesos tiene el cuerpo humano adulto?',
    opciones: { A: '186', B: '196', C: '206', D: '216' },
    correcta: 'C',
    tiempo: 20,
    sector: 'MEDICINA'
  }
];
// ── Para activar las preguntas de prueba, descomenta la siguiente línea: ──
// gameState.preguntas = PREGUNTAS_PRUEBA;

// Generar un PIN aleatorio de 4 dígitos
function generarPIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Limpiar estados y temporizadores globales
function limpiarTemporizadores() {
  if (gameState.intervalIdGlobal) {
    clearInterval(gameState.intervalIdGlobal);
    gameState.intervalIdGlobal = null;
  }
  if (gameState.rondaIntervalId) {
    clearInterval(gameState.rondaIntervalId);
    gameState.rondaIntervalId = null;
  }
}

function resetEstadoCompleto() {
  limpiarTemporizadores();
  gameState.pin = null;
  gameState.carreras = [];
  gameState.preguntas = [];
  gameState.preguntaActualIndex = -1;
  gameState.mapa = {
    "MEDICINA": { nombre: "Sector Medicina", dueño: "Libre" },
    "DERECHO": { nombre: "Sector Derecho", dueño: "Libre" },
    "ARTE": { nombre: "Sector Arte", dueño: "Libre" },
    "CIENCIAS": { nombre: "Sector Ciencias", dueño: "Libre" },
    "INGENIERÍA": { nombre: "Sector Ingeniería", dueño: "Libre" }
  };
  gameState.jugadores = {};
  gameState.marcadorRonda = {};
  gameState.estadoJuego = "espera";
  gameState.tiempoGlobal = 1200;
  gameState.rondaTiempoRestante = 0;
  gameState.preguntaEnCurso = null;
  gameState.sectorEnCurso = null;
}

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`Nuevo cliente conectado: ${socket.id}`);

  // Enviar estado actual al cliente que recién se conecta
  socket.emit('estado_actual', {
    pin: gameState.pin,
    carreras: gameState.carreras,
    estadoJuego: gameState.estadoJuego,
    mapa: gameState.mapa,
    tiempoGlobal: gameState.tiempoGlobal,
    preguntaEnCurso: gameState.preguntaEnCurso,
    rondaTiempoRestante: gameState.rondaTiempoRestante,
    sectorEnCurso: gameState.sectorEnCurso,
    usuariosConectados: Object.keys(gameState.jugadores).length
  });

  // --- EVENTOS DEL ADMINISTRADOR ---

  // 'crear_partida': Inicializa el juego y genera el PIN
  socket.on('crear_partida', () => {
    resetEstadoCompleto();
    gameState.pin = generarPIN();
    console.log(`Partida creada con éxito. PIN: ${gameState.pin}`);
    
    socket.emit('partida_creada', { pin: gameState.pin });
    io.emit('estado_actual', {
      pin: gameState.pin,
      carreras: gameState.carreras,
      estadoJuego: gameState.estadoJuego,
      mapa: gameState.mapa,
      tiempoGlobal: gameState.tiempoGlobal,
      usuariosConectados: 0
    });
  });

  // 'configurar_carreras': Recibe el array de carreras autorizadas (de 2 a 6)
  socket.on('configurar_carreras', (carrerasRecibidas) => {
    if (!Array.isArray(carrerasRecibidas) || carrerasRecibidas.length < 2 || carrerasRecibidas.length > 6) {
      return socket.emit('error_servidor', 'Debe haber entre 2 y 6 carreras autorizadas.');
    }
    gameState.carreras = carrerasRecibidas;
    // Inicializar marcadores de ronda para cada carrera
    gameState.marcadorRonda = {};
    gameState.carreras.forEach(c => {
      gameState.marcadorRonda[c] = 0;
    });
    console.log(`Carreras configuradas: ${gameState.carreras.join(', ')}`);
    io.emit('carreras_actualizadas', gameState.carreras);
  });

  // 'guardar_pregunta': Almacena una pregunta en el servidor
  socket.on('guardar_pregunta', (nuevaPregunta) => {
    // Validar pregunta
    if (!nuevaPregunta.texto || !nuevaPregunta.opciones || !nuevaPregunta.correcta || !nuevaPregunta.tiempo || !nuevaPregunta.sector) {
      return socket.emit('error_servidor', 'Pregunta inválida o incompleta.');
    }
    gameState.preguntas.push(nuevaPregunta);
    console.log(`Pregunta añadida. Total preguntas: ${gameState.preguntas.length}`);
    socket.emit('pregunta_guardada', { total: gameState.preguntas.length });
  });

  // 'iniciar_juego': Dispara el cronómetro global de 20 minutos
  socket.on('iniciar_juego', () => {
    if (gameState.estadoJuego !== "espera") {
      return socket.emit('error_servidor', 'El juego ya está en curso o finalizado.');
    }
    if (gameState.carreras.length < 2) {
      return socket.emit('error_servidor', 'Configure las carreras antes de iniciar el juego.');
    }
    
    gameState.estadoJuego = "jugando";
    gameState.tiempoGlobal = 1200; // 20 minutos

    // Cronómetro global activo en el servidor
    gameState.intervalIdGlobal = setInterval(() => {
      if (gameState.tiempoGlobal > 0) {
        gameState.tiempoGlobal--;
        io.emit('tiempo_global_actualizacion', gameState.tiempoGlobal);
      } else {
        clearInterval(gameState.intervalIdGlobal);
        gameState.intervalIdGlobal = null;
        forzarFinalizacionJuego();
      }
    }, 1000);

    console.log("¡El juego de Conquista Relámpago ha comenzado!");
    io.emit('juego_iniciado', {
      tiempoGlobal: gameState.tiempoGlobal,
      mapa: gameState.mapa,
      carreras: gameState.carreras
    });
  });

  // 'lanzar_pregunta': Envía los datos de la pregunta seleccionada a los móviles
  socket.on('lanzar_pregunta', ({ preguntaIndex, sectorId }) => {
    if (gameState.estadoJuego !== "jugando") {
      return socket.emit('error_servidor', 'El juego no está activo.');
    }
    if (gameState.rondaIntervalId) {
      clearInterval(gameState.rondaIntervalId);
    }

    const pregunta = gameState.preguntas[preguntaIndex];
    if (!pregunta) {
      return socket.emit('error_servidor', 'Índice de pregunta no válido.');
    }

    // Asegurar que el sector exista en nuestro mapa
    if (!gameState.mapa[sectorId]) {
      return socket.emit('error_servidor', 'Sector no válido.');
    }

    gameState.preguntaActualIndex = preguntaIndex;
    gameState.preguntaEnCurso = {
      texto: pregunta.texto,
      opciones: pregunta.opciones,
      tiempo: pregunta.tiempo,
      sectorId: sectorId
    };
    gameState.sectorEnCurso = sectorId;
    gameState.rondaTiempoRestante = parseInt(pregunta.tiempo);

    // Resetear marcador de ronda
    gameState.carreras.forEach(c => {
      gameState.marcadorRonda[c] = 0;
    });

    // Avisar a todos los clientes que la ronda de pregunta ha iniciado
    io.emit('pregunta_lanzada', {
      pregunta: {
        texto: pregunta.texto,
        opciones: pregunta.opciones,
        tiempo: pregunta.tiempo
      },
      sectorId: sectorId,
      sectorNombre: gameState.mapa[sectorId].nombre,
      tiempoRonda: gameState.rondaTiempoRestante,
      marcadorRonda: gameState.marcadorRonda
    });

    // Cronómetro de la ronda
    gameState.rondaIntervalId = setInterval(() => {
      if (gameState.rondaTiempoRestante > 0) {
        gameState.rondaTiempoRestante--;
        io.emit('tiempo_ronda_actualizacion', gameState.rondaTiempoRestante);
      } else {
        clearInterval(gameState.rondaIntervalId);
        gameState.rondaIntervalId = null;
        cerrarRondaInterno();
      }
    }, 1000);

    console.log(`Pregunta lanzada atacando al sector ${sectorId}. Tiempo: ${pregunta.tiempo}s`);
  });

  // 'terminar_ronda' (Cierre manual del Administrador o forzado)
  socket.on('terminar_ronda', () => {
    if (gameState.estadoJuego !== "jugando" || !gameState.preguntaEnCurso) {
      return socket.emit('error_servidor', 'No hay ninguna ronda en curso para finalizar.');
    }
    if (gameState.rondaIntervalId) {
      clearInterval(gameState.rondaIntervalId);
      gameState.rondaIntervalId = null;
    }
    cerrarRondaInterno();
  });

  // 'finalizar_juego': Cierre forzado del Administrador o por tiempo
  socket.on('finalizar_juego', () => {
    forzarFinalizacionJuego();
  });


  // --- EVENTOS DE LOS JUGADORES (MÓVILES) ---

  // 'registrar_jugador': Vincula al alumno a la partida por PIN
  socket.on('registrar_jugador', ({ pin, nickname, carrera }) => {
    if (pin !== gameState.pin) {
      return socket.emit('registro_error', 'PIN de la partida incorrecto.');
    }
    if (!nickname || nickname.trim() === '') {
      return socket.emit('registro_error', 'Debe especificar un Nickname válido.');
    }
    if (!gameState.carreras.includes(carrera)) {
      return socket.emit('registro_error', 'La carrera seleccionada no es válida.');
    }

    // Registrar jugador en la estructura
    gameState.jugadores[socket.id] = { nickname, carrera };
    console.log(`Jugador registrado: ${nickname} (${carrera})`);

    socket.emit('registro_exitoso', { nickname, carrera });
    
    // Notificar al auditorio y administrador de la actualización de conexiones
    io.emit('usuarios_conectados_actualizacion', Object.keys(gameState.jugadores).length);
  });

  // 'enviar_respuesta': Procesa la opción seleccionada por el estudiante
  socket.on('enviar_respuesta', ({ nickname, carrera, opcionSeleccionada }) => {
    if (gameState.estadoJuego !== "jugando" || !gameState.preguntaEnCurso) {
      return socket.emit('respuesta_error', 'No hay ninguna ronda activa de respuestas.');
    }

    // Verificar si el jugador actual coincide
    const jugador = gameState.jugadores[socket.id];
    const carreraJugador = jugador ? jugador.carrera : carrera;
    
    // Verificar si la respuesta es correcta
    const preguntaActual = gameState.preguntas[gameState.preguntaActualIndex];
    let esCorrecta = false;
    if (preguntaActual && opcionSeleccionada === preguntaActual.correcta) {
      esCorrecta = true;
      if (gameState.marcadorRonda[carreraJugador] !== undefined) {
        gameState.marcadorRonda[carreraJugador]++;
      }
    }

    console.log(`Respuesta recibida de ${nickname} (${carreraJugador}): ${opcionSeleccionada}. Correcta: ${esCorrecta}`);

    // Emitir inmediatamente al auditorio/admin para que vean los marcadores subir en vivo
    io.emit('votos_ronda_actualizados', gameState.marcadorRonda);

    // Dar retroalimentación de "recibido" al móvil
    socket.emit('respuesta_recibida', { esCorrecta });
  });

  // --- DESCONEXIÓN ---
  socket.on('disconnect', () => {
    if (gameState.jugadores[socket.id]) {
      const p = gameState.jugadores[socket.id];
      console.log(`Jugador desconectado: ${p.nickname} (${p.carrera})`);
      delete gameState.jugadores[socket.id];
      io.emit('usuarios_conectados_actualizacion', Object.keys(gameState.jugadores).length);
    } else {
      console.log(`Cliente desconectado: ${socket.id}`);
    }
  });
});

// --- FUNCIONES INTERNAS DE FLUJO ---

// Terminar ronda internamente: calcula ganadores de territorio
function cerrarRondaInterno() {
  const sector = gameState.sectorEnCurso;
  const marcador = { ...gameState.marcadorRonda };
  
  let carreraGanadora = null;
  let maxAciertos = 0;
  let hayEmpate = false;

  // Determinar carrera con mayor aciertos en esta ronda
  Object.keys(marcador).forEach(carrera => {
    const aciertos = marcador[carrera];
    if (aciertos > maxAciertos) {
      maxAciertos = aciertos;
      carreraGanadora = carrera;
      hayEmpate = false;
    } else if (aciertos === maxAciertos && aciertos > 0) {
      hayEmpate = true;
    }
  });

  // Actualizar dueño del sector si hubo respuestas correctas y no hay empate
  let resultadoDueño = gameState.mapa[sector].dueño;
  if (maxAciertos > 0 && !hayEmpate) {
    resultadoDueño = carreraGanadora;
    gameState.mapa[sector].dueño = carreraGanadora;
  }

  console.log(`Ronda terminada en sector ${sector}. Ganador de la ronda: ${carreraGanadora} con ${maxAciertos} aciertos. Empate: ${hayEmpate}. Dueño final del sector: ${resultadoDueño}`);

  io.emit('ronda_terminada', {
    sectorId: sector,
    sectorNombre: gameState.mapa[sector].nombre,
    dueño: resultadoDueño,
    marcadorFinalRonda: marcador,
    maxAciertos: maxAciertos,
    hayEmpate: hayEmpate,
    mapa: gameState.mapa
  });

  // Resetear estados temporales de ronda en servidor
  gameState.preguntaEnCurso = null;
  gameState.sectorEnCurso = null;
}

// Finaliza el juego calculando el podio final
function forzarFinalizacionJuego() {
  limpiarTemporizadores();
  gameState.estadoJuego = "finalizado";

  // Calcular podio
  // Contar cuántos sectores del mapa domina cada carrera
  const conteoTerritorios = {};
  gameState.carreras.forEach(c => {
    conteoTerritorios[c] = 0;
  });

  Object.keys(gameState.mapa).forEach(sectorKey => {
    const dueño = gameState.mapa[sectorKey].dueño;
    if (dueño !== "Libre" && conteoTerritorios[dueño] !== undefined) {
      conteoTerritorios[dueño]++;
    }
  });

  // Construir podio ordenando descendentemente por sectores ganados
  const podio = Object.keys(conteoTerritorios).map(carrera => {
    return {
      carrera: carrera,
      sectoresDominados: conteoTerritorios[carrera]
    };
  }).sort((a, b) => b.sectoresDominados - a.sectoresDominados);

  console.log("¡Partida finalizada con éxito! Podio final:", podio);

  io.emit('juego_finalizado', {
    mapa: gameState.mapa,
    podio: podio
  });
}

// Arrancar el servidor
server.listen(PORT, () => {
  console.log(`Servidor de Conquista Relámpago corriendo en http://localhost:${PORT}`);
});
