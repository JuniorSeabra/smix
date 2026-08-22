// Detecção de frequência via autocorrelação — roda inteiramente no navegador.

// Cifra (C, D, E...) e não a nomenclatura latina (Dó, Ré, Mi): é o que aparece
// em afinador, é o que a régua cromática da tela mostra, e antes as duas
// convenções conviviam — a régua comparava com "A"/"C#" enquanto daqui saía
// "Lá"/"Dó#", então a nota detectada nunca acendia na régua.
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Faixa útil de um afinador de instrumento: da corda mais grave de um baixo
// (~41Hz) ao topo da região onde ainda se afina corda (~1300Hz). Limitar isso
// é o que torna a autocorrelação viável no celular — ver o comentário em
// autoCorrelate.
const FREQ_MIN = 40;
const FREQ_MAX = 1300;

export function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // sinal fraco demais / silêncio

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  const trimmed = buffer.slice(r1, r2);
  const newSize = trimmed.length;

  // Só os lags que correspondem a alguma nota tocável.
  //
  // A versão anterior varria TODOS os lags de 0 a newSize, com um laço dentro
  // do outro: em 2048 amostras isso passa de 2 milhões de multiplicações por
  // quadro, 60 vezes por segundo. Era o que travava o afinador no celular.
  // Como só interessa de 40Hz a 1300Hz, o lag útil vai de sampleRate/1300 a
  // sampleRate/40 — a 44.1kHz, de 34 a 1102 em vez de 0 a 2048, e a maior
  // parte do custo estava justamente nos lags curtos, que agora saem fora.
  const lagMin = Math.max(2, Math.floor(sampleRate / FREQ_MAX));
  const lagMax = Math.min(newSize - 1, Math.ceil(sampleRate / FREQ_MIN));
  if (lagMax <= lagMin) return null;

  const c = new Float32Array(lagMax + 1);
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let soma = 0;
    for (let i = 0; i < newSize - lag; i++) {
      soma += trimmed[i] * trimmed[i + lag];
    }
    c[lag] = soma;
  }

  // Primeiro vale depois do pico inicial: a partir dali procuramos o pico real,
  // senão o máximo cai sempre no lag mínimo (onde o sinal se parece consigo).
  let d = lagMin;
  while (d < lagMax && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i <= lagMax; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }

  let T0 = maxPos;
  if (T0 <= 0) return null;

  // Interpolação parabólica para maior precisão
  const x1 = c[T0 - 1] ?? c[T0];
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? c[T0];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < FREQ_MIN || freq > FREQ_MAX) return null;
  return freq;
}

export function frequencyToNote(frequency: number) {
  const A4 = 440;
  const semitonesFromA4 = 12 * Math.log2(frequency / A4);
  const rounded = Math.round(semitonesFromA4);
  const noteIndex = ((rounded % 12) + 12 + 9) % 12; // +9 desloca A para o índice correto de C=0
  const octave = 4 + Math.floor((rounded + 9) / 12);
  const centsOff = (semitonesFromA4 - rounded) * 100;

  return {
    name: NOTE_NAMES[noteIndex],
    octave,
    cents: Math.round(centsOff), // negativo = abaixo, positivo = acima
  };
}
