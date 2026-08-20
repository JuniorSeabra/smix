'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';
import { AdminBottomNav } from '../../../components/AdminBottomNav';

type UserRow = { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; status: 'ACTIVE' | 'INACTIVE' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cadastro de usuário pelo painel. Com o cadastro público fechado, é por aqui
  // que alguém entra na plataforma.
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newActivate, setNewActivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newIsAdmin ? 'ADMIN' : 'USER',
          activateSubscription: newActivate,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // A mensagem do backend é a útil aqui: e-mail repetido, senha curta etc.
        const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        setCreateError(message ?? 'Não foi possível cadastrar este usuário.');
        return;
      }

      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewIsAdmin(false);
      setNewActivate(true);
      setShowCreate(false);
      // Volta pra aba de ativos: o usuário recém-criado nasce ACTIVE e é lá que
      // ele aparece — sem isso, cadastrar estando na aba "Inativos" dá a
      // impressão de que nada aconteceu.
      setTab('ACTIVE');
      load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    load();
  }

  async function toggleStatus(user: UserRow) {
    // "Desativar" tira o acesso na hora (o backend confere o status em toda
    // requisição), não é só um rótulo — o usuário é derrubado mesmo já logado.
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    load();
  }

  async function handleDelete(user: UserRow) {
    const confirmed = window.confirm(
      `Excluir ${user.name} (${user.email}) definitivamente? Isso apaga a conta do banco de dados — não é reversível, e a pessoa precisaria se cadastrar de novo do zero.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await apiFetch(`/admin/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message ?? 'Não foi possível excluir este usuário.');
        return;
      }
      load();
    } finally {
      setDeletingId(null);
    }
  }

  const visibleUsers = users.filter((u) => u.status === tab);

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
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <AdminNav current="/admin/usuarios" />
      </div>

      {showCreate ? (
        <form onSubmit={handleCreate} className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-4 mb-4 flex flex-col gap-2">
          <p className="text-sm font-medium mb-1">Cadastrar usuário</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome"
            required
            minLength={2}
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="E-mail"
            type="email"
            required
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Senha (mínimo 8 caracteres)"
            type="text"
            required
            minLength={8}
            className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
          />
          {/* A senha fica visível de propósito: quem cadastra é o admin e
              precisa anotar pra passar pra pessoa. */}
          <p className="text-smix-muted text-xs">
            Anote a senha — ela não aparece de novo depois de salvar.
          </p>

          <label className="flex items-center gap-2 text-xs text-smix-muted mt-1">
            <input type="checkbox" checked={newActivate} onChange={(e) => setNewActivate(e.target.checked)} />
            Liberar acesso ao catálogo (cria a assinatura já ativa)
          </label>
          <label className="flex items-center gap-2 text-xs text-smix-muted">
            <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} />
            Tornar administrador
          </label>

          {createError && <p className="text-red-400 text-xs mt-1">{createError}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-smix-primary px-4 py-2 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
              className="rounded-lg border border-smix-border px-4 py-2 text-xs text-smix-muted hover:text-smix-text transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-xl2 border border-dashed border-smix-border px-4 py-3 text-sm text-smix-muted hover:border-smix-accent hover:text-smix-accent transition mb-4"
        >
          + Cadastrar usuário
        </button>
      )}

      <input
        type="search"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition mb-4"
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('ACTIVE')}
          className={`rounded-lg px-4 py-2 text-sm border ${
            tab === 'ACTIVE' ? 'border-smix-accent text-smix-accent' : 'border-smix-border text-smix-muted'
          }`}
        >
          Ativos ({users.filter((u) => u.status === 'ACTIVE').length})
        </button>
        <button
          onClick={() => setTab('INACTIVE')}
          className={`rounded-lg px-4 py-2 text-sm border ${
            tab === 'INACTIVE' ? 'border-smix-accent text-smix-accent' : 'border-smix-border text-smix-muted'
          }`}
        >
          Inativos ({users.filter((u) => u.status === 'INACTIVE').length})
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visibleUsers.map((user) => (
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
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deletingId === user.id}
                    className="text-xs text-red-400 hover:underline disabled:opacity-50"
                  >
                    {deletingId === user.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {visibleUsers.length === 0 && (
          <p className="text-smix-muted text-sm">
            {tab === 'ACTIVE' ? 'Nenhum usuário ativo encontrado.' : 'Nenhum usuário inativo encontrado.'}
          </p>
        )}
      </div>

      <AdminBottomNav current="/admin/usuarios" />
    </main>
  );
}
