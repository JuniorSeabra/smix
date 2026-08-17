'use client';

import { useEffect, useState } from 'react';
import { INSTRUMENTS, InstrumentIcon } from './InstrumentIcon';

// Alterna entre fotos reais de instrumentos com fade suave, atrás da
// seção de artistas — dá sensação de vida ao app.
export function InstrumentBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % INSTRUMENTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-xl2">
      {INSTRUMENTS.map((type, i) => (
        <InstrumentIcon
          key={type}
          type={type}
          width={600}
          className="absolute right-0 top-0 w-52 h-40 md:w-72 md:h-56 rounded-bl-[2rem] transition-opacity duration-[1500ms]"
          style={{ opacity: i === index ? 0.18 : 0 } as React.CSSProperties}
        />
      ))}
      {/* Escurece a foto pra manter o texto da seção legível por cima */}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-smix-bg/40 to-smix-bg" />
    </div>
  );
}
