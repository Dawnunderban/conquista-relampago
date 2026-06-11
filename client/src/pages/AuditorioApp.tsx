import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { StarField } from '../components/StarField';
import { Zap, Users, Trophy, QrCode } from 'lucide-react';

// Territory map — 5 polygon regions in board-game style.
// Borders meet at center (245,245). Each sector has baseColor and darkColor for gradients.
const SECTORES = [
  {
    key: 'MEDICINA',
    label: 'Medicina',
    emoji: '🩺',
    color: '#10b981',
    dark: '#065f46',
    freeColor: '#6ee7b7',
    points: '0,0 490,0 490,125 310,195 245,245 180,195 0,125',
    labelX: 245,
    labelY: 65,
  },
  {
    key: 'DERECHO',
    label: 'Derecho',
    emoji: '⚖️',
    color: '#a855f7',
    dark: '#6b21a8',
    freeColor: '#d8b4fe',
    points: '0,125 180,195 245,245 175,320 0,360',
    labelX: 72,
    labelY: 245,
  },
  {
    key: 'ARTE',
    label: 'Arte',
    emoji: '🎨',
    color: '#f97316',
    dark: '#9a3412',
    freeColor: '#fdba74',
    points: '0,360 175,320 245,245 195,358 100,490 0,490',
    labelX: 82,
    labelY: 422,
  },
  {
    key: 'CIENCIAS',
    label: 'Ciencias',
    emoji: '🔬',
    color: '#eab308',
    dark: '#854d0e',
    freeColor: '#fde047',
    points: '100,490 195,358 245,245 315,320 390,490',
    labelX: 248,
    labelY: 438,
  },
  {
    key: 'INGENIERÍA',
    label: 'Ingeniería',
    emoji: '⚙️',
    color: '#06b6d4',
    dark: '#164e63',
    freeColor: '#67e8f9',
    points: '390,490 315,320 245,245 310,195 490,125 490,490',
    labelX: 420,
    labelY: 308,
  },
];

const PALETTE = ['#2563eb', '#16a34a', '#0284c7', '#059669', '#3b82f6', '#10b981', '#0d9488'];

function obtenerColorCarrera(carrera: string, carrerasConfiguradas: string[]) {
  const key = carrera.toUpperCase();
  if (key === 'MEDICINA') return '#10b981';
  if (key === 'DERECHO') return '#d946ef';
  if (key === 'ARTE') return '#f97316';
  if (key === 'CIENCIAS') return '#eab308';
  if (key === 'INGENIERÍA') return '#06b6d4';

  const index = carrerasConfiguradas.indexOf(carrera);
  if (index !== -1) {
    return PALETTE[index % PALETTE.length];
  }
  return '#64748b';
}

const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

export default function AuditorioApp() {
  const [pin, setPin] = useState('----');
  const [usuariosConectados, setUsuariosConectados] = useState(0);
  const [tiempoGlobal, setTiempoGlobal] = useState(1200);
  const [tiempoRonda, setTiempoRonda] = useState(0);
  const [maxTiempoRonda, setMaxTiempoRonda] = useState(20);
  const [estadoJuego, setEstadoJuego] = useState('espera');
  
  const [mapa, setMapa] = useState<Record<string, { nombre: string; dueño: string }>>({
    "MEDICINA": { nombre: "Sector Medicina", dueño: "Libre" },
    "DERECHO": { nombre: "Sector Derecho", dueño: "Libre" },
    "ARTE": { nombre: "Sector Arte", dueño: "Libre" },
    "CIENCIAS": { nombre: "Sector Ciencias", dueño: "Libre" },
    "INGENIERÍA": { nombre: "Sector Ingeniería", dueño: "Libre" }
  });
  
  const [carreras, setCarreras] = useState<string[]>([]);
  const [marcadorRonda, setMarcadorRonda] = useState<Record<string, number>>({});
  const [preguntaEnCurso, setPreguntaEnCurso] = useState<{ texto: string; tiempo: number } | null>(null);
  const [sectorEnCurso, setSectorEnCurso] = useState<string | null>(null);
  const [rondaResumen, setRondaResumen] = useState<string>('');
  const [podio, setPodio] = useState<{ carrera: string; sectoresDominados: number }[]>([]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on('estado_actual', (estado) => {
      console.log('Estado actual recibido:', estado);
      if (estado.pin) setPin(estado.pin);
      setUsuariosConectados(estado.usuariosConectados || 0);
      setTiempoGlobal(estado.tiempoGlobal);
      setTiempoRonda(estado.rondaTiempoRestante);
      setEstadoJuego(estado.estadoJuego);
      if (estado.mapa) setMapa(estado.mapa);
      if (estado.carreras) {
        setCarreras(estado.carreras);
        // Inicializar marcadores de ronda
        const m: Record<string, number> = {};
        estado.carreras.forEach((c: string) => {
          m[c] = 0;
        });
        setMarcadorRonda(m);
      }
      if (estado.preguntaEnCurso) {
        setPreguntaEnCurso(estado.preguntaEnCurso);
        setMaxTiempoRonda(estado.preguntaEnCurso.tiempo);
      }
      setSectorEnCurso(estado.sectorEnCurso);
    });

    socket.on('partida_creada', ({ pin }) => {
      setPin(pin);
      setEstadoJuego('espera');
      setPodio([]);
      setRondaResumen('');
      setSectorEnCurso(null);
      setPreguntaEnCurso(null);
    });

    socket.on('carreras_actualizadas', (carrerasAct) => {
      setCarreras(carrerasAct);
      const m: Record<string, number> = {};
      carrerasAct.forEach((c: string) => {
        m[c] = 0;
      });
      setMarcadorRonda(m);
    });

    socket.on('usuarios_conectados_actualizacion', (cantidad) => {
      setUsuariosConectados(cantidad);
    });

    socket.on('tiempo_global_actualizacion', (segundos) => {
      setTiempoGlobal(segundos);
    });

    socket.on('juego_iniciado', ({ tiempoGlobal: tg, mapa: m, carreras: c }) => {
      setEstadoJuego('jugando');
      setTiempoGlobal(tg);
      if (m) setMapa(m);
      if (c) setCarreras(c);
      setRondaResumen('¡La batalla interfacultades ha comenzado!');
    });

    socket.on('pregunta_lanzada', ({ pregunta, sectorId, sectorNombre, tiempoRonda: tr, marcadorRonda: mr }) => {
      setPreguntaEnCurso(pregunta);
      setSectorEnCurso(sectorId);
      setTiempoRonda(tr);
      setMaxTiempoRonda(pregunta.tiempo);
      if (mr) setMarcadorRonda(mr);
      setRondaResumen(`⚠️ ¡El ${sectorNombre} está bajo ataque!`);
    });

    socket.on('tiempo_ronda_actualizacion', (segundos) => {
      setTiempoRonda(segundos);
    });

    socket.on('votos_ronda_actualizados', (mr) => {
      if (mr) setMarcadorRonda(mr);
    });

    socket.on('ronda_terminada', ({ sectorId, sectorNombre, dueño, marcadorFinalRonda, maxAciertos, hayEmpate, mapa: m }) => {
      if (m) setMapa(m);
      if (marcadorFinalRonda) setMarcadorRonda(marcadorFinalRonda);
      
      setPreguntaEnCurso(null);
      setSectorEnCurso(null);
      setTiempoRonda(0);

      if (maxAciertos === 0) {
        setRondaResumen(`⌛ Ronda cerrada en ${sectorNombre}. Ninguna carrera obtuvo respuestas correctas.`);
      } else if (hayEmpate) {
        setRondaResumen(`⚔️ Empate en ${sectorNombre} con ${maxAciertos} aciertos. El territorio no cambia de dueño.`);
      } else {
        setRondaResumen(`🚩 ¡${dueño} conquistó el ${sectorNombre} con ${maxAciertos} aciertos!`);
      }
    });

    socket.on('juego_finalizado', ({ mapa: m, podio: p }) => {
      setEstadoJuego('finalizado');
      setTiempoRonda(0);
      setPreguntaEnCurso(null);
      setSectorEnCurso(null);
      if (m) setMapa(m);
      if (p) setPodio(p);
      setRondaResumen('🎮 ¡El juego ha concluido!');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatearTiempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const playUrl = pin !== '----' ? `${SERVER_URL}/jugar.html?pin=${pin}` : '';
  const qrCodeUrl = playUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(playUrl)}&color=22c55e&bgcolor=f1f5f9`
    : '';

  return (
    <div className="relative min-h-screen bg-white overflow-hidden flex flex-col font-sans text-slate-950 p-4 lg:p-6">
      <StarField />
      
      {/* Header */}
      <header className="relative z-10 flex flex-col sm:flex-row justify-between items-center bg-slate-50/80 border border-slate-200 rounded-2xl py-4 px-6 backdrop-blur-md mb-6 gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/unipaz.jpg" 
            alt="UNIPAZ Logo" 
            className="w-12 h-12 rounded-full border border-green-500/50 object-cover shadow-[0_0_15px_rgba(34,197,94,0.4)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black tracking-widest bg-gradient-to-r from-green-600 via-slate-900 to-blue-600 bg-clip-text text-transparent uppercase">
                Responde y Avanza
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Pantalla del Auditorio · Blitz Territorial Académico · UNIPAZ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2">
          <div className="text-center sm:text-right">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block">PIN de acceso</span>
            <span className="font-mono text-2xl lg:text-3xl font-black text-green-600 tracking-widest drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
              {pin}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Game Stats, QR, Active Round Timer */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Partida Info Card */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-md relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-500 via-transparent to-transparent pointer-events-none" />
            
            <h2 className="text-slate-500 text-xs font-bold tracking-widest uppercase border-b border-slate-200 pb-2">
              Estado de la Partida
            </h2>

            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-semibold text-slate-700">Usuarios Conectados</span>
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-green-600 font-bold text-sm">
                <Users className="w-4 h-4" />
                {usuariosConectados}
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-t border-slate-200 pt-3">
              <span className="text-sm font-semibold text-slate-700">Tiempo de Juego</span>
              <span className="font-mono text-2xl font-black text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]">
                {formatearTiempo(tiempoGlobal)}
              </span>
            </div>
          </div>

          {/* QR Code Card */}
          {estadoJuego !== 'finalizado' && (
            <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-4 backdrop-blur-md relative overflow-hidden shadow-sm">
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_center,_rgba(34,197,94,0.3),_transparent)] pointer-events-none" />
              
              <div>
                <h3 className="text-slate-900 font-black text-sm tracking-wider uppercase">¡Únete a la Batalla!</h3>
                <p className="text-[10px] text-slate-500 mt-1">Escanea con tu celular para participar</p>
              </div>

              {qrCodeUrl ? (
                <div className="p-3 bg-slate-100 border-2 border-green-500/40 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                  <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 rounded-lg" />
                </div>
              ) : (
                <div className="w-36 h-36 border border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400">
                  <QrCode className="w-10 h-10 animate-pulse" />
                </div>
              )}
              
              <span className="text-[10px] font-mono text-green-600/80 select-all break-all px-2 max-w-full truncate">
                {playUrl || 'Generando PIN de juego...'}
              </span>
            </div>
          )}

          {/* Ronda Timer Card */}
          {preguntaEnCurso && (
            <div className="bg-slate-50/90 border border-red-500/20 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-4 backdrop-blur-md relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)] animate-pulse">
              <span className="text-red-500 text-xs font-black tracking-widest uppercase">
                Tiempo de la Pregunta
              </span>
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="26" 
                    fill="none" 
                    stroke={tiempoRonda > 5 ? '#22c55e' : '#ef4444'} 
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - (tiempoRonda / maxTiempoRonda))}`}
                    strokeLinecap="round" 
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono font-black text-3xl ${tiempoRonda > 5 ? 'text-green-400' : 'text-red-400'}`}>
                    {tiempoRonda}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Center / Right Side: Map & Leaderboards */}
        <section className="lg:col-span-8 flex flex-col gap-6 justify-between">
          
          {/* Battle Log Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block mb-1">
              Registro de Actividad
            </span>
            <p className="text-sm font-black tracking-wide text-blue-600">
              {rondaResumen || 'Esperando inicio del juego...'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-stretch">
            
            {/* Map Container — Board-game style territory map */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-700 rounded-3xl p-4 flex flex-col items-center justify-center relative shadow-xl min-h-[420px] overflow-hidden">
              {/* Background grid texture */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />

              <span className="absolute top-3 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase z-10">
                ⚔ Mapa Territorial ⚔
              </span>

              <div className="relative w-full max-w-[380px] aspect-square mt-5">
                <svg
                  viewBox="0 0 490 490"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full select-none"
                >
                  <defs>
                    {/* Per-sector radial gradients */}
                    {SECTORES.map((s) => {
                      const sectorObj = mapa[s.key] || { nombre: s.label, dueño: 'Libre' };
                      const dueño = sectorObj.dueño;
                      const hasOwner = dueño !== 'Libre';
                      const fillColor = hasOwner ? obtenerColorCarrera(dueño, carreras) : s.freeColor;
                      return (
                        <radialGradient key={s.key} id={`grad-${s.key}`} cx="245" cy="245" r="300" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor={fillColor} stopOpacity="0.55" />
                          <stop offset="100%" stopColor={fillColor} stopOpacity="0.18" />
                        </radialGradient>
                      );
                    })}
                    {/* Glow filters */}
                    {SECTORES.map((s) => (
                      <filter key={s.key} id={`glow-${s.key}`} x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    ))}
                    <filter id="attack-glow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="10" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="label-shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* Dark canvas */}
                  <rect x="0" y="0" width="490" height="490" fill="#0f172a" rx="12" />

                  {/* Territory Polygons */}
                  {SECTORES.map((s) => {
                    const sectorObj = mapa[s.key] || { nombre: s.label, dueño: 'Libre' };
                    const dueño = sectorObj.dueño;
                    const hasOwner = dueño !== 'Libre';
                    const ownerColor = hasOwner ? obtenerColorCarrera(dueño, carreras) : s.color;
                    const isAttacked = sectorEnCurso === s.key;

                    return (
                      <g key={s.key}>
                        {/* Solid gradient fill */}
                        <polygon
                          points={s.points}
                          fill={`url(#grad-${s.key})`}
                          className="transition-all duration-500"
                        />
                        {/* Thick white border — board-game style */}
                        <polygon
                          points={s.points}
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          opacity="0.15"
                        />
                        {/* Colored glowing border */}
                        <polygon
                          points={s.points}
                          fill="none"
                          stroke={isAttacked ? '#fbbf24' : ownerColor}
                          strokeWidth={isAttacked ? 4 : hasOwner ? 3 : 1.5}
                          strokeLinejoin="round"
                          opacity={isAttacked ? 1 : hasOwner ? 0.95 : 0.4}
                          filter={`url(#glow-${s.key})`}
                          className={`transition-all duration-300 ${isAttacked ? 'animate-pulse' : ''}`}
                        />

                        {/* Label pill badge */}
                        <rect
                          x={s.labelX - 46}
                          y={s.labelY - 14}
                          width={92}
                          height={26}
                          rx={13}
                          fill={isAttacked ? '#fbbf24' : ownerColor}
                          opacity={1}
                          filter="url(#label-shadow)"
                          className="transition-all duration-300"
                        />
                        {/* Label text */}
                        <text
                          x={s.labelX}
                          y={s.labelY + 4}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="900"
                          fill={isAttacked ? '#1c1917' : '#ffffff'}
                          letterSpacing="0.08em"
                          className="select-none"
                          filter="url(#label-shadow)"
                        >
                          {isAttacked ? '⚡ ATAQUE' : hasOwner ? dueño.substring(0, 12).toUpperCase() : s.label.toUpperCase()}
                        </text>
                        {/* Small emoji above badge */}
                        <text
                          x={s.labelX}
                          y={s.labelY - 18}
                          textAnchor="middle"
                          fontSize="16"
                          className="select-none"
                        >
                          {s.emoji}
                        </text>
                      </g>
                    );
                  })}

                  {/* Center shield emblem */}
                  <circle cx="245" cy="245" r="40" fill="#1e293b" stroke="#475569" strokeWidth="3" />
                  <circle cx="245" cy="245" r="32" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                  <text x="245" y="252" textAnchor="middle" fontSize="24" className="select-none">🏛️</text>
                  <text x="245" y="272" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#64748b" letterSpacing="0.18em" className="select-none">UNIPAZ</text>
                </svg>
              </div>

              {/* Map Footer Legend */}
              <div className="absolute bottom-3 flex flex-wrap justify-center gap-2 px-3">
                {SECTORES.map(s => (
                  <span
                    key={s.key}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: s.color + '33', color: s.freeColor, border: `1px solid ${s.color}55` }}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Live Leaderboard for Active Round */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm min-h-[420px]">
              <h2 className="text-slate-500 text-xs font-bold tracking-widest uppercase border-b border-slate-200 pb-3 flex items-center justify-between">
                <span>Ronda Activa</span>
                <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">Aciertos</span>
              </h2>

              <div className="flex-1 flex flex-col justify-center gap-3.5 py-4">
                {carreras.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-10 font-bold">
                    Esperando configuración de carreras...
                  </div>
                ) : (
                  carreras.map((carrera) => {
                    const aciertos = marcadorRonda[carrera] || 0;
                    const maxAciertos = Math.max(...Object.values(marcadorRonda), 1);
                    const percentage = (aciertos / maxAciertos) * 100;
                    const color = obtenerColorCarrera(carrera, carreras);

                    return (
                      <div key={carrera} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span className="truncate text-slate-800 max-w-[150px]">{carrera}</span>
                          <span style={{ color }}>{aciertos} aciertos</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 border border-slate-300 rounded-full overflow-hidden p-0.5">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: color,
                              boxShadow: `0 0 10px ${color}`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[9px] text-slate-450 text-center font-bold tracking-wider border-t border-slate-200 pt-2.5 uppercase">
                Actualización en Tiempo Real
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Podio Overlay Modal on Game Finalized */}
      {estadoJuego === 'finalizado' && podio.length > 0 && (
        <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center p-4 backdrop-blur-lg animate-fade-in">
          <div className="bg-slate-50 border border-green-500/30 rounded-[36px] max-w-[620px] w-full p-8 shadow-[0_0_40px_rgba(34,197,94,0.15)] flex flex-col items-center text-center gap-6">
            <div className="text-7xl animate-bounce">🏆</div>
            <div>
              <h2 className="text-green-700 font-black text-3xl tracking-widest uppercase">
                ¡Conquista Finalizada!
              </h2>
              <p className="text-slate-500 text-sm mt-1.5 font-bold tracking-wider">
                Marcador Definitivo e Interfacultades
              </p>
            </div>

            {/* Podium list */}
            <div className="w-full flex flex-col gap-3 my-4">
              {podio.map((item, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                
                let icon = '🎖️';
                let style = 'bg-white border-slate-200 text-slate-800 shadow-sm';
                
                if (isFirst) {
                  icon = '🥇';
                  style = 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
                } else if (isSecond) {
                  icon = '🥈';
                  style = 'bg-slate-100 border-slate-300 text-slate-700';
                } else if (isThird) {
                  icon = '🥉';
                  style = 'bg-amber-700/10 border-amber-600/30 text-amber-800';
                }

                return (
                  <div 
                    key={item.carrera} 
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border font-black ${style}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <span className="text-sm tracking-wide uppercase">{index + 1}° Lugar: {item.carrera}</span>
                    </div>
                    <span className="text-sm font-mono">{item.sectoresDominados} {item.sectoresDominados === 1 ? 'Sector' : 'Sectores'}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Reinicia una partida en el panel de control del Expositor
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
