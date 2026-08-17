'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { autoCorrelate, frequencyToNote } from '../../lib/pitch';

export default function TunerPage() {
  const [listening, setListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [note, setNote] = useState<{ name: string; octave: number; cents: number } | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  async function startListening() {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setListening(true);
      tick();
    } catch (err) {
      setPermissionError('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
    }
  }

  function stopListening() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
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
      audioCtxRef.current?.close();
    };
  }, []);

  const inTune = note ? Math.abs(note.cents) <= 5 : false;

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-8 flex flex-col items-center gap-8 max-w-sm mx-auto">
        <h1 className="text-2xl font-bold">Afinador</h1>

        {/* Mostrador principal */}
        <div className="w-full flex flex-col items-center gap-3">
          <div
            className={`text-6xl font-bold transition-colors ${
              note ? (inTune ? 'text-green-400' : 'text-smix-text') : 'text-smix-muted'
            }`}
          >
            {note ? `${note.name}${note.octave}` : '—'}
          </div>

          {frequency && (
            <p className="text-smix-muted text-sm">{frequency.toFixed(1)} Hz</p>
          )}

          {/* Indicador visual de desvio */}
          <div className="w-full h-3 rounded-full bg-smix-surface border border-smix-border relative overflow-hidden mt-2">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-smix-border" />
            {note && (
              <div
                className={`absolute top-0 bottom-0 w-2 rounded-full transition-all ${
                  inTune ? 'bg-green-400' : 'bg-smix-accent'
                }`}
                style={{
                  left: `calc(50% + ${Math.max(-45, Math.min(45, note.cents)) * 1}% - 4px)`,
                }}
              />
            )}
          </div>
          <div className="w-full flex justify-between text-xs text-smix-muted">
            <span>Abaixo</span>
            <span>{inTune ? 'Afinado ✓' : note ? (note.cents < 0 ? 'Suba um pouco' : 'Desça um pouco') : ''}</span>
            <span>Acima</span>
          </div>
        </div>

        {permissionError && (
          <p className="text-red-400 text-sm text-center">{permissionError}</p>
        )}

        <button
          onClick={listening ? stopListening : startListening}
          className={`w-full rounded-xl2 py-3 font-medium text-sm transition ${
            listening ? 'bg-smix-surface border border-smix-border' : 'bg-smix-primary hover:opacity-90'
          }`}
        >
          {listening ? 'Parar' : 'Ativar microfone'}
        </button>

        <p className="text-smix-muted text-xs text-center">
          Toque uma nota no seu instrumento perto do microfone do dispositivo.
        </p>
      </div>
    </main>
  );
}
