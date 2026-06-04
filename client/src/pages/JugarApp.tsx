import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { StarField } from '../components/StarField';
import { Home, Trophy, Shield, Star, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

// Paleta de colores de facultad
const FACULTY_COLORS: Record<string, string> = {
  MEDICINA: 'text-green-400',
  DERECHO: 'text-purple-400',
  ARTE: 'text-orange-400',
  CIENCIAS: 'text-yellow-400',
  INGENIERÍA: 'text-cyan-400',
};

const medals = ['🥇', '🥈', '🥉'];

export default function JugarApp() {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [carrera, setCarrera] = useState('');
  const [carrerasDisponibles, setCarrerasDisponibles] = useState<string[]>([]);
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'facultad' | 'ranking' | 'logros'>('home');
  const [estadoJuego, setEstadoJuego] = useState('espera');
  const [usuariosConectados, setUsuariosConectados] = useState(0);

  // Trivia states
  const [preguntaActiva, setPreguntaActiva] = useState<{ texto: string; opciones: Record<string, string>; tiempo: number } | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [maxTiempoPregunta, setMaxTiempoPregunta] = useState(10);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Leer PIN de la URL si entra por QR
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('pin')) {
      setPin(urlParams.get('pin') || '');
    }
  }, []);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on('estado_actual', (estado) => {
      console.log('Estado actual en jugador:', estado);
      setEstadoJuego(estado.estadoJuego);
      setUsuariosConectados(estado.usuariosConectados || 0);
      
      if (estado.carreras && estado.carreras.length > 0) {
        setCarrerasDisponibles(estado.carreras);
      }
      
      // Si el juego finalizó antes de que entremos
      if (estado.estadoJuego === 'finalizado') {
        setPreguntaActiva(null);
      }
    });

    socket.on('carreras_actualizadas', (carreras) => {
      setCarrerasDisponibles(carreras);
    });

    socket.on('registro_exitoso', ({ nickname: nick, carrera: carr }) => {
      setNickname(nick);
      setCarrera(carr);
      setIsRegistered(true);
      setLoadingRegistro(false);
      setErrorRegistro(null);
    });

    socket.on('registro_error', (msg) => {
      setErrorRegistro(msg);
      setLoadingRegistro(false);
    });

    socket.on('pregunta_lanzada', ({ pregunta, tiempoRonda }) => {
      setPreguntaActiva(pregunta);
      setTiempoRestante(tiempoRonda);
      setMaxTiempoPregunta(pregunta.tiempo);
      setOpcionSeleccionada(null);
      setFeedback(null);
    });

    socket.on('tiempo_ronda_actualizacion', (segundos) => {
      setTiempoRestante(segundos);
    });

    socket.on('respuesta_recibida', ({ esCorrecta }) => {
      setFeedback(esCorrecta ? '¡Respuesta enviada! (Correcta)' : '¡Respuesta enviada! (Incorrecta)');
    });

    socket.on('ronda_terminada', () => {
      setPreguntaActiva(null);
      setOpcionSeleccionada(null);
      setFeedback(null);
    });

    socket.on('juego_finalizado', () => {
      setEstadoJuego('finalizado');
      setPreguntaActiva(null);
    });

    socket.on('usuarios_conectados_actualizacion', (cantidad) => {
      setUsuariosConectados(cantidad);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !nickname || !carrera) return;

    setLoadingRegistro(true);
    setErrorRegistro(null);
    socketRef.current?.emit('registrar_jugador', { pin, nickname, carrera });
  };

  const handleSelectOpcion = (opcion: string) => {
    if (opcionSeleccionada || !preguntaActiva) return;
    setOpcionSeleccionada(opcion);
    socketRef.current?.emit('enviar_respuesta', {
      nickname,
      carrera,
      opcionSeleccionada: opcion
    });
  };

  const getFacultyColorClass = (fac: string) => {
    const key = fac.toUpperCase();
    for (const k of Object.keys(FACULTY_COLORS)) {
      if (key.includes(k)) return FACULTY_COLORS[k];
    }
    return 'text-cyan-400';
  };

  // VISTAS DEL TAB
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex flex-col gap-4 px-4 pt-2 pb-4 h-full overflow-y-auto no-scrollbar">
            {/* Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-cyan-500 text-[#070414] rounded-xl py-2.5 px-4 text-center border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <p className="font-black text-xs tracking-widest uppercase">CONQUISTA RELÁMPAGO</p>
              <p className="font-bold text-[9px] tracking-wider opacity-90 uppercase">Modo Participante Móvil</p>
            </motion.div>

            {/* Jugador Info Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[#140e2e]/90 border border-slate-700/80 rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  🎓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-500 text-[9px] font-bold tracking-widest uppercase">Jugador</p>
                  <p className="font-black text-sm text-white truncate">{nickname}</p>
                  <p className={`text-[10px] font-black truncate uppercase tracking-wider ${getFacultyColorClass(carrera)}`}>
                    {carrera}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Battle card wait */}
            <div className="bg-[#140e2e]/80 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 flex-1">
              {estadoJuego === 'espera' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-lg text-yellow-400 animate-pulse">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm tracking-wider uppercase">Lobby de Espera</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      El expositor aún no ha iniciado la batalla. ¡Mantente atento a la pantalla principal!
                    </p>
                  </div>
                </>
              ) : estadoJuego === 'jugando' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg text-cyan-400 animate-pulse">
                    ⚔️
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm tracking-wider uppercase">Juego en Curso</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed animate-pulse">
                      ¡Batalla activa! Esperando a que el expositor lance una pregunta...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl">🏆</div>
                  <div>
                    <h3 className="text-yellow-400 font-black text-sm tracking-wider uppercase">¡Juego Concluido!</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Mira el marcador y el podio final en la pantalla del auditorio.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Connection Footer */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              <span>Conectado · {usuariosConectados} en lobby</span>
            </div>
          </div>
        );

      case 'facultad':
        return (
          <div className="flex flex-col gap-4 px-4 pt-2 pb-4 h-full overflow-y-auto no-scrollbar">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#140e2e]/90 border border-slate-800 rounded-2xl p-5 text-center relative overflow-hidden"
            >
              <div className="text-4xl mb-2">🩺</div>
              <h2 className={`font-black text-base tracking-widest uppercase ${getFacultyColorClass(carrera)}`}>
                {carrera}
              </h2>
              <p className="text-slate-500 text-[10px] tracking-wider mt-0.5">Estadísticas de Equipo</p>
              <div className="flex items-baseline justify-center gap-1.5 mt-3">
                <span className="font-mono font-black text-white text-2xl">Liderando</span>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Miembros', value: 'Activo', icon: Users, color: 'text-cyan-400' },
                { label: 'Posición', value: '1° Lugar', icon: Trophy, color: 'text-yellow-400' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#140e2e]/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  <p className="font-black text-sm text-white">{stat.value}</p>
                  <p className="text-slate-500 text-[9px] font-bold leading-tight uppercase">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#140e2e]/80 border border-slate-800 rounded-2xl p-4 mt-1">
              <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">
                Objetivo de Equipo
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                ¡Responde preguntas correctamente y a toda velocidad para conquistar sectores en el mapa y liderar el podio interfacultades!
              </p>
            </div>
          </div>
        );

      case 'ranking':
        return (
          <div className="flex flex-col gap-4 px-4 pt-2 pb-4 h-full overflow-y-auto no-scrollbar">
            <div className="text-center">
              <h2 className="text-white font-black text-sm tracking-widest uppercase">Tablero de Posiciones</h2>
              <p className="text-slate-500 text-[9px] tracking-wider mt-0.5 uppercase">Batalla en Vivo</p>
            </div>

            <div className="flex flex-col gap-2">
              {carrerasDisponibles.map((team, idx) => {
                const color = getFacultyColorClass(team);
                return (
                  <motion.div
                    key={team}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-950/40 border-slate-800/80`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-400 flex-shrink-0">
                        {idx < 3 ? medals[idx] : idx + 1}
                      </div>
                      <span className={`font-black tracking-wide text-xs truncate ${color}`}>
                        {team}
                      </span>
                    </div>
                    {team === carrera && (
                      <span className="text-[8px] font-black bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full uppercase">
                        TÚ
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case 'logros':
        return (
          <div className="flex flex-col gap-3 px-4 pt-2 pb-4 h-full overflow-y-auto no-scrollbar">
            <div className="bg-[#140e2e]/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-around text-center">
              <div>
                <p className="font-black text-white text-lg">3</p>
                <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Logros</p>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <p className="font-black text-yellow-400 text-lg">100%</p>
                <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Compromiso</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { id: 1, title: 'Bautismo de Fuego', desc: 'Únete a tu primera partida', emoji: '⚔️', earned: true },
                { id: 2, title: 'Lealtad de Facultad', desc: 'Defiende tu carrera', emoji: '🛡️', earned: true },
                { id: 3, title: 'Velocidad Luz', desc: 'Responde a tiempo', emoji: '⚡', earned: true },
              ].map((ach) => (
                <div key={ach.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-[#140e2e]/40">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                    {ach.emoji}
                  </div>
                  <div>
                    <p className="text-white font-black text-xs">{ach.title}</p>
                    <p className="text-slate-400 text-[9px]">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#05030f] flex items-center justify-center p-2 sm:p-4 relative">
      <StarField />

      {/* Mockup Mobile Shell */}
      <div className="relative w-full max-w-[340px] h-[680px] bg-[#0b071e] rounded-[48px] border-[4px] border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.05)] overflow-hidden flex flex-col z-10">
        
        {/* Notch */}
        <div className="flex justify-center pt-2.5 pb-1.5 flex-shrink-0 bg-[#05030f] relative z-20">
          <div className="w-24 h-5.5 bg-black rounded-full flex items-center justify-center gap-1.5 p-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <div className="w-6 h-1 bg-slate-900 rounded-full" />
          </div>
        </div>

        {/* Screen Content Wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!isRegistered ? (
              /* REGISTRATION SCREEN */
              <motion.div
                key="registro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-center px-6"
              >
                <form onSubmit={handleRegister} className="flex flex-col gap-4 bg-[#140e2e]/80 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
                  <div className="text-center mb-1">
                    <h2 className="text-white font-black text-base tracking-widest uppercase">Conquista Relámpago</h2>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Ingreso de Participante</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="pin" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      PIN de Acceso
                    </label>
                    <input
                      type="text"
                      id="pin"
                      required
                      placeholder="Ej: 1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-sm text-center font-mono font-black text-yellow-400 uppercase tracking-widest outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="nickname" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Nickname / Alias
                    </label>
                    <input
                      type="text"
                      id="nickname"
                      required
                      maxLength={15}
                      placeholder="Tu apodo"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="carrera" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Carrera / Equipo
                    </label>
                    <select
                      id="carrera"
                      required
                      value={carrera}
                      onChange={(e) => setCarrera(e.target.value)}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="" disabled>Selecciona carrera...</option>
                      {carrerasDisponibles.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {carrerasDisponibles.length === 0 && (
                        <option disabled>Esperando carreras...</option>
                      )}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingRegistro}
                    className="bg-cyan-500 text-slate-950 font-black text-xs tracking-widest uppercase rounded-xl py-3 mt-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 hover:bg-cyan-400 active:scale-95 transition-all"
                  >
                    {loadingRegistro ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>UNIÉNDOSE...</span>
                      </>
                    ) : (
                      <span>UNIRSE A LA BATALLA</span>
                    )}
                  </button>

                  {errorRegistro && (
                    <p className="text-red-400 text-center font-bold text-[9px] uppercase tracking-wider">
                      {errorRegistro}
                    </p>
                  )}
                </form>
              </motion.div>
            ) : preguntaActiva ? (
              /* ACTIVE QUESTION SCREEN */
              <motion.div
                key="pregunta"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col px-4 py-4 gap-4 justify-between"
              >
                {/* Question Info Header */}
                <div className="flex justify-between items-center bg-[#140e2e]/80 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Pregunta Activa</span>
                  
                  {/* Timer Ring */}
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" fill="none" stroke="#1e293b" strokeWidth="2" />
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="13" 
                        fill="none" 
                        stroke={tiempoRestante > 5 ? '#06b6d4' : '#ef4444'} 
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 13}`}
                        strokeDashoffset={`${2 * Math.PI * 13 * (1 - (tiempoRestante / maxTiempoPregunta))}`}
                        strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono font-black text-[10px]">
                        {tiempoRestante}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question card */}
                <div className="bg-[#140e2e]/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-center min-h-[140px] text-center">
                  <p className="text-white font-black text-sm leading-relaxed">
                    {preguntaActiva.texto}
                  </p>
                </div>

                {/* Answers buttons grid */}
                <div className="flex flex-col gap-2.5">
                  {Object.entries(preguntaActiva.opciones).map(([key, value]) => {
                    const isSelected = opcionSeleccionada === key;
                    let style = 'bg-[#140e2e]/60 border-slate-800 text-slate-300';
                    if (isSelected) {
                      style = 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]';
                    } else if (opcionSeleccionada !== null) {
                      style = 'bg-slate-950/20 border-slate-900 text-slate-500 opacity-60';
                    }

                    return (
                      <button
                        key={key}
                        disabled={opcionSeleccionada !== null}
                        onClick={() => handleSelectOpcion(key)}
                        className={`w-full text-left px-4 py-3 rounded-xl border font-bold text-xs flex gap-2.5 items-center transition-all ${style} active:scale-[0.98]`}
                      >
                        <span className="font-mono font-black text-cyan-400/80">{key}.</span>
                        <span className="truncate">{value}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback overlay */}
                {feedback && (
                  <div className="bg-[#140e2e]/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-cyan-400 animate-pulse">
                    {feedback}
                  </div>
                )}
              </motion.div>
            ) : (
              /* TABBED INTERFACE (HOME, FACULTAD, RANKING, LOGROS) */
              <motion.div
                key="tabs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-[#05030f]/60 backdrop-blur-sm relative z-10 flex-shrink-0">
                  <span className="font-black text-cyan-400 tracking-widest text-[10px] uppercase">
                    Conquista Relámpago
                  </span>
                  <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[8px] font-black text-green-400 tracking-wider uppercase">Defendiendo</span>
                  </div>
                </div>

                {/* Active Tab Screen */}
                <div className="flex-1 overflow-hidden relative">
                  {renderTabContent()}
                </div>

                {/* Bottom Navigation Bar */}
                <div className="border-t border-slate-900/80 bg-[#0b071e]/95 backdrop-blur-sm px-2 pt-2.5 pb-4 flex-shrink-0">
                  <div className="flex">
                    {[
                      { id: 'home', label: 'Inicio', Icon: Home },
                      { id: 'facultad', label: 'Facultad', Icon: Shield },
                      { id: 'ranking', label: 'Ranking', Icon: Trophy },
                      { id: 'logros', label: 'Logros', Icon: Star },
                    ].map(({ id, label, Icon }) => {
                      const active = activeTab === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id as any)}
                          className="flex-1 flex flex-col items-center gap-1.5 py-1 transition-opacity active:opacity-60"
                        >
                          <div className={`relative p-1 rounded-lg transition-all duration-200 ${active ? 'bg-cyan-500/10' : ''}`}>
                            <Icon className={`w-4.5 h-4.5 transition-colors duration-200 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                          </div>
                          <span className={`text-[8px] font-black tracking-wider uppercase transition-colors duration-200 ${active ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
