'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type UserRow = { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'INACTIVE' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await apiFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    load();
  }

  async function toggleStatus(user: UserRow) {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    load();
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      const body: any = { name: editName, email: editEmail };
      if (editPassword.trim()) body.newPassword = editPassword.trim();
      await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <nav className="flex gap-4 text-sm text-smix-muted">
          <a href="/admin" className="hover:text-smix-text transition">Dashboard</a>
          <a href="/admin/artistas" className="hover:text-smix-text transition">Artistas</a>
          <a href="/admin/usuarios" className="text-smix-text">Usuários</a>
        </nav>
      </div>

      <input
        type="search"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition mb-6"
      />

      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm">
            {editingId === user.id ? (
              <div className="flex flex-col gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome"
                  className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
                />
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="E-mail"
                  className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
                />
                <input
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nova senha (deixe em branco para não alterar)"
                  type="password"
                  className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => saveEdit(user.id)}
                    disabled={saving}
                    className="rounded-lg bg-smix-primary px-4 py-2 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-smix-border px-4 py-2 text-xs text-smix-muted hover:text-smix-text transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p>{user.name}</p>
                  <p className="text-smix-muted text-xs">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      user.role === 'ADMIN' ? 'border-smix-primary text-smix-primary' : 'border-smix-border text-smix-muted'
                    }`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      user.status === 'ACTIVE' ? 'border-green-500 text-green-400' : 'border-smix-border text-smix-muted'
                    }`}
                  >
                    {user.status}
                  </span>
                  <button onClick={() => startEdit(user)} className="text-xs text-smix-accent hover:underline">
                    Editar login
                  </button>
                  <button onClick={() => toggleRole(user)} className="text-xs text-smix-accent hover:underline">
                    {user.role === 'ADMIN' ? 'Remover admin' : 'Tornar admin'}
                  </button>
                  <button onClick={() => toggleStatus(user)} className="text-xs text-smix-muted hover:underline">
                    {user.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-smix-muted text-sm">Nenhum usuário encontrado.</p>}
      </div>
    </main>
  );
}
