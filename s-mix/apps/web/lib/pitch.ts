// Detecção de frequência via autocorrelação — roda inteiramente no navegador.
const NOTE_NAMES = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];

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

  const c = new Array(newSize).fill(0);
  for (let lag = 0; lag < newSize; lag++) {
    for (let i = 0; i < newSize - lag; i++) {
      c[lag] += trimmed[i] * trimmed[i + lag];
    }
  }

  let d = 0;
  while (d < newSize - 1 && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < newSize; i++) {
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

  return sampleRate / T0;
}

export function frequencyToNote(frequency: number) {
  const A4 = 440;
  const semitonesFromA4 = 12 * Math.log2(frequency / A4);
  const rounded = Math.round(semitonesFromA4);
  const noteIndex = ((rounded % 12) + 12 + 9) % 12; // +9 desloca A para o índice correto de Dó=0
  const octave = 4 + Math.floor((rounded + 9) / 12);
  const centsOff = (semitonesFromA4 - rounded) * 100;

  return {
    name: NOTE_NAMES[noteIndex],
    octave,
    cents: Math.round(centsOff), // negativo = abaixo, positivo = acima
  };
}
