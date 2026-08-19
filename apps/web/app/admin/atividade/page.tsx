'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';
import { AdminBottomNav } from '../../../components/AdminBottomNav';
import { ChartCard, DailyColumns, DonutStat, HorizontalBars } from '../../../components/Charts';

type DownloadLog = {
  id: string;
  ip: string | null;
  createdAt: string;
  user: { name: string; email: string };
  file: { name: string };
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  admin: { name: string };
};

type Stats = {
  totals: {
    totalUsers: number;
    activeSubscriptions: number;
    totalArtists: number;
    totalSongs: number;
    totalDownloads: number;
    pendingMessages: number;
  };
  downloadsPerDay: { date: string; count: number }[];
  auditPerDay: { date: string; count: number }[];
  topDownloads: { fileId: string; title: string; artist: string; count: number }[];
};

// "2026-08-19" -> "19/08". Corta a string em vez de usar new Date(), que
// interpretaria a data como UTC e poderia mostrar o dia anterior no Brasil.
function shortDay(isoDate: string) {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

function fullDay(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function AdminAtividadePage() {
  const [tab, setTab] = useState<'downloads' | 'audit'>('downloads');
  const [downloads, setDownloads] = useState<DownloadLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/admin/downloads')
      .then((res) => (res.ok ? res.json() : []))
      .then(setDownloads);
    apiFetch('/admin/audit-logs')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAuditLogs);
    // Todos os números dos gráficos vêm daqui, já agregados no banco.
    apiFetch('/admin/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar os indicadores.');
        return res.json();
      })
      .then(setStats)
      .catch((err) => setStatsError(err.message));
  }, []);

  const totalDownloads14d = stats?.downloadsPerDay.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const totalAudit14d = stats?.auditPerDay.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <main className="min-h-screen px-5 md:px-6 py-8 max-w-4xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Atividade</h1>
        <AdminNav current="/admin/atividade" />
      </div>

      {statsError && <p className="text-red-400 text-sm mb-6">{statsError}</p>}
      {!stats && !statsError && <p className="text-smix-muted text-sm mb-6">Carregando indicadores...</p>}

      {stats && (
        <div className="flex flex-col gap-4 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DonutStat
              label="Downloads nos últimos 14 dias"
              value={totalDownloads14d}
              total={stats.totals.totalDownloads}
              color="#38BDF8"
            />
            <DonutStat
              label="Assinaturas ativas"
              value={stats.totals.activeSubscriptions}
              total={stats.totals.totalUsers}
              color="#6D5EF5"
            />
          </div>

          <ChartCard
            title="Downloads por dia"
            subtitle={`Últimos 14 dias · ${totalDownloads14d} no período · ${stats.totals.totalDownloads} no total`}
          >
            <DailyColumns
              color="#38BDF8"
              data={stats.downloadsPerDay.map((d) => ({
                label: shortDay(d.date),
                value: d.count,
                hint: fullDay(d.date),
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Ações de admin por dia"
            subtitle={`Últimos 14 dias · ${totalAudit14d} ação(ões) registrada(s)`}
          >
            <DailyColumns
              color="#6D5EF5"
              data={stats.auditPerDay.map((d) => ({
                label: shortDay(d.date),
                value: d.count,
                hint: fullDay(d.date),
              }))}
            />
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Acervo e usuários" subtitle="Totais atuais no banco">
              <HorizontalBars
                data={[
                  { label: 'Usuários', value: stats.totals.totalUsers },
                  { label: 'Assinaturas ativas', value: stats.totals.activeSubscriptions },
                  { label: 'Artistas', value: stats.totals.totalArtists },
                  { label: 'Músicas', value: stats.totals.totalSongs },
                  { label: 'Downloads', value: stats.totals.totalDownloads },
                  { label: 'Conversas abertas', value: stats.totals.pendingMessages },
                ]}
              />
            </ChartCard>

            <ChartCard title="Arquivos mais baixados" subtitle="Top 5 de todo o período">
              <HorizontalBars
                unit="downloads"
                data={stats.topDownloads.map((d) => ({
                  label: d.artist ? `${d.title} — ${d.artist}` : d.title,
                  value: d.count,
                  hint: d.title,
                }))}
              />
            </ChartCard>
          </div>
        </div>
      )}

      <h2 className="text-sm text-smix-muted mb-3">Registros detalhados</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('downloads')}
          className={`rounded-lg px-4 py-2 text-sm border ${
            tab === 'downloads' ? 'border-smix-accent text-smix-accent' : 'border-smix-border text-smix-muted'
          }`}
        >
          Downloads
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`rounded-lg px-4 py-2 text-sm border ${
            tab === 'audit' ? 'border-smix-accent text-smix-accent' : 'border-smix-border text-smix-muted'
          }`}
        >
          Ações de admin
        </button>
      </div>

      {tab === 'downloads' && (
        <div className="flex flex-col gap-2">
          {downloads.map((d) => (
            <div key={d.id} className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm">
              <p>{d.file.name}</p>
              <p className="text-smix-muted text-xs">
                {d.user.name} ({d.user.email}) · {new Date(d.createdAt).toLocaleString('pt-BR')}
                {d.ip && ` · IP ${d.ip}`}
              </p>
            </div>
          ))}
          {downloads.length === 0 && <p className="text-smix-muted text-sm">Nenhum download registrado ainda.</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="flex flex-col gap-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm">
              <p>
                {log.admin.name} — <span className="text-smix-accent">{log.action}</span> em {log.entity}
              </p>
              <p className="text-smix-muted text-xs">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="text-smix-muted text-sm">Nenhuma ação registrada ainda.</p>}
        </div>
      )}

      <AdminBottomNav current="/admin/atividade" />
    </main>
  );
}
