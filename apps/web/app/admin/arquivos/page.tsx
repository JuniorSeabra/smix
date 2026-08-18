'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Song = { id: string; title: string; artist: { name: string } };
type License = { id: string; name: string; type: string };
type FileItem = {
  id: string;
  name: string;
  type: string;
  googleDriveFileId: string;
  status: string;
  song: { title: string };
  license: { name: string } | null;
};

export default function AdminArquivosPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const [songId, setSongId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('full');
  const [googleDriveFileId, setGoogleDriveFileId] = useState('');
  const [licenseId, setLicenseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [licenseName, setLicenseName] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [savingLicense, setSavingLicense] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function load() {
    const [songsRes, licensesRes, filesRes] = await Promise.all([
      apiFetch('/admin/songs'),
      apiFetch('/admin/files/licenses'),
      apiFetch('/admin/files'),
    ]);
    if (songsRes.ok) {
      const list = await songsRes.json();
      setSongs(list);
      if (list.length > 0) setSongId((prev) => prev || list[0].id);
    }
    if (licensesRes.ok) setLicenses(await licensesRes.json());
    if (filesRes.ok) setFiles(await filesRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateFile(e: React.FormEvent) {
    e.preventDefault();
    if (!songId || !name.trim() || !googleDriveFileId.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/admin/files', {
        method: 'POST',
        body: JSON.stringify({
          songId,
          name: name.trim(),
          type,
          googleDriveFileId: googleDriveFileId.trim(),
          licenseId: licenseId || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Erro ao vincular arquivo');
      }
      setName('');
      setGoogleDriveFileId('');
      setMessage('Arquivo vinculado com sucesso.');
      load();
    } catch (err: any) {
      setMessage(err.message ?? 'Erro ao vincular arquivo');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestFile() {
    if (!googleDriveFileId.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch(`/admin/google-drive/files/${encodeURIComponent(googleDriveFileId.trim())}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Arquivo não encontrado no Drive');
      }
      const meta = await res.json();
      const sizeMb = meta.size ? (meta.size / 1024 / 1024).toFixed(1) : '?';
      setTestResult({ ok: true, message: `Encontrado: ${meta.name} (${sizeMb} MB)` });
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message ?? 'Erro ao testar arquivo' });
    } finally {
      setTesting(false);
    }
  }

  async function handleCreateLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!licenseName.trim() || !licenseType.trim()) return;
    setSavingLicense(true);
    try {
      const res = await apiFetch('/admin/files/licenses', {
        method: 'POST',
        body: JSON.stringify({ name: licenseName.trim(), type: licenseType.trim() }),
      });
      if (res.ok) {
        setLicenseName('');
        setLicenseType('');
        load();
      }
    } finally {
      setSavingLicense(false);
    }
  }

  async function toggleFileStatus(file: FileItem) {
    const nextStatus = file.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiFetch(`/admin/files/${file.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) load();
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Arquivos & Licenças</h1>
        <nav className="flex gap-4 text-sm text-smix-muted">
          <a href="/admin" className="hover:text-smix-text transition">Dashboard</a>
          <a href="/admin/artistas" className="hover:text-smix-text transition">Artistas</a>
          <a href="/admin/musicas" className="hover:text-smix-text transition">Músicas</a>
          <a href="/admin/arquivos" className="text-smix-text">Arquivos</a>
          <a href="/admin/usuarios" className="hover:text-smix-text transition">Usuários</a>
        </nav>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <form onSubmit={handleCreateFile} className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3">
          <h2 className="text-sm text-smix-muted">Vincular arquivo do Google Drive</h2>
          <select
            value={songId}
            onChange={(e) => setSongId(e.target.value)}
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          >
            {songs.length === 0 && <option value="">Cadastre uma música primeiro</option>}
            {songs.map((song) => (
              <option key={song.id} value={song.id}>{song.title} — {song.artist.name}</option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do arquivo (ex: Playback completo)"
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          >
            <option value="full">Completo (playback)</option>
            <option value="stem-drums">Stem — Bateria</option>
            <option value="stem-bass">Stem — Baixo</option>
            <option value="stem-guitar">Stem — Guitarra</option>
            <option value="stem-keys">Stem — Teclado</option>
            <option value="stem-vocals">Stem — Vocais</option>
            <option value="click">Click</option>
            <option value="guide">Guide</option>
          </select>
          <div className="flex gap-2">
            <input
              value={googleDriveFileId}
              onChange={(e) => {
                setGoogleDriveFileId(e.target.value);
                setTestResult(null);
              }}
              placeholder="ID do arquivo no Google Drive"
              className="flex-1 rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
            />
            <button
              type="button"
              onClick={handleTestFile}
              disabled={testing || !googleDriveFileId.trim()}
              className="rounded-lg border border-smix-border px-3 py-2 text-xs hover:border-smix-accent transition disabled:opacity-50 whitespace-nowrap"
            >
              {testing ? 'Testando...' : 'Testar arquivo'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? 'text-smix-accent' : 'text-red-400'}`}>{testResult.message}</p>
          )}
          <select
            value={licenseId}
            onChange={(e) => setLicenseId(e.target.value)}
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          >
            <option value="">Sem licença vinculada</option>
            {licenses.map((license) => (
              <option key={license.id} value={license.id}>{license.name} ({license.type})</option>
            ))}
          </select>
          {message && <p className="text-xs text-smix-accent">{message}</p>}
          <button
            type="submit"
            disabled={saving || !songId}
            className="rounded-lg bg-smix-primary px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
          >
            {saving ? 'Salvando...' : 'Vincular arquivo'}
          </button>
        </form>

        <form onSubmit={handleCreateLicense} className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3 h-fit">
          <h2 className="text-sm text-smix-muted">Nova licença</h2>
          <p className="text-xs text-smix-muted -mt-2">
            Registre a origem/autorização de uso antes de vincular conteúdo comercial.
          </p>
          <input
            value={licenseName}
            onChange={(e) => setLicenseName(e.target.value)}
            placeholder="Nome (ex: Licença Artista X 2026)"
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          <input
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            placeholder="Tipo (ex: própria, licenciada, autorizada)"
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          <button
            type="submit"
            disabled={savingLicense}
            className="rounded-lg bg-smix-surface border border-smix-border px-4 py-2 text-sm font-medium hover:border-smix-accent transition disabled:opacity-50 self-start"
          >
            {savingLicense ? 'Salvando...' : 'Adicionar licença'}
          </button>
        </form>
      </div>

      <h2 className="text-sm text-smix-muted mb-3">Arquivos vinculados</h2>
      <div className="flex flex-col gap-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
          >
            <div>
              <p>{file.name} <span className="text-smix-muted text-xs">({file.type})</span></p>
              <p className="text-smix-muted text-xs">
                {file.song.title}{file.license ? ` · licença: ${file.license.name}` : ' · sem licença'}
              </p>
            </div>
            <button
              onClick={() => toggleFileStatus(file)}
              className={`text-xs px-2 py-1 rounded-full border ${
                file.status === 'ACTIVE'
                  ? 'border-smix-accent text-smix-accent'
                  : 'border-smix-border text-smix-muted'
              }`}
            >
              {file.status}
            </button>
          </div>
        ))}
        {files.length === 0 && <p className="text-smix-muted text-sm">Nenhum arquivo vinculado ainda.</p>}
      </div>
    </main>
  );
}
