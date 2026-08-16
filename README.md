# S-MIX — Monorepo

Plataforma de acesso a MultiTracks gospel (biblioteca + assinatura + ferramentas para músicos).

## Estrutura

```
s-mix/
├── apps/
│   ├── web/     → Frontend Next.js (React + TypeScript + Tailwind)
│   └── api/     → Backend NestJS (TypeScript), módulos: auth, users, artists, songs, files, subscriptions, payments, chat, admin
├── docs/        → Documentação técnica (arquitetura, decisões)
└── docker-compose.yml → PostgreSQL local para desenvolvimento
```

## Módulos do backend (mapeados aos domínios definidos na análise técnica)

- **auth** — cadastro, login, JWT, hash de senha (bcrypt), guards de RBAC
- **users** — perfil, foto, edição de dados
- **artists** — CRUD de cantores/artistas (admin) + listagem pública
- **songs** — CRUD de músicas (admin) + listagem/busca pública
- **files** — vínculo com Google Drive, controle de download
- **subscriptions** — status da assinatura, integração com gateway
- **payments** — histórico de pagamentos, webhooks do gateway
- **chat** — conversas usuário ↔ admin (WebSocket)
- **admin** — dashboard e agregações administrativas

O módulo de **mixagem/OLMS** e o **afinador** (client-side, Web Audio API) entram nas Fases 2 e 3 — por enquanto só existem como rotas placeholder no frontend.

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 20+, PostgreSQL (ou `docker-compose up -d`).

```bash
# Backend
cd apps/api
cp .env.example .env
npm install
npx prisma db push
npm run start:dev

# Frontend
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

## Status atual

Este é o esqueleto inicial (Fase 1 — MVP em construção):
- [x] Estrutura de pastas e schema do banco (Prisma)
- [x] Módulo de autenticação (cadastro/login/JWT + RBAC)
- [x] Modelos de Artistas e Músicas (CRUD básico)
- [ ] Integração real com gateway de pagamento (pendente escolha do gateway)
- [ ] Integração real com Google Drive (pendente credenciais)
- [ ] Frontend: telas de login, cadastro, home, página do artista

Veja `docs/arquitetura.md` para a análise técnica completa.
