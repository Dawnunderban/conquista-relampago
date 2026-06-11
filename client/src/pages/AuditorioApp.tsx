import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Zap, Users, Trophy, Shield, Volume2, Clock } from 'lucide-react';

// ── Constantes del mapa circular ───────────────────────────────────────────
const CX = 245, CY = 245;
const R_OUT = 170;
const R_IN  = 52;
const R_LBL = 118;
const GAP   = 2.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pt = (deg: number, r: number) => ({
  x: CX + r * Math.cos(toRad(deg)),
  y: CY + r * Math.sin(toRad(deg)),
});
const fmt = (n: number) => n.toFixed(2);

const makePath = (startDeg: number, endDeg: number) => {
  const s = startDeg + GAP / 2;
  const e = endDeg   - GAP / 2;
  const o1 = pt(s, R_OUT), o2 = pt(e, R_OUT);
  const i1 = pt(s, R_IN),  i2 = pt(e, R_IN);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `M${fmt(o1.x)},${fmt(o1.y)} ` +
    `A${R_OUT},${R_OUT},0,${lg},1,${fmt(o2.x)},${fmt(o2.y)} ` +
    `L${fmt(i2.x)},${fmt(i2.y)} ` +
    `A${R_IN},${R_IN},0,${lg},0,${fmt(i1.x)},${fmt(i1.y)} Z`
  );
};

const midPt = (startDeg: number, endDeg: number, r: number) => pt((startDeg + endDeg) / 2, r);

// ── Sectores ────────────────────────────────────────────────────────────────
const SECTORES = [
  { key: 'MEDICINA',   label: 'Medicina',   emoji: '🩺', color: '#10b981', dark: '#064e3b', startDeg: -126, endDeg: -54  },
  { key: 'DERECHO',    label: 'Derecho',    emoji: '⚖️', color: '#d946ef', dark: '#701a75', startDeg: -54,  endDeg: 18   },
  { key: 'ARTE',       label: 'Arte',       emoji: '🎨', color: '#f97316', dark: '#7c2d12', startDeg: 18,   endDeg: 90   },
  { key: 'CIENCIAS',   label: 'Ciencias',   emoji: '🔬', color: '#eab308', dark: '#713f12', startDeg: 90,   endDeg: 162  },
  { key: 'INGENIERÍA', label: 'Ingeniería', emoji: '⚙️', color: '#06b6d4', dark: '#164e63', startDeg: 162,  endDeg: 234  },
];
const SECTOR_MAP = Object.fromEntries(SECTORES.map((s) => [s.key, s]));

// ── Colores adicionales de carreras para la paleta ──────────────────────────
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

function getCareerEmoji(name: string) {
  const key = name.toUpperCase();
  if (key.includes('MEDICINA') || key.includes('MED')) return '🩺';
  if (key.includes('DERECHO') || key.includes('ABOG')) return '⚖️';
  if (key.includes('ARTE') || key.includes('DIS')) return '🎨';
  if (key.includes('CIENCIAS') || key.includes('QUIM') || key.includes('BIO')) return '🔬';
  if (key.includes('INGENIERÍA') || key.includes('SIST') || key.includes('IND')) return '⚙️';
  return '🎓';
}

// ── Partículas flotantes animadas ──────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#06b6d4', '#a855f7', '#f97316', '#eab308', '#10b981'];
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.pulse += 0.015;
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

// ── Grid animado de fondo ───────────────────────────────────────────────────
function AnimatedGrid() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      backgroundImage: `
        linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '48px 48px',
      animation: 'gridMove 20s linear infinite',
      pointerEvents: 'none'
    }} />
  );
}

// ── Orbes de fondo ─────────────────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <>
      <div style={{
        position: 'fixed', top: '-15%', left: '-5%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
        animation: 'orbFloat 12s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', right: '-5%',
        width: '45vw', height: '45vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
        animation: 'orbFloat 15s ease-in-out infinite reverse',
      }} />
    </>
  );
}

const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

// ── Estilo unificado para los contenedores (Cards) ──────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
};

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
  const [preguntaEnCurso, setPreguntaEnCurso] = useState<{
    texto: string;
    opciones: { A: string; B: string; C: string; D: string };
    tiempo: number;
  } | null>(null);
  const [sectorEnCurso, setSectorEnCurso] = useState<string | null>(null);
  const [rondaResumen, setRondaResumen] = useState('');
  const [podio, setPodio] = useState<{ carrera: string; sectoresDominados: number }[]>([]);

  // Sector seleccionado manualmente para inspección en pantalla
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string | null>(null);
  
  // Sector bajo el puntero del mouse (Hover)
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  // Historial de actividad (rolling log)
  const [activityFeed, setActivityFeed] = useState<{ id: string; text: string; time: string }[]>([]);

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
      setActivityFeed([]);
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
        setRondaResumen(`⌛ Ronda cerrada en ${sectorNombre}. Ningún acierto.`);
      } else if (hayEmpate) {
        setRondaResumen(`⚔️ Empate en ${sectorNombre} con ${maxAciertos} aciertos. Sin cambios.`);
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

  // Seleccionar automáticamente el sector bajo ataque para enfocar la pregunta
  useEffect(() => {
    if (sectorEnCurso) {
      setSectorSeleccionado(sectorEnCurso);
    }
  }, [sectorEnCurso]);

  // Rolling Feed de Actividades
  useEffect(() => {
    if (rondaResumen) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setActivityFeed(prev => [
        { id: Math.random().toString(), text: rondaResumen, time: timeStr },
        ...prev.slice(0, 4)
      ]);
    }
  }, [rondaResumen]);

  const formatearTiempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getSectorColor = (secKey: string) => {
    const sectorObj = mapa[secKey];
    if (sectorObj && sectorObj.dueño !== 'Libre') {
      return obtenerColorCarrera(sectorObj.dueño, carreras);
    }
    return SECTOR_MAP[secKey]?.color || '#475569';
  };

  const playUrl = pin !== '----' ? `${SERVER_URL}/jugar.html?pin=${pin}` : '';
  const qrCodeUrl = playUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(playUrl)}&color=06b6d4&bgcolor=050a18`
    : '';

  // Preparar lista de carreras e indicar cuántos sectores domina cada una
  const activeCareers = carreras.length > 0 ? carreras : ['MEDICINA', 'DERECHO', 'ARTE', 'CIENCIAS', 'INGENIERÍA'];
  
  const countCapturedSectors = (careerName: string) => {
    return Object.values(mapa).filter(s => s.dueño.toUpperCase() === careerName.toUpperCase()).length;
  };

  const getOwnedSectoresNames = (careerName: string) => {
    return Object.keys(mapa)
      .filter(secKey => mapa[secKey].dueño.toUpperCase() === careerName.toUpperCase())
      .map(secKey => SECTOR_MAP[secKey]?.label || secKey)
      .join(', ');
  };

  // Ordenamos cromáticamente por espectro de color (Verde -> Celeste -> Amarillo -> Naranja -> Violeta) cuando los puntajes son iguales
  const sortedCareers = activeCareers.map(name => ({
    name,
    owned: countCapturedSectors(name),
    emoji: getCareerEmoji(name),
    color: obtenerColorCarrera(name, activeCareers)
  })).sort((a, b) => {
    if (b.owned !== a.owned) return b.owned - a.owned;
    
    const scoreA = marcadorRonda[a.name] || 0;
    const scoreB = marcadorRonda[b.name] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    // Fallback de orden cromático
    const colorOrder = ['MEDICINA', 'INGENIERÍA', 'CIENCIAS', 'ARTE', 'DERECHO'];
    const idxA = colorOrder.indexOf(a.name.toUpperCase());
    const idxB = colorOrder.indexOf(b.name.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;

    return a.name.localeCompare(b.name);
  });

  const maxSectorsOwned = Math.max(...sortedCareers.map(c => c.owned), 1);

  // Renderizar el contenido lateral cuando se inspecciona o ataca un sector (SIN QR CODES)
  const renderSectorPanel = (secKey: string) => {
    const s = SECTOR_MAP[secKey];
    if (!s) return null;
    const isAttacked = sectorEnCurso === secKey;
    const sectorObj = mapa[secKey] || { nombre: s.label, dueño: 'Libre' };

    if (isAttacked && preguntaEnCurso) {
      return (
        <div className="flex flex-col gap-3.5 animate-fadeIn">
          <div 
            style={{
              background: `linear-gradient(135deg, ${s.dark}cc, ${s.color}22)`,
              border: `1px solid ${s.color}50`
            }}
            className="rounded-2xl p-4 text-center shadow-lg"
          >
            <div className="text-4xl mb-1">{s.emoji}</div>
            <h3 style={{ color: s.color }} className="text-base font-black tracking-widest uppercase">
              {s.label}
            </h3>
            <div className="text-[10px] text-yellow-400 font-extrabold tracking-wider mt-1.5 animate-pulse uppercase">
              ⚡ Sector bajo ataque ⚡
            </div>
          </div>

          <div className="bg-[#050a18]/90 border border-slate-850 rounded-2xl p-4 shadow-md">
            <span style={{ color: s.color }} className="text-[9px] font-black tracking-widest uppercase block mb-2">
              Pregunta de Trivia
            </span>
            <p className="text-sm font-bold text-white leading-relaxed">
              {preguntaEnCurso.texto}
            </p>
          </div>

          {preguntaEnCurso.opciones && (
            <div className="flex flex-col gap-2">
              {Object.entries(preguntaEnCurso.opciones).map(([key, opt]) => (
                <div
                  key={key}
                  className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-300 flex items-center gap-3"
                >
                  <span 
                    style={{ color: s.color, backgroundColor: `${s.color}15` }}
                    className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-black"
                  >
                    {key}
                  </span>
                  <span className="truncate">{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const hasOwner = sectorObj.dueño !== 'Libre';
    const ownerColor = hasOwner ? obtenerColorCarrera(sectorObj.dueño, carreras) : s.color;

    return (
      <div className="flex flex-col gap-3.5 animate-fadeIn">
        <div 
          style={{
            background: `linear-gradient(135deg, ${s.dark}90, ${s.color}15)`,
            border: `1px solid ${s.color}33`
          }}
          className="rounded-2xl p-4 text-center"
        >
          <div className="text-4xl mb-1">{s.emoji}</div>
          <h3 style={{ color: s.color }} className="text-base font-black tracking-widest uppercase">
            {s.label}
          </h3>
          <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block mt-1">
            Territorio Académico
          </span>
        </div>

        <div className="bg-[#050a18]/80 border border-slate-850 rounded-2xl p-4 text-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">
            Control de Sector
          </span>
          <h4 
            style={{ color: ownerColor }}
            className="text-sm font-black uppercase mt-1.5"
          >
            {hasOwner ? `Dominado por ${sectorObj.dueño}` : 'Libre (Sin Conquistar)'}
          </h4>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen text-white flex flex-col items-center p-4 lg:p-6 overflow-hidden select-none">
      {/* Elementos estéticos de fondo */}
      <BackgroundOrbs />
      <AnimatedGrid />
      <Particles />

      {/* Header Premium de Auditorio */}
      <header style={CARD_STYLE} className="w-full flex flex-col md:flex-row items-center justify-between px-6 py-4 mb-4 gap-4 relative z-10 animate-slideDown">
        <div className="flex items-center gap-4.5">
          <div style={{
            width: 48, height: 48, borderRadius: '14px',
            background: 'linear-gradient(135deg,#06b6d4,#a855f7)',
            fontSize: 24,
            boxShadow: '0 0 25px rgba(6,182,212,0.5)',
            animation: 'logoPulse 2s ease-in-out infinite',
          }} className="flex items-center justify-center">⚡</div>
          <div>
            <div style={{
              fontSize: '24px', fontWeight: 900, letterSpacing: '0.2em',
              background: 'linear-gradient(90deg,#06b6d4,#a855f7,#f97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
              backgroundSize: '200%',
            }}>RESPONDE Y AVANZA</div>
            <div className="text-[9px] text-cyan-400/80 tracking-[0.2em] font-extrabold uppercase mt-0.5">
              Batalla Interfacultades · UNIPAZ
            </div>
          </div>
        </div>

        {/* Global state and connection parameters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-955/60 border border-slate-800/60">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-base font-black text-cyan-400">
              {formatearTiempo(tiempoGlobal)}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-955/60 border border-slate-800/60">
            <span className="text-[9px] text-slate-550 font-black tracking-wider uppercase">PIN:</span>
            <span className="font-mono text-base font-black text-green-500 tracking-wider">
              {pin}
            </span>
          </div>

          <div style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl">
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10b981',
              animation: 'blink 1.2s ease-in-out infinite',
              boxShadow: '0 0 8px #10b981',
            }} />
            <span className="text-[9px] font-black text-green-500 tracking-widest uppercase">
              TRANSMISIÓN EN VIVO
            </span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
           BANNER QR ÚNICO — entrada para TODOS los jugadores
          ══════════════════════════════════════════════════════ */}
      {estadoJuego !== 'finalizado' && (
        <div
          style={{
            ...CARD_STYLE,
            width: '100%',
            maxWidth: '1280px',
            marginBottom: '16px',
            position: 'relative',
            zIndex: 10,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(168,85,247,0.06) 50%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(6,182,212,0.25)',
            boxShadow: '0 0 40px rgba(6,182,212,0.08), 0 10px 40px rgba(0,0,0,0.5)',
          }}
          className="flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-5 animate-slideDown"
        >
          {/* Texto de invitación */}
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div style={{
              fontSize: '22px', fontWeight: 900, letterSpacing: '0.12em',
              background: 'linear-gradient(90deg, #06b6d4, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              ⚡ ¡ÚNETE A LA BATALLA!
            </div>
            <div className="text-slate-300 text-sm font-semibold mt-1">
              Escanea el código QR con tu celular y selecciona tu carrera
            </div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">
              Una sola sala · Todas las carreras compiten juntas
            </div>
          </div>

          {/* Separador */}
          <div style={{
            width: '1px', height: '80px',
            background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.4), transparent)',
            display: 'none',
          }} className="hidden md:block" />

          {/* PIN texto grande */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[9px] text-slate-500 font-black tracking-[0.25em] uppercase">PIN de Acceso</span>
            <span style={{
              fontFamily: 'monospace', fontSize: '44px', fontWeight: 900, letterSpacing: '0.15em',
              color: '#10b981',
              textShadow: '0 0 20px rgba(16,185,129,0.5)',
              lineHeight: 1,
            }}>{pin}</span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">o ingresa en</span>
            <span className="text-[10px] text-cyan-400 font-bold">{playUrl.replace(/^https?:\/\//, '')}</span>
          </div>

          {/* QR único y grande */}
          <div className="flex flex-col items-center gap-2">
            {qrCodeUrl ? (
              <div
                style={{
                  padding: '10px',
                  background: '#050a18',
                  border: '2px solid rgba(6,182,212,0.5)',
                  borderRadius: '20px',
                  boxShadow: '0 0 30px rgba(6,182,212,0.2), inset 0 0 20px rgba(6,182,212,0.03)',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(playUrl)}&color=06b6d4&bgcolor=050a18`}
                  alt="QR para ingresar al juego"
                  style={{ width: '160px', height: '160px', borderRadius: '12px', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{
                width: 160, height: 160,
                border: '2px dashed rgba(6,182,212,0.3)',
                borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#475569', fontSize: '11px', fontWeight: 700,
                animation: 'blink 1.5s ease-in-out infinite'
              }}>
                Esperando PIN...
              </div>
            )}
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Apunta la cámara aquí</span>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <main style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px' }} 
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
        
        {/* Lado Izquierdo: Mapa circular principal */}
        <section className="lg:col-span-7 flex flex-col">
          <div style={CARD_STYLE} className="p-6 flex flex-col relative h-full min-h-[500px] animate-slideUp">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                  Control Territorial en Vivo
                </span>
              </div>
              {preguntaEnCurso && (
                <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-400 animate-pulse uppercase">
                  <span>Pregunta Restante:</span>
                  <span className="font-mono">{tiempoRonda}s</span>
                </div>
              )}
            </div>

            {/* SVG slices circular map container */}
            <div style={{
              position: 'relative',
              aspectRatio: '1',
              width: '100%',
              maxWidth: '460px',
              margin: 'auto',
              background: 'rgba(13,27,56,0.3)',
              borderRadius: '24px',
              border: '1px solid #1a2e4a',
              overflow: 'hidden'
            }} className="flex items-center justify-center p-2.5">
              
              {/* Botones rápidos de selección flotantes */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {SECTORES.map((sec) => {
                  const isAct = sectorSeleccionado === sec.key;
                  const currentStrokeColor = getSectorColor(sec.key);
                  return (
                    <button
                      key={sec.key}
                      onClick={() => setSectorSeleccionado(isAct ? null : sec.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: `1px solid ${isAct ? currentStrokeColor : 'rgba(255,255,255,0.08)'}`,
                        background: isAct ? `${currentStrokeColor}20` : 'rgba(5,10,24,0.85)',
                        color: isAct ? '#fff' : '#94a3b8',
                        fontSize: '8px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        letterSpacing: '0.05em',
                        boxShadow: isAct ? `0 0 10px ${currentStrokeColor}25` : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span>{sec.emoji}</span>
                      <span>{sec.label.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Contenedor del mapa real */}
              <div style={{ width: '100%', height: '100%', position: 'relative' }} className="aspect-square">
                <img
                  src="/assets/mapa-conquista.png"
                  alt="Mapa Conquista Relámpago"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    borderRadius: '16px',
                    zIndex: 1,
                  }}
                />

                <svg
                  viewBox="0 0 490 490"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}
                >
                  <defs>
                    {SECTORES.map((s) => (
                      <filter key={s.key} id={`gf-${s.key}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="blur1" />
                        <feMerge>
                          <feMergeNode in="blur1" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    ))}
                  </defs>

                  {SECTORES.map((s) => {
                    const isAct = sectorSeleccionado === s.key;
                    const isAttacked = sectorEnCurso === s.key;
                    const path = makePath(s.startDeg, s.endDeg);
                    const lp = midPt(s.startDeg, s.endDeg, R_LBL);
                    const currentStrokeColor = getSectorColor(s.key);
                    const sectorObj = mapa[s.key] || { nombre: s.label, dueño: 'Libre' };
                    
                    const isShown = isAct || hoveredSector === s.key;
                    const ownerColor = sectorObj.dueño !== 'Libre' ? obtenerColorCarrera(sectorObj.dueño, carreras) : s.color;

                    return (
                      <g
                        key={s.key}
                        onClick={() => setSectorSeleccionado(isAct ? null : s.key)}
                        onMouseEnter={() => setHoveredSector(s.key)}
                        onMouseLeave={() => setHoveredSector(null)}
                        style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      >
                        {/* Relleno translúcido */}
                        <path
                          d={path}
                          fill={isAttacked ? '#fbbf24' : currentStrokeColor}
                          opacity={isAct ? 0.35 : isAttacked ? 0.25 : 0.06}
                          style={{ transition: 'opacity 0.25s ease, fill 0.4s ease' }}
                        />
                        {/* Borde neón */}
                        <path
                          d={path}
                          fill="none"
                          stroke={isAttacked ? '#fbbf24' : currentStrokeColor}
                          strokeWidth={isAct ? 6.5 : isAttacked ? 5 : 2.5}
                          opacity={isAct ? 1 : isAttacked ? 1 : 0.4}
                          filter={`url(#gf-${s.key})`}
                          className={isAttacked ? 'animate-pulse' : ''}
                          style={{ transition: 'all 0.25s ease, stroke 0.4s ease' }}
                        />

                        {/* Etiqueta flotante con nombre y puntos (sectores dominados) al pasar mouse */}
                        {isShown && (
                          <g>
                            <rect
                              x={lp.x - 70}
                              y={lp.y - 20}
                              width={140}
                              height={38}
                              rx="10"
                              fill="#050a18ee"
                              stroke={isAttacked ? '#fbbf24' : currentStrokeColor}
                              strokeWidth="1.8"
                            />
                            {/* Nombre del sector */}
                            <text
                              x={lp.x}
                              y={lp.y - 6}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="900"
                              fill="#ffffff"
                              style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
                            >
                              {s.label.toUpperCase()}
                            </text>
                            {/* Dueño y Puntos */}
                            <text
                              x={lp.x}
                              y={lp.y + 8}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="bold"
                              fill={ownerColor}
                              style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
                            >
                              {sectorObj.dueño === 'Libre' ? 'SIN DUEÑO' : `${sectorObj.dueño.toUpperCase()} (${countCapturedSectors(sectorObj.dueño)} SEC)`}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Panel de preguntas overlay lateral flotante (Solo si se selecciona) */}
            {sectorSeleccionado && (
              <div style={{
                position: 'absolute',
                top: 24,
                right: 24,
                width: '290px',
                background: 'rgba(7,11,26,0.97)',
                border: `1.5px solid ${getSectorColor(sectorSeleccionado)}70`,
                borderRadius: '20px',
                padding: '16px',
                boxShadow: `0 0 40px ${getSectorColor(sectorSeleccionado)}25, 0 15px 40px rgba(0,0,0,0.8)`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: 'calc(100% - 48px)',
                overflowY: 'auto',
                backdropFilter: 'blur(20px)',
                zIndex: 20,
                animation: 'slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <button
                  onClick={() => setSectorSeleccionado(null)}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 text-[9px] font-black py-1.5 px-3 rounded-lg self-end cursor-pointer tracking-wider"
                >
                  ✕ CERRAR
                </button>
                {renderSectorPanel(sectorSeleccionado)}
              </div>
            )}

          </div>
        </section>

        {/* Lado Derecho: Marcadores, actividad, QR permanente y podio */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Marcador de Facultades */}
          <div style={CARD_STYLE} className="p-6 flex flex-col animate-slideUp">
            
            <div className="flex items-center gap-2 mb-4.5">
              <Trophy className="w-4.5 h-4.5 text-yellow-400 animate-pulse" />
              <span className="text-[10px] font-black text-slate-355 tracking-[0.2em] uppercase">
                Tabla de Posiciones
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {sortedCareers.map((c, idx) => {
                const percent = maxSectorsOwned > 0 ? (c.owned / maxSectorsOwned) * 100 : 0;
                return (
                  <div
                    key={c.name}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'background 0.2s, border-color 0.2s'
                    }}
                    className="hover:bg-white/[0.04] hover:border-white/[0.08]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span style={{
                          color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b',
                          background: 'rgba(255,255,255,0.03)',
                        }} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span style={{ color: c.color }} className="text-xs font-black truncate uppercase tracking-wider">
                          {c.emoji} {c.name}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5 shrink-0">
                        <span className="font-mono font-black text-sm text-white">
                          {c.owned}
                        </span>
                        <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider">SEC</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-[#111827] rounded-full overflow-hidden">
                      <div 
                        style={{
                          width: `${percent}%`,
                          background: c.color,
                          boxShadow: `0 0 8px ${c.color}`,
                          transition: 'width 0.8s ease-out'
                        }}
                        className="h-full rounded-full"
                      />
                    </div>

                    {/* Ronda Aciertos Status */}
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>
                        Sectores: {c.owned}{' '}
                        {c.owned > 0 && (
                          <span style={{ color: c.color }} className="normal-case font-semibold">
                            ({getOwnedSectoresNames(c.name)})
                          </span>
                        )}
                      </span>
                      {marcadorRonda[c.name] !== undefined && (
                        <span style={{ color: c.color }} className="font-black">
                          {marcadorRonda[c.name]} aciertos ronda
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registro de Actividades Recientes */}
          <div style={CARD_STYLE} className="p-6 flex flex-col flex-1 animate-slideUp">
            
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black text-slate-355 tracking-[0.2em] uppercase">
                Historial de Actividad
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-1 max-h-[160px] lg:max-h-none">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(6, 182, 212, 0.03)',
                    borderLeft: '3px solid #06b6d4'
                  }}
                  className="p-3 rounded-xl flex flex-col gap-1.5 animate-fadeIn"
                >
                  <p className="margin-0 text-xs font-bold text-slate-200 leading-normal">
                    {item.text}
                  </p>
                  <span className="text-[8px] text-slate-550 font-mono self-end">
                    {item.time}
                  </span>
                </div>
              ))}

              {activityFeed.length === 0 && (
                <div className="text-center text-slate-550 text-xs font-bold uppercase tracking-wider py-8">
                  Esperando eventos de batalla...
                </div>
              )}
            </div>
          </div>

          {/* El QR ya se muestra en el banner superior — no duplicar aquí */

        </section>
      </main>

      {/* Podio Overlay Modal al finalizar partida */}
      {estadoJuego === 'finalizado' && podio.length > 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(5, 10, 24, 0.95)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{
            background: 'rgba(11, 15, 30, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '24px',
            backdropFilter: 'blur(20px)'
          }}>
            <div className="text-7xl animate-bounce">🏆</div>
            <div>
              <h2 style={{ color: '#10b981', fontWeight: 900, fontSize: '28px', letterSpacing: '0.1em', margin: 0 }} className="uppercase">
                ¡Conquista Finalizada!
              </h2>
              <p className="text-slate-400 text-xs mt-1.5 font-bold tracking-wider uppercase">
                Marcador Definitivo e Interfacultades
              </p>
            </div>

            {/* Lista de Podio */}
            <div className="w-full flex flex-col gap-3 my-2">
              {podio.slice(0, 3).map((item, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                
                let icon = '🎖️';
                let itemStyle = {
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1'
                };
                
                if (isFirst) {
                  icon = '🥇';
                  itemStyle = {
                    background: 'rgba(234, 179, 8, 0.08)',
                    borderColor: 'rgba(234, 179, 8, 0.35)',
                    color: '#fbbf24'
                  };
                } else if (isSecond) {
                  icon = '🥈';
                  itemStyle = {
                    background: 'rgba(203, 213, 225, 0.05)',
                    borderColor: 'rgba(203, 213, 225, 0.2)',
                    color: '#e2e8f0'
                  };
                } else if (isThird) {
                  icon = '🥉';
                  itemStyle = {
                    background: 'rgba(180, 83, 9, 0.05)',
                    borderColor: 'rgba(180, 83, 9, 0.2)',
                    color: '#f59e0b'
                  };
                }

                return (
                  <div 
                    key={item.carrera} 
                    style={itemStyle}
                    className="flex items-center justify-between px-5 py-4 rounded-2xl border font-black"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <span className="text-xs tracking-wider uppercase">
                        {index + 1}° Lugar: {item.carrera}
                      </span>
                    </div>
                    <span className="text-xs font-mono">
                      {item.sectoresDominados} {item.sectoresDominados === 1 ? 'Sector' : 'Sectores'}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider margin-0">
              Reinicia una partida en el panel de control del Expositor
            </p>
          </div>
        </div>
      )}

      {/* Footer del Auditorio */}
      <footer style={{ position: 'relative', zIndex: 10 }} 
              className="text-[9px] text-slate-650 font-bold uppercase tracking-widest text-center mt-6">
        RESPONDE Y AVANZA · CONTROL TERRITORIAL · UNIPAZ © 2026
      </footer>
    </div>
  );
}
