'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

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

export default function AdminAtividadePage() {
  const [tab, setTab] = useState<'downloads' | 'audit'>('downloads');
  const [downloads, setDownloads] = useState<DownloadLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    apiFetch('/admin/downloads')
      .then((res) => (res.ok ? res.json() : []))
      .then(setDownloads);
    apiFetch('/admin/audit-logs')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAuditLogs);
  }, []);

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Atividade</h1>
        <AdminNav current="/admin/atividade" />
      </div>

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
    </main>
  );
}
