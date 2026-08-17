'use client';

export function TabletMultitrackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Corpo do tablet */}
      <rect x="10" y="5" width="180" height="130" rx="14" fill="#131C30" stroke="#243248" strokeWidth="2" />
      <rect x="20" y="16" width="160" height="108" rx="6" fill="#070B14" />

      {/* Faixas do multitrack (stems) coloridas, tipo DAW */}
      {[
        { y: 24, color: '#6D5EF5', w: 0.9 },
        { y: 40, color: '#38BDF8', w: 0.6 },
        { y: 56, color: '#6D5EF5', w: 0.75 },
        { y: 72, color: '#38BDF8', w: 0.45 },
        { y: 88, color: '#6D5EF5', w: 0.85 },
        { y: 104, color: '#38BDF8', w: 0.55 },
      ].map((track, i) => (
        <g key={i}>
          <rect x="26" y={track.y} width="148" height="10" rx="3" fill="#0D1526" />
          <rect x="26" y={track.y} width={148 * track.w} height="10" rx="3" fill={track.color} opacity="0.85" />
        </g>
      ))}

      {/* Playhead */}
      <line x1="95" y1="20" x2="95" y2="118" stroke="#F1F5FB" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
