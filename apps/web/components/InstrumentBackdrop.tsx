'use client';

import { useEffect, useState } from 'react';
import { INSTRUMENTS, InstrumentIcon } from './InstrumentIcon';

// Alterna entre fotos reais de instrumentos com fade suave, cobrindo toda a
// seção de artistas — dá sensação de vida ao app. Fotos ficam bem visíveis
// (opacidade alta); só um véu bem leve pra não brigar com o texto.
export function InstrumentBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % INSTRUMENTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {INSTRUMENTS.map((type, i) => (
        <InstrumentIcon
          key={type}
          type={type}
          width={1200}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]"
          style={{ opacity: i === index ? 0.9 : 0 } as React.CSSProperties}
        />
      ))}
      {/* Véu bem leve — só o suficiente pra não "lavar" o texto, sem escurecer a foto */}
      <div className="absolute inset-0 bg-smix-bg/20" />
    </div>
  );
}
