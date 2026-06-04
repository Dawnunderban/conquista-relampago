import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { StarField } from '../components/StarField';
import { Settings, Zap, Play, Square, Award, Plus, Trash } from 'lucide-react';

const SERVER_URL = (window.location.origin === 'null' || window.location.protocol === 'file:') 
  ? 'http://localhost:3000' 
  : window.location.origin;

const SECTORES = [
  { key: 'MEDICINA', label: 'Sector Medicina' },
  { key: 'DERECHO', label: 'Sector Derecho' },
  { key: 'ARTE', label: 'Sector Arte' },
  { key: 'CIENCIAS', label: 'Sector Ciencias' },
  { key: 'INGENIERÍA', label: 'Sector Ingeniería' },
];

interface Pregunta {
  texto: string;
  opciones: { A: string; B: string; C: string; D: string };
  correcta: string;
  tiempo: number;
  sector: string;
}

export default function AdminApp() {
  const [pin, setPin] = useState('----');
  const [usuariosConectados, setUsuariosConectados] = useState(0);
  const [estadoJuego, setEstadoJuego] = useState('ESPERA');
  const [carrerasConfiguradas, setCarrerasConfiguradas] = useState<string[]>([]);
  const [carrerasLocales, setCarrerasLocales] = useState<string[]>([]);
  
  // Preguntas bank
  const [preguntasLocales, setPreguntasLocales] = useState<Pregunta[]>([]);
  const [nuevaCarrera, setNuevaCarrera] = useState('');

  // Form states
  const [textoPregunta, setTextoPregunta] = useState('');
  const [opcA, setOpcA] = useState('');
  const [opcB, setOpcB] = useState('');
  const [opcC, setOpcC] = useState('');
  const [opcD, setOpcD] = useState('');
  const [correcta, setCorrecta] = useState('A');
  const [tiempoPregunta, setTiempoPregunta] = useState(20);
  const [sectorObjetivo, setSectorObjetivo] = useState('MEDICINA');

  // Ronda Activa states
  const [rondaEnCurso, setRondaEnCurso] = useState(false);
  const [preguntaActiva, setPreguntaActiva] = useState<string>('Ninguna');
  const [sectorActivo, setSectorActivo] = useState<string>('Ninguno');
  const [tiempoRonda, setTiempoRonda] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on('estado_actual', (estado) => {
      console.log('Estado cargado en Admin:', estado);
      if (estado.pin) setPin(estado.pin);
      setUsuariosConectados(estado.usuariosConectados || 0);
      setEstadoJuego(estado.estadoJuego.toUpperCase());
      
      if (estado.carreras && estado.carreras.length > 0) {
        setCarrerasConfiguradas(estado.carreras);
        setCarrerasLocales(estado.carreras);
      }

      if (estado.estadoJuego === 'jugando') {
        if (estado.preguntaEnCurso) {
          setRondaEnCurso(true);
          setPreguntaActiva(estado.preguntaEnCurso.texto);
          setSectorActivo(estado.mapa[estado.sectorEnCurso]?.nombre || estado.sectorEnCurso);
          setTiempoRonda(estado.rondaTiempoRestante);
        }
      }
    });

    socket.on('partida_creada', ({ pin: nuevoPin }) => {
      setPin(nuevoPin);
      setEstadoJuego('ESPERA');
      setCarrerasConfiguradas([]);
      setCarrerasLocales([]);
      setPreguntasLocales([]);
      setRondaEnCurso(false);
      setPreguntaActiva('Ninguna');
      setSectorActivo('Ninguno');
      setTiempoRonda(0);
      alert(`Nueva partida creada. PIN: ${nuevoPin}. Favor de configurar carreras y preguntas.`);
    });

    socket.on('carreras_actualizadas', (carreras) => {
      setCarrerasConfiguradas(carreras);
      setCarrerasLocales(carreras);
      alert('¡Carreras autorizadas y guardadas con éxito!');
    });

    socket.on('pregunta_guardada', ({ total }) => {
      // Guardar localmente
      const p: Pregunta = {
        texto: textoPregunta,
        opciones: { A: opcA, B: opcB, C: opcC, D: opcD },
        correcta,
        tiempo: tiempoPregunta,
        sector: sectorObjetivo
      };
      setPreguntasLocales(prev => [...prev, p]);
      
      // Limpiar formulario
      setTextoPregunta('');
      setOpcA('');
      setOpcB('');
      setOpcC('');
      setOpcD('');
      alert(`Pregunta guardada con éxito. Total banco: ${total}`);
    });

    socket.on('usuarios_conectados_actualizacion', (cantidad) => {
      setUsuariosConectados(cantidad);
    });

    socket.on('juego_iniciado', () => {
      setEstadoJuego('JUGANDO');
      alert('¡El juego ha iniciado oficialmente!');
    });

    socket.on('pregunta_lanzada', ({ pregunta, sectorNombre, tiempoRonda: tr }) => {
      setRondaEnCurso(true);
      setPreguntaActiva(pregunta.texto);
      setSectorActivo(sectorNombre);
      setTiempoRonda(tr);
    });

    socket.on('tiempo_ronda_actualizacion', (segundos) => {
      setTiempoRonda(segundos);
    });

    socket.on('ronda_terminada', ({ sectorNombre, dueño, maxAciertos, hayEmpate }) => {
      setRondaEnCurso(false);
      setPreguntaActiva('Ninguna (Ronda Finalizada)');
      setSectorActivo('Ninguno');
      setTiempoRonda(0);

      let msg = `Ronda finalizada en ${sectorNombre}.\n`;
      if (maxAciertos === 0) {
        msg += `Ninguna carrera obtuvo aciertos.`;
      } else if (hayEmpate) {
        msg += `Empate con ${maxAciertos} aciertos. El sector mantiene su dueño original.`;
      } else {
        msg += `¡Conquistado por ${dueño} con ${maxAciertos} aciertos!`;
      }
      alert(msg);
    });

    socket.on('juego_finalizado', () => {
      setEstadoJuego('FINALIZADO');
      setRondaEnCurso(false);
      setPreguntaActiva('Juego Concluido');
      setSectorActivo('Ninguno');
      setTiempoRonda(0);
      alert('¡La partida ha finalizado! Revisa el podio en la pantalla del auditorio.');
    });

    socket.on('error_servidor', (msg) => {
      alert(`Error del Servidor: ${msg}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [textoPregunta, opcA, opcB, opcC, opcD, correcta, tiempoPregunta, sectorObjetivo]);

  const handleCrearPartida = () => {
    socketRef.current?.emit('crear_partida');
  };

  const handleIniciarJuego = () => {
    if (preguntasLocales.length < 3) {
      if (!confirm('Se sugiere tener al menos 3 preguntas cargadas. ¿Desea iniciar de todos modos?')) {
        return;
      }
    }
    socketRef.current?.emit('iniciar_juego');
  };

  const handleFinalizarJuego = () => {
    if (confirm('¿Está seguro de que desea finalizar la partida y computar el podio ahora mismo?')) {
      socketRef.current?.emit('finalizar_juego');
    }
  };

  const handleCerrarRonda = () => {
    socketRef.current?.emit('terminar_ronda');
  };

  const handleAgregarCarrera = () => {
    const c = nuevaCarrera.trim();
    if (!c) return;
    if (carrerasLocales.includes(c)) {
      alert('Esta carrera ya ha sido agregada.');
      return;
    }
    if (carrerasLocales.length >= 6) {
      alert('Se permite un máximo de 6 carreras.');
      return;
    }
    setCarrerasLocales(prev => [...prev, c]);
    setNuevaCarrera('');
  };

  const handleEliminarCarrera = (idx: number) => {
    setCarrerasLocales(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGuardarCarreras = () => {
    if (carrerasLocales.length < 2 || carrerasLocales.length > 6) {
      alert('La cantidad de carreras debe ser de 2 a 6.');
      return;
    }
    socketRef.current?.emit('configurar_carreras', carrerasLocales);
  };

  const handleGuardarPregunta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoPregunta || !opcA || !opcB || !opcC || !opcD) {
      alert('Completa todos los campos de la pregunta.');
      return;
    }

    const p: Pregunta = {
      texto: textoPregunta,
      opciones: { A: opcA, B: opcB, C: opcC, D: opcD },
      correcta,
      tiempo: tiempoPregunta,
      sector: sectorObjetivo
    };

    socketRef.current?.emit('guardar_pregunta', p);
  };

  const handleLanzarPregunta = (idx: number, sectorId: string) => {
    if (estadoJuego !== 'JUGANDO') {
      alert('Inicia el juego primero.');
      return;
    }
    if (rondaEnCurso) {
      alert('Ya hay una ronda activa.');
      return;
    }
    socketRef.current?.emit('lanzar_pregunta', { preguntaIndex: idx, sectorId });
  };

  return (
    <div className="relative min-h-screen bg-white overflow-x-hidden flex flex-col font-sans text-slate-900 p-4 lg:p-6">
      <StarField />

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center bg-slate-50/80 border border-slate-200 rounded-2xl py-4 px-6 backdrop-blur-md mb-6 gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/unipaz.jpg" 
            alt="UNIPAZ Logo" 
            className="w-12 h-12 rounded-full border border-green-500/50 object-cover shadow-[0_0_15px_rgba(34,197,94,0.4)]"
          />
          <div>
            <h1 className="text-lg lg:text-xl font-black tracking-widest bg-gradient-to-r from-green-600 via-slate-900 to-blue-600 bg-clip-text text-transparent uppercase">
              Panel de Control del Expositor
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Control en Tiempo Real · Conquista Relámpago · UNIPAZ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">PIN de la partida:</span>
          <span className="font-mono text-2xl font-black text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
            {pin}
          </span>
        </div>
      </header>

      {/* Control de Flujo Principal */}
      <section className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-100 border border-slate-200 p-4 rounded-2xl mb-6 shadow-sm items-center">
        <div className="text-xs text-slate-600 font-bold uppercase tracking-wider">
          <span>Estado del Juego: </span>
          <span className="text-yellow-600 font-black">{estadoJuego}</span>
          <span className="mx-2">|</span>
          <span>Usuarios: </span>
          <span className="text-blue-600 font-black">{usuariosConectados}</span>
        </div>

        <button
          onClick={handleCrearPartida}
          disabled={estadoJuego === 'JUGANDO'}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_0_12px_rgba(37,99,235,0.2)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Zap className="w-4 h-4" />
          Crear Partida
        </button>

        <button
          onClick={handleIniciarJuego}
          disabled={estadoJuego !== 'ESPERA' || carrerasConfiguradas.length < 2}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Play className="w-4 h-4" />
          Iniciar Juego
        </button>

        <button
          onClick={handleFinalizarJuego}
          disabled={estadoJuego !== 'JUGANDO'}
          className="bg-red-650 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Square className="w-4 h-4" />
          Finalizar Juego
        </button>
      </section>

      {/* Configuración y Registro */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Left column: Setup Carreras */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
            <h2 className="text-slate-600 text-xs font-bold tracking-widest uppercase border-b border-slate-200 pb-2">
              1. Configurar Carreras
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Medicina"
                value={nuevaCarrera}
                onChange={(e) => setNuevaCarrera(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-green-500 text-slate-900"
              />
              <button
                onClick={handleAgregarCarrera}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </div>

            <ul className="flex flex-col gap-2 max-h-36 overflow-y-auto no-scrollbar py-1">
              {carrerasLocales.map((c, i) => (
                <li key={i} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800">
                  <span className="truncate">{c}</span>
                  <button
                    onClick={() => handleEliminarCarrera(i)}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {carrerasLocales.length === 0 && (
                <li className="text-center text-xs text-slate-400 py-4 font-semibold uppercase">
                  Agrega carreras para iniciar
                </li>
              )}
            </ul>

            <button
              onClick={handleGuardarCarreras}
              disabled={carrerasLocales.length < 2 || carrerasLocales.length > 6}
              className="w-full bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 border border-slate-300 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors"
            >
              Autorizar y Enviar
            </button>
          </div>

          {/* Active Round control box */}
          {estadoJuego === 'JUGANDO' && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl p-5 flex flex-col gap-3.5 backdrop-blur-md">
              <h2 className="text-yellow-400 text-xs font-black tracking-widest uppercase border-b border-yellow-500/20 pb-2">
                Ronda Activa
              </h2>

              <div className="text-xs">
                <span className="text-slate-400 font-bold block">Pregunta:</span>
                <span className="text-white font-semibold truncate block mt-0.5">{preguntaActiva}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block">Sector Objetivo:</span>
                  <span className="text-white font-semibold uppercase block mt-0.5">{sectorActivo}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block">Tiempo Ronda:</span>
                  <span className="text-red-400 font-black text-sm block mt-0.5">{tiempoRonda}s</span>
                </div>
              </div>

              <button
                onClick={handleCerrarRonda}
                disabled={!rondaEnCurso}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 disabled:opacity-50 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_0_12px_rgba(234,179,8,0.25)] transition-all active:scale-95"
              >
                Cerrar Ronda Manual
              </button>
            </div>
          )}
        </section>

        {/* Right column: Setup Questions and Bank */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Create Question */}
          <div className="bg-[#140e2e]/50 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md">
            <h2 className="text-slate-400 text-xs font-bold tracking-widest uppercase border-b border-slate-800/60 pb-3 mb-4">
              2. Crear Pregunta al Banco
            </h2>

            <form onSubmit={handleGuardarPregunta} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Texto de la Pregunta</label>
                <input
                  type="text"
                  required
                  placeholder="¿Cuál es el resultado de...?"
                  value={textoPregunta}
                  onChange={(e) => setTextoPregunta(e.target.value)}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { id: 'A', label: 'A', val: opcA, set: setOpcA },
                  { id: 'B', label: 'B', val: opcB, set: setOpcB },
                  { id: 'C', label: 'C', val: opcC, set: setOpcC },
                  { id: 'D', label: 'D', val: opcD, set: setOpcD },
                ].map((opt) => (
                  <div key={opt.id} className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Opción {opt.label}</label>
                    <input
                      type="text"
                      required
                      placeholder={`Opción ${opt.label}`}
                      value={opt.val}
                      onChange={(e) => opt.set(e.target.value)}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Opción Correcta</label>
                  <select
                    value={correcta}
                    onChange={(e) => setCorrecta(e.target.value)}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tiempo de Ronda (s)</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    required
                    value={tiempoPregunta}
                    onChange={(e) => setTiempoPregunta(parseInt(e.target.value) || 20)}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sector Objetivo (Mapa)</label>
                  <select
                    value={sectorObjetivo}
                    onChange={(e) => setSectorObjetivo(e.target.value)}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                  >
                    {SECTORES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-[0_0_12px_rgba(147,51,234,0.25)] transition-all active:scale-95 mt-2"
              >
                Guardar Pregunta en Servidor
              </button>
            </form>
          </div>

          {/* Saved Questions List */}
          <div className="bg-[#140e2e]/50 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md">
            <h2 className="text-slate-400 text-xs font-bold tracking-widest uppercase border-b border-slate-800/60 pb-3 mb-4">
              3. Banco de Preguntas Cargadas
            </h2>

            <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto no-scrollbar py-1">
              {preguntasLocales.map((q, idx) => (
                <div key={idx} className="bg-slate-950/30 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                      Pregunta {idx + 1}
                    </span>
                    <p className="text-white font-black text-sm mt-1.5">{q.texto}</p>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Correcta: <strong className="text-green-400">{q.correcta}</strong></span>
                      <span>Tiempo: <strong className="text-cyan-400">{q.tiempo}s</strong></span>
                      <span>Sector: <strong className="text-yellow-400">{q.sector}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLanzarPregunta(idx, q.sector)}
                    disabled={estadoJuego !== 'JUGANDO' || rondaEnCurso}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all active:scale-95 shrink-0"
                  >
                    🚀 Lanzar al Mapa
                  </button>
                </div>
              ))}
              {preguntasLocales.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6 font-semibold uppercase">
                  No hay preguntas registradas en esta sesión
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
