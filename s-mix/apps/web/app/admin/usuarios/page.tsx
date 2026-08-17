'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type UserRow = { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'INACTIVE' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');

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

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <nav className="flex gap-4 text-sm text-smix-muted">
          <a href="/admin" className="hover:text-smix-text transition">Dashboard</a>
          <a href="/admin/usuarios" className="text-smix-text">Usuários</a>
        </nav>
      </div>

      <input
        type="search"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition mb-6"
      />

      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex items-center justify-between text-sm"
          >
            <div>
              <p>{user.name}</p>
              <p className="text-smix-muted text-xs">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={() => toggleRole(user)}
                className="text-xs text-smix-accent hover:underline ml-2"
              >
                {user.role === 'ADMIN' ? 'Remover admin' : 'Tornar admin'}
              </button>
              <button
                onClick={() => toggleStatus(user)}
                className="text-xs text-smix-muted hover:underline"
              >
                {user.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-smix-muted text-sm">Nenhum usuário encontrado.</p>}
      </div>
    </main>
  );
}
