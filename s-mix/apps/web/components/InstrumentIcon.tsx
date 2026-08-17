'use client';

// Ilustrações originais e simples de instrumentos, usadas tanto como
// selo pequeno no avatar do artista quanto no fundo animado da seção.
export const INSTRUMENTS = ['piano', 'drums', 'guitar', 'bass'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export function InstrumentIcon({
  type,
  className,
  style,
}: {
  type: Instrument;
  className?: string;
  style?: React.CSSProperties;
}) {
  switch (type) {
    case 'piano':
      return (
        <svg viewBox="0 0 40 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="32" height="20" rx="2" fill="#F1F5FB" />
          {[0, 4.5, 9, 13.5, 18, 22.5, 27].map((x, i) => (
            <rect key={i} x={4 + x} y="12" width="4.3" height="20" fill="none" stroke="#243248" strokeWidth="0.6" />
          ))}
          {[3, 7.5, 16, 20.5, 25].map((x, i) => (
            <rect key={i} x={4 + x} y="12" width="3" height="12" fill="#070B14" />
          ))}
        </svg>
      );
    case 'drums':
      return (
        <svg viewBox="0 0 40 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="20" cy="14" rx="14" ry="6" fill="#F1F5FB" />
          <path d="M6 14 L9 30 A14 5 0 0 0 31 30 L34 14" fill="none" stroke="#F1F5FB" strokeWidth="2" />
          <ellipse cx="20" cy="14" rx="14" ry="6" fill="none" stroke="#243248" strokeWidth="1" />
          <line x1="10" y1="6" x2="4" y2="0" stroke="#F1F5FB" strokeWidth="2" />
          <line x1="28" y1="6" x2="34" y2="0" stroke="#F1F5FB" strokeWidth="2" />
        </svg>
      );
    case 'guitar':
      return (
        <svg viewBox="0 0 40 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="16" cy="27" rx="11" ry="9" fill="#F1F5FB" />
          <ellipse cx="16" cy="27" rx="4" ry="3.2" fill="#070B14" />
          <rect x="18" y="4" width="4" height="20" rx="1.5" fill="#F1F5FB" transform="rotate(15 20 14)" />
        </svg>
      );
    case 'bass':
      return (
        <svg viewBox="0 0 40 40" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="15" cy="26" rx="12" ry="10" fill="#F1F5FB" />
          <rect x="17" y="2" width="5" height="24" rx="1.5" fill="#F1F5FB" transform="rotate(12 19.5 14)" />
          <circle cx="15" cy="26" r="3.5" fill="#070B14" />
        </svg>
      );
  }
}
