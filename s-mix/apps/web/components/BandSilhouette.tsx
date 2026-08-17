'use client';

// Ilustração original (silhueta de banda: baterista, guitarrista, vocalista)
// usada como textura de fundo, bem sutil, atrás das telas escuras.
export function BandSilhouette() {
  return (
    <svg
      className="band-silhouette-bg"
      viewBox="0 0 900 400"
      xmlns="http://www.w3.org/2000/svg"
      fill="#38BDF8"
    >
      {/* Baterista */}
      <g transform="translate(60,120)">
        <circle cx="40" cy="20" r="16" />
        <rect x="26" y="36" width="28" height="55" rx="8" />
        <rect x="10" y="90" width="60" height="10" rx="4" />
        <circle cx="40" cy="105" r="35" fill="none" stroke="#38BDF8" strokeWidth="6" />
        <rect x="0" y="45" width="16" height="45" rx="6" transform="rotate(-25 8 67)" />
        <rect x="60" y="45" width="16" height="45" rx="6" transform="rotate(20 68 67)" />
      </g>

      {/* Vocalista com microfone */}
      <g transform="translate(400,90)">
        <circle cx="50" cy="18" r="17" />
        <rect x="35" y="35" width="30" height="90" rx="10" />
        <rect x="47" y="-10" width="6" height="30" />
        <circle cx="50" cy="-16" r="9" />
        <rect x="5" y="45" width="14" height="70" rx="6" transform="rotate(15 12 80)" />
        <rect x="80" y="45" width="14" height="55" rx="6" transform="rotate(-10 87 72)" />
      </g>

      {/* Guitarrista */}
      <g transform="translate(700,110)">
        <circle cx="40" cy="18" r="16" />
        <rect x="26" y="34" width="28" height="70" rx="9" />
        <ellipse cx="20" cy="95" rx="28" ry="18" transform="rotate(-25 20 95)" />
        <rect x="-10" y="70" width="60" height="8" rx="4" transform="rotate(-25 20 95)" />
        <rect x="55" y="40" width="14" height="55" rx="6" transform="rotate(30 62 67)" />
      </g>

      {/* Ondas de áudio decorativas */}
      <g stroke="#6D5EF5" strokeWidth="4" strokeLinecap="round">
        <line x1="250" y1="250" x2="250" y2="290" />
        <line x1="265" y1="230" x2="265" y2="310" />
        <line x1="280" y1="250" x2="280" y2="290" />
        <line x1="600" y1="250" x2="600" y2="290" />
        <line x1="615" y1="220" x2="615" y2="320" />
        <line x1="630" y1="250" x2="630" y2="290" />
      </g>
    </svg>
  );
}
