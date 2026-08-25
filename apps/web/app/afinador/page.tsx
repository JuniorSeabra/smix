'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { autoCorrelate, frequencyToNote } from '../../lib/pitch';

// Régua cromática do rodapé, na mesma ordem de um afinador cromático.
const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

// ±5 cents é o limite prático de "afinado": abaixo disso o ouvido não distingue,
// e a própria leitura do microfone oscila mais que isso entre quadros.
const CENTS_AFINADO = 5;
// Fim da escala do mostrador: meio semitom pra cada lado. Passou disso, a nota
// detectada já vira a vizinha e o ponteiro reinicia do outro extremo.
const CENTS_MAX = 50;

// Analisar 20 vezes por segundo, não a cada quadro.
//
// A versão anterior chamava autoCorrelate dentro do requestAnimationFrame e
// dava setState em todas as 60 execuções por segundo — análise pesada mais
// re-render do React na mesma cadência, o que travava o afinador no celular.
// 20 leituras por segundo é mais rápido do que a mão consegue girar a tarraxa,
// e o ponteiro continua parecendo contínuo porque a animação é feita em CSS.
const INTERVALO_ANALISE_MS = 50;

// Peso da leitura nova contra o que já estava na tela. Cada leitura isolada
// oscila alguns cents, e sem suavizar o ponteiro treme e a cor pisca entre
// verde e laranja com a corda parada.
const SUAVIZACAO = 0.25;

// Quanto tempo sem detectar nota até limpar a tela. Sem essa espera, a nota
// pisca e some no intervalo natural entre uma dedilhada e outra.
const SILENCIO_MS = 900;

// Cores no esquema do afinador do Cifra Club: verde quando centralizado,
// laranja quando a nota está baixa (apertar a corda) e vermelho quando está
// alta (afrouxar). A cor sozinha já diz o que fazer, sem ler texto nenhum.
function corPorDesvio(cents: number | null): { hex: string; classe: string } {
  if (cents === null) return { hex: '#3f4451', classe: 'text-smix-muted' };
  if (Math.abs(cents) <= CENTS_AFINADO) return { hex: '#22c55e', classe: 'text-green-500' };
  if (cents < 0) return { hex: '#f97316', classe: 'text-orange-500' };
  return { hex: '#ef4444', classe: 'text-red-500' };
}

type Leitura = { name: string; octave: number; cents: number; freq: number };

// O tipo exato que getFloatTimeDomainData aceita, tirado da própria assinatura.
//
// Versões recentes do TypeScript tornaram Float32Array genérico no buffer que o
// sustenta, e um `new Float32Array(n)` guardado em useRef vira
// Float32Array<ArrayBufferLike>, que não é aceito onde se espera
// Float32Array<ArrayBuffer>. Derivar o tipo daqui resolve sem fixar uma forma
// que só existe a partir de certa versão.
type BufferAnalise = Parameters<AnalyserNode['getFloatTimeDomainData']>[0];

export default function TunerPage() {
  const [listening, setListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<Leitura | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferRef = useRef<BufferAnalise | null>(null);
  // Valores suavizados vivem em ref, não em estado: são atualizados a cada
  // análise e só viram render depois de arredondados.
  const centsSuaveRef = useRef<number | null>(null);
  const freqSuaveRef = useRef<number | null>(null);
  const ultimaDeteccaoRef = useRef<number>(0);
  // Espelho da leitura atual. analisar() roda dentro de um setInterval criado
  // uma única vez, e o closure dele congelaria `leitura` no valor inicial
  // (null) — a troca de nota nunca seria detectada e a suavização arrastaria a
  // média de uma corda para a seguinte.
  const leituraRef = useRef<Leitura | null>(null);

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
      // Um buffer só, reaproveitado: alocar 2048 floats 20 vezes por segundo
      // enche a memória de lixo e faz o coletor rodar no meio da afinação.
      bufferRef.current = new Float32Array(
        new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
      ) as BufferAnalise;
      centsSuaveRef.current = null;
      freqSuaveRef.current = null;

      setListening(true);
      timerRef.current = setInterval(analisar, INTERVALO_ANALISE_MS);
    } catch {
      setPermissionError('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
    }
  }

  function stopListening() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    // Encerrar as tracks também: fechar só o AudioContext deixa o indicador de
    // microfone do celular aceso, como se o app continuasse ouvindo.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    leituraRef.current = null;
    setLeitura(null);
  }

  function analisar() {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    const buffer = bufferRef.current;
    if (!analyser || !audioCtx || !buffer) return;

    analyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, audioCtx.sampleRate);

    if (!freq) {
      if (leituraRef.current && Date.now() - ultimaDeteccaoRef.current > SILENCIO_MS) {
        centsSuaveRef.current = null;
        freqSuaveRef.current = null;
        leituraRef.current = null;
        setLeitura(null);
      }
      return;
    }

    ultimaDeteccaoRef.current = Date.now();
    const nota = frequencyToNote(freq);

    // Ao trocar de nota, começa do valor novo em vez de arrastar a média da
    // nota anterior — senão o ponteiro atravessa o mostrador devagar toda vez
    // que o músico passa pra outra corda.
    const anterior = leituraRef.current;
    const trocouNota = anterior?.name !== nota.name || anterior?.octave !== nota.octave;
    const centsAnterior = trocouNota ? null : centsSuaveRef.current;
    const freqAnterior = trocouNota ? null : freqSuaveRef.current;

    const cents = centsAnterior === null
      ? nota.cents
      : centsAnterior + (nota.cents - centsAnterior) * SUAVIZACAO;
    const freqSuave = freqAnterior === null
      ? freq
      : freqAnterior + (freq - freqAnterior) * SUAVIZACAO;

    centsSuaveRef.current = cents;
    freqSuaveRef.current = freqSuave;

    const centsArredondado = Math.round(cents);
    const freqArredondada = Math.round(freqSuave * 10) / 10;

    // Só re-renderiza quando algo mudou de verdade na tela. Com a corda parada
    // e a leitura estável, isso zera o trabalho do React entre as análises.
    if (
      anterior &&
      anterior.name === nota.name &&
      anterior.octave === nota.octave &&
      anterior.cents === centsArredondado &&
      anterior.freq === freqArredondada
    ) {
      return;
    }

    const nova = { name: nota.name, octave: nota.octave, cents: centsArredondado, freq: freqArredondada };
    leituraRef.current = nova;
    setLeitura(nova);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const cents = leitura ? leitura.cents : null;
  const cor = corPorDesvio(cents);
  const afinado = cents !== null && Math.abs(cents) <= CENTS_AFINADO;

  // Ponteiro: -50 cents vira -45°, afinado fica na vertical, +50 cents vira +45°.
  const angulo = cents === null ? 0 : Math.max(-CENTS_MAX, Math.min(CENTS_MAX, cents)) * 0.9;

  const marcacoes = [-45, -30, -15, 0, 15, 30, 45];
  const CX = 100;
  const CY = 150;

  return (
    <main className="min-h-screen pb-28">
      <Header />
      <BottomNav />

      <div className="px-5 mt-6 flex flex-col items-center max-w-sm mx-auto">
        <div
          className="w-full rounded-xl2 border-2 bg-smix-bg transition-colors duration-200 px-5 py-6 flex flex-col items-center"
          style={{ borderColor: cor.hex }}
        >
          <div
            className="flex items-baseline gap-1 transition-colors duration-200"
            style={{ color: cor.hex }}
          >
            <span className="text-7xl font-bold leading-none">{leitura ? leitura.name : '—'}</span>
            {leitura && <span className="text-2xl font-semibold">{leitura.octave}</span>}
          </div>

          <p className="text-smix-muted text-sm mt-2 h-5">
            {leitura ? `${leitura.freq.toFixed(1)} Hz` : listening ? 'Ouvindo...' : ''}
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
                      className="transition-colors duration-200"
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
                        className="transition-colors duration-200"
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
                  transition: 'transform 90ms linear',
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
                  className="transition-colors duration-200"
                />
              </g>

              <circle cx={CX} cy={CY} r="9" fill="none" stroke="#4b5563" strokeWidth="2" />
              <circle cx={CX} cy={CY} r="3.5" fill={cor.hex} className="transition-colors duration-200" />
            </svg>
          </div>

          <div className="w-full flex justify-between mt-1">
            {CHROMATIC.map((n) => {
              const atual = leitura?.name === n;
              return (
                <div key={n} className="flex flex-col items-center gap-1 flex-1">
                  <span
                    className={`text-[10px] transition-colors duration-200 ${
                      atual ? 'font-bold' : 'text-smix-muted'
                    }`}
                    style={atual ? { color: cor.hex } : undefined}
                  >
                    {n}
                  </span>
                  <span
                    className="h-[3px] w-3 rounded-full transition-colors duration-200"
                    style={{ backgroundColor: atual ? cor.hex : 'transparent' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <p className={`mt-4 text-sm font-medium h-5 transition-colors duration-200 ${cor.classe}`}>
          {!leitura
            ? ''
            : afinado
              ? 'Afinado ✓'
              : cents !== null && cents < 0
                ? 'Está baixo — aperte a corda'
                : 'Está alto — afrouxe a corda'}
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
          Toque uma corda por vez, perto do microfone. Laranja é apertar, vermelho é afrouxar, verde é afinado.
        </p>
      </div>
    </main>
  );
}
