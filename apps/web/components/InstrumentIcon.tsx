'use client';

// Fotos reais de instrumentos (Unsplash, licença de uso livre/comercial, sem
// necessidade de atribuição — https://unsplash.com/license), usadas tanto como
// selo pequeno no avatar do artista quanto no fundo animado da seção.
export const INSTRUMENTS = ['piano', 'drums', 'guitar', 'bass'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

const INSTRUMENT_PHOTOS: Record<Instrument, string> = {
  piano: 'https://images.unsplash.com/photo-1733576966611-bb7a28dae5ad',
  drums: 'https://images.unsplash.com/photo-1589200675167-86ea14c93292',
  guitar: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02',
  bass: 'https://images.unsplash.com/photo-1531380237034-06caf5a631fe',
};

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: 'Teclado',
  drums: 'Bateria',
  guitar: 'Guitarra',
  bass: 'Baixo',
};

// width/qualidade via query string do CDN da Unsplash — pedimos só o tamanho
// necessário pra cada uso (selo pequeno vs. fundo grande) em vez da foto inteira.
function photoUrl(type: Instrument, width: number) {
  return `${INSTRUMENT_PHOTOS[type]}?auto=format&fit=crop&w=${width}&q=80`;
}

export function InstrumentIcon({
  type,
  className,
  style,
  width = 96,
}: {
  type: Instrument;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(type, width)}
      alt={INSTRUMENT_LABELS[type]}
      className={className}
      style={{ objectFit: 'cover', ...style }}
      loading="lazy"
    />
  );
}
