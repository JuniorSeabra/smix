'use client';

import { useEffect, useState } from 'react';
import { INSTRUMENTS, InstrumentIcon } from './InstrumentIcon';

// Alterna entre ilustrações de instrumentos com fade suave, atrás da
// seção de artistas — dá sensação de vida sem depender de fotos externas.
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
          className="absolute right-4 top-0 w-40 h-40 md:w-56 md:h-56 transition-opacity duration-[1500ms]"
          style={{ opacity: i === index ? 0.06 : 0 } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
