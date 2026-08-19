'use client';

// Gráficos do painel, feitos com layout puro (flex/grid) em vez de biblioteca:
// escalam sozinhos em qualquer largura, sem depender de medir o container em
// JS — que é onde gráfico em canvas costuma quebrar no celular.
//
// Todos recebem números já apurados da API. Nenhum valor é gerado aqui.

export type BarDatum = { label: string; value: number; hint?: string };

const BAR_COLORS = ['#6D5EF5', '#38BDF8', '#8B5CF6', '#22D3EE', '#A78BFA', '#0EA5E9'];

/** Barras horizontais — bom pra comparar categorias com nomes longos. */
export function HorizontalBars({ data, unit }: { data: BarDatum[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline gap-3 text-xs">
            <span className="text-smix-muted truncate" title={d.hint ?? d.label}>
              {d.label}
            </span>
            <span className="text-smix-text font-semibold tabular-nums flex-shrink-0">
              {d.value.toLocaleString('pt-BR')}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-smix-bg overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-smix-muted text-sm">Sem dados ainda.</p>}
    </div>
  );
}

/** Colunas por dia — série temporal curta (últimos N dias). */
export function DailyColumns({ data, color = '#38BDF8' }: { data: BarDatum[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="text-smix-muted text-sm">Nenhum registro no período.</p>;
  }

  return (
    <div className="flex items-end gap-[3px] sm:gap-1 h-32 md:h-40">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 group">
          <span className="text-[10px] text-smix-text opacity-0 group-hover:opacity-100 transition tabular-nums">
            {d.value}
          </span>
          <div
            title={`${d.hint ?? d.label}: ${d.value}`}
            className="w-full rounded-t-sm transition-all duration-700 min-h-[2px]"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: color,
              opacity: d.value === 0 ? 0.15 : 0.85,
            }}
          />
          <span className="text-[9px] sm:text-[10px] text-smix-muted truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Cartão numérico com um "anel" de proporção em relação a um total. */
export function DonutStat({
  label,
  value,
  total,
  color = '#6D5EF5',
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-4 flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="w-16 h-16 flex-shrink-0 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#070B14" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="min-w-0">
        <p className="text-smix-muted text-xs">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('pt-BR')}</p>
        <p className="text-smix-muted text-[11px]">
          {pct}% de {total.toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

/** Moldura padrão de um gráfico, pra manter todos com o mesmo visual. */
export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl2 bg-smix-surface border border-smix-border p-4 md:p-5">
      <h2 className="text-sm font-medium text-smix-text">{title}</h2>
      {subtitle && <p className="text-smix-muted text-xs mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}
