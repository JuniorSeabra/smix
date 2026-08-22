'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { autoCorrelate, frequencyToNote } from '../../lib/pitch';

// Régua cromática do rodapé, na mesma ordem de um afinador cromático comum.
const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// Faixas de desvio, em cents (centésimos de semitom).
// ±5 é o limite prático de "afinado": abaixo disso o ouvido não distingue, e o
// próprio microfone do celular oscila mais que isso entre leituras.
const CENTS_AFINADO = 5;
const CENTS_PERTO = 20;
// Fim da escala do mostrador: meio semitom pra cada lado. Passou disso, a nota
// detectada já vira a vizinha e o ponteiro reinicia do outro extremo.
const CENTS_MAX = 50;

// Verde afinado, amarelo perto, vermelho longe — a leitura é imediata mesmo com
// o celular apoiado longe, no meio do ensaio, sem precisar interpretar número.
function corPorDesvio(cents: number | null): { hex: string; classe: string } {
  if (cents === null) return { hex: '#3f4451', classe: 'text-smix-muted' };
  const desvio = Math.abs(cents);
  if (desvio <= CENTS_AFINADO) return { hex: '#22c55e', classe: 'text-green-500' };
  if (desvio <= CENTS_PERTO) return { hex: '#eab308', classe: 'text-yellow-500' };
  return { hex: '#ef4444', classe: 'text-red-500' };
}

export default function TunerPage() {
  const [listening, setListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [note, setNote] = useState<{ name: string; octave: number; cents: number } | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startListening() {
    setPermissionError(null);
    try {
      // Sem os processamentos que o navegador aplica por padrão: cancelamento
      // de eco e ganho automático existem pra voz em chamada e deformam uma
      // corda sustentada, que é justamente o que queremos medir.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setListening(true);
      tick();
    } catch {
      setPermissionError('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
    }
  }

  function stopListening() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Encerrar as tracks também: fechar só o AudioContext deixa o indicador de
    // microfone do celular aceso, como se o app continuasse ouvindo.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    setListening(false);
    setNote(null);
    setFrequency(null);
  }

  function tick() {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    if (!analyser || !audioCtx) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const freq = autoCorrelate(buffer, audioCtx.sampleRate);
    if (freq) {
      setFrequency(freq);
      setNote(frequencyToNote(freq));
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const cents = note ? note.cents : null;
  const cor = corPorDesvio(cents);
  const afinado = cents !== null && Math.abs(cents) <= CENTS_AFINADO;

  // Ponteiro: -50 cents vira -45°, afinado fica na vertical, +50 cents vira +45°.
  const angulo = cents === null ? 0 : Math.max(-CENTS_MAX, Math.min(CENTS_MAX, cents)) * 0.9;

  const marcacoes = [-45, -30, -15, 0, 15, 30, 45];
  const CX = 100;
  const CY = 150;

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-6 flex flex-col items-center max-w-sm mx-auto">
        <div
          className="w-full rounded-xl2 border-2 bg-smix-bg transition-colors duration-300 px-5 py-6 flex flex-col items-center"
          style={{ borderColor: cor.hex }}
        >
          <div
            className="flex items-baseline gap-1 transition-colors duration-300"
            style={{ color: cor.hex }}
          >
            <span className="text-7xl font-bold leading-none">{note ? note.name : '—'}</span>
            {note && <span className="text-2xl font-semibold">{note.octave}</span>}
          </div>

          <p className="text-smix-muted text-sm mt-2 h-5">
            {frequency ? `${frequency.toFixed(1)} Hz` : listening ? 'Ouvindo...' : ''}
          </p>

          <div className="relative w-full mt-4" style={{ aspectRatio: '1 / 0.85' }}>
            <svg viewBox="0 0 200 170" className="w-full h-full">
              {marcacoes.map((graus) => {
                const centro = graus === 0;
                const rad = ((graus - 90) * Math.PI) / 180;
                const r1 = centro ? 96 : 100;
                const r2 = centro ? 78 : 86;
                return (
                  <g key={graus}>
                    <line
                      x1={CX + r1 * Math.cos(rad)}
                      y1={CY + r1 * Math.sin(rad)}
                      x2={CX + r2 * Math.cos(rad)}
                      y2={CY + r2 * Math.sin(rad)}
                      stroke={centro ? cor.hex : '#4b5563'}
                      strokeWidth={centro ? 3 : 2}
                      strokeLinecap="round"
                      className="transition-colors duration-300"
                    />
                    {/* A marca do centro é dupla, como num afinador de ponteiro:
                        é a referência que o músico procura acertar. */}
                    {centro && (
                      <line
                        x1={CX + r1 * Math.cos(rad) + 7}
                        y1={CY + r1 * Math.sin(rad)}
                        x2={CX + r2 * Math.cos(rad) + 7}
                        y2={CY + r2 * Math.sin(rad)}
                        stroke={cor.hex}
                        strokeWidth={3}
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />
                    )}
                  </g>
                );
              })}

              {/* Bemol de um lado, sustenido do outro: o lado pra onde o
                  ponteiro cai já diz se a nota está baixa ou alta. */}
              <text x="14" y="120" fill="#6b7280" fontSize="18">♭</text>
              <text x="174" y="120" fill="#6b7280" fontSize="18">♯</text>

              <g
                style={{
                  transform: `rotate(${angulo}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: 'transform 120ms linear',
                }}
              >
                <line
                  x1={CX}
                  y1={CY}
                  x2={CX}
                  y2={48}
                  stroke={cor.hex}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-colors duration-300"
                />
              </g>

              <circle cx={CX} cy={CY} r="9" fill="none" stroke="#4b5563" strokeWidth="2" />
              <circle cx={CX} cy={CY} r="3.5" fill={cor.hex} className="transition-colors duration-300" />
            </svg>
          </div>

          <div className="w-full flex justify-between mt-1">
            {CHROMATIC.map((n) => {
              const atual = note?.name === n;
              return (
                <div key={n} className="flex flex-col items-center gap-1 flex-1">
                  <span
                    className={`text-[10px] transition-colors duration-300 ${
                      atual ? 'font-bold' : 'text-smix-muted'
                    }`}
                    style={atual ? { color: cor.hex } : undefined}
                  >
                    {n}
                  </span>
                  <span
                    className="h-[3px] w-3 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: atual ? cor.hex : 'transparent' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <p className={`mt-4 text-sm font-medium h-5 transition-colors duration-300 ${cor.classe}`}>
          {!note
            ? ''
            : afinado
              ? 'Afinado ✓'
              : cents !== null && cents < 0
                ? 'Está baixo — aperte a corda'
                : 'Está alto — solte a corda'}
        </p>

        {permissionError && <p className="text-red-400 text-sm text-center mt-3">{permissionError}</p>}

        <button
          onClick={listening ? stopListening : startListening}
          className={`w-full rounded-xl2 py-3 font-medium text-sm transition mt-4 ${
            listening ? 'bg-smix-surface border border-smix-border' : 'bg-smix-primary hover:opacity-90'
          }`}
        >
          {listening ? 'Parar' : 'Ativar microfone'}
        </button>

        <p className="text-smix-muted text-xs text-center mt-3">
          Toque uma nota por vez, perto do microfone. Vermelho é longe, amarelo é perto, verde é afinado.
        </p>
      </div>
    </main>
  );
}
