# S-MIX — Análise Técnica e Arquitetura (pré-implementação)

## 1. Resumo do funcionamento

O S-MIX é uma plataforma web responsiva (mobile first) de acesso a MultiTracks gospel, estruturada em três camadas de valor:

1. **Biblioteca de conteúdo** — artistas → músicas → arquivos (Google Drive).
2. **Assinatura recorrente** — R$ 40/mês, controlando o acesso à biblioteca.
3. **Ferramentas para músicos** — afinador, chat de suporte e, futuramente, controle de mesa de som (OLMS).

Recomendo dividir o sistema em módulos independentes, cada um com responsabilidade clara:

- **S-MIX Core** — usuários, autenticação, RBAC, assinaturas, artistas, músicas, arquivos, permissões.
- **S-MIX Music** — biblioteca, busca, download (e futuramente player/stems).
- **S-MIX Tools** — afinador, mixagem/OLMS.
- **S-MIX Support** — chat, notificações.
- **S-MIX Admin** — dashboards e CRUDs administrativos.

Essa separação evita que o projeto vire um monólito difícil de manter, e permite adicionar fases (chat, afinador, OLMS, player de stems) sem reescrever o core.

---

## 2. Arquitetura recomendada

### Frontend
**Next.js (React) + TypeScript**, com Tailwind CSS.

Justificativa: SSR/SSG para performance e SEO das páginas públicas (login, landing), roteamento por arquivos, ótimo suporte a PWA, e um único código para mobile web/tablet/desktop com componentes responsivos (grid + carrosséis com scroll-snap para os cantores). React também facilita futuramente um player/mixer de stems com Web Audio API.

### Backend
**Node.js com NestJS (TypeScript)**.

Justificativa: estrutura modular nativa (módulos = Core/Music/Tools/Support/Admin, exatamente como proposto acima), suporte de primeira classe a Guards/RBAC, fácil integração com filas (para processar webhooks de pagamento) e com WebSockets (chat e, depois, OSC/mixagem). Alternativa viável: Django/DRF, mas NestJS casa melhor com um frontend TypeScript e com a necessidade de WebSocket nativo.

### Banco de dados
**PostgreSQL** (relacional), com **Prisma** ou **TypeORM** como ORM.

Justificativa: os dados são fortemente relacionais (Users → Subscriptions → Payments; Artists → Songs → Files), exigem integridade referencial e transações (ex.: mudança de status de assinatura). Redis pode ser somado depois para cache de buscas e sessões de chat em tempo real.

### Armazenamento de arquivos
**Google Drive API**, acessado apenas pelo backend (nunca pelo cliente). O banco guarda somente metadados (`google_drive_file_id`); o backend gera links temporários/assinados (ou faz streaming do arquivo) na hora do download, validando assinatura ativa e permissões antes.

### Autenticação
JWT (access token curto + refresh token), senha com hash **bcrypt/argon2**, RBAC com papéis `user` e `admin` verificados **sempre no backend** (guards do NestJS), nunca apenas escondendo botões no frontend.

### Pagamento
Camada de abstração (`PaymentGatewayAdapter`) para não acoplar o sistema a um gateway específico. Hoje as opções mais maduras no Brasil para assinatura recorrente + PIX + cartão são **Stripe** (menos foco em PIX nativo) e gateways nacionais como **Pagar.me, Asaas ou Mercado Pago**, que suportam assinatura recorrente e PIX. Nenhuma chave, conta recebedora ou credencial fica no código — tudo em variáveis de ambiente/secret manager, com endpoint de webhook validando assinatura da requisição.

### Chat
WebSocket (Socket.IO ou o gateway nativo do NestJS) para mensagens em tempo real, com fallback de polling. Tabelas para conversas, participantes, mensagens e status de leitura (detalhado na seção 4).

### Afinador
100% client-side: Web Audio API (`AudioContext` + `AnalyserNode` ou `getFloatTimeDomainData`) com um algoritmo de detecção de pitch (autocorrelação ou YIN), sem necessidade de backend. Requer permissão de microfone do navegador.

### Mixagem (preparação para OLMS)
Ver seção 6 — não faz parte do MVP, mas a API já nasce com um módulo `S-MIX Tools > Mixing` isolado, pronto para receber essa integração depois.

---

## 3. Estrutura do banco de dados

Expandindo a proposta original:

**users**: id, nome, email, senha_hash, foto_url, role (`user`/`admin`), status, created_at, updated_at

**artists**: id, nome, foto_url, descricao, status, created_at, updated_at

**songs**: id, titulo, artist_id (FK), descricao, capa_url, categoria, status, created_at, updated_at

**files**: id, song_id (FK), nome, tipo (stem/completo), google_drive_file_id, tamanho, licenca_id (FK), status, created_at, updated_at

**licenses**: id, nome, tipo, origem, observacoes, created_at *(nova tabela — ver seção sobre direitos autorais)*

**subscriptions**: id, user_id (FK), gateway, gateway_customer_id, gateway_subscription_id, status (ativo/pendente/aprovado/recusado/cancelado/vencido), amount, periodicidade, next_billing_date, created_at, updated_at

**payments**: id, user_id (FK), subscription_id (FK), transaction_id, amount, method, status, paid_at, created_at

**conversations**: id, user_id (FK), status (aberta/encerrada), created_at, updated_at

**conversation_participants**: id, conversation_id (FK), user_id (FK), papel (usuário/admin)

**messages**: id, conversation_id (FK), sender_id (FK), conteudo, created_at

**message_reads**: id, message_id (FK), user_id (FK), lido_em

**download_logs**: id, user_id (FK), file_id (FK), ip, created_at *(para auditoria e rate limiting)*

**audit_logs**: id, admin_id (FK), acao, entidade, entidade_id, created_at

---

## 4. Fluxos principais

**Usuário**: cadastro (com foto) → assinatura/pagamento → login → busca/navegação por artista → seleção de música → verificação de assinatura ativa → download controlado pelo backend.

**Administrador**: login com role `admin` → dashboard → CRUD de artistas/músicas/arquivos → vinculação de arquivos do Drive → gestão de usuários/assinaturas/pagamentos → atendimento no chat → logs de auditoria.

**Pagamento**: usuário escolhe forma de pagamento → backend cria assinatura no gateway → primeira cobrança imediata → gateway envia webhook de confirmação → status atualizado (`pendente`→`ativo`) → cobranças recorrentes mensais processadas pelo gateway e confirmadas via webhook.

**Google Drive**: admin conecta a conta/pasta do Drive → arquivos são indexados (nome, ID) → admin vincula cada arquivo a uma música → no download, backend verifica permissão → busca o arquivo pela Drive API usando o `google_drive_file_id` → entrega via stream ou link assinado de curta duração.

**Download**: clique em "Download" → backend checa assinatura ativa + permissão do conteúdo → registra em `download_logs` (auditoria/rate limiting) → libera o arquivo.

---

## 5. Segurança

- Hash de senha com bcrypt/argon2; nunca texto plano.
- JWT com expiração curta + refresh token; RBAC validado em todas as rotas do backend, não apenas no frontend.
- Arquivos do Drive nunca expostos por link direto; sempre mediados pelo backend.
- Rate limiting em rotas de login, download e API pública (ex.: `@nestjs/throttler`).
- Validação estrita de uploads (tipo, tamanho, foto de perfil).
- Logs de auditoria para ações administrativas.
- Credenciais do Google e do gateway de pagamento em secret manager (não no código-fonte), com ambientes de teste/produção separados.
- Validação de assinatura/HMAC nos webhooks de pagamento para evitar chamadas falsas.

---

## 6. OLMS — análise da integração futura

O **Open Live Mixing System (OLMS)** é conceitualmente muito próximo do que a seção 16 descreve: um sistema baseado em Linux com kernel RT, usando **Ardour Headless** e **JACK** como motor de áudio, com controle remoto via navegador/OSC.

**O que é possível**: o S-MIX pode, no futuro, atuar como um cliente que envia comandos (mute, volume, fader, roteamento) para uma ponte que traduz isso em mensagens OSC para o Ardour/JACK rodando na máquina conectada à mesa de som.

**Como seria a comunicação**: `S-MIX (navegador) → WebSocket → API/Bridge (backend ou serviço local) → OSC → Ardour Headless/JACK → interface de áudio → retorno do músico`. O navegador nunca fala OSC diretamente; ele fala WebSocket com uma ponte que traduz para OSC.

**O que precisa rodar no computador da mesa**: Linux (idealmente com kernel RT), JACK, Ardour Headless, e um pequeno serviço "bridge" que exponha WebSocket e converta para OSC — esse serviço provavelmente precisa ser desenvolvido especificamente para o S-MIX, pois é a peça de integração.

**Riscos**: o controle só funciona com o dispositivo na mesma rede local; latência e estabilidade de áudio em tempo real são sensíveis; o próprio projeto OLMS ainda está em amadurecimento, então depender dele integralmente é arriscado. Recomendo tratar isso como fase 3 do roadmap, sem acoplar o MVP a essa dependência.

**O que pode ser reaproveitado**: a lógica de canais/faders/mute do OLMS e o uso de OSC como protocolo já validam a abordagem técnica.

**O que fica para depois**: toda a implementação — no MVP, o módulo `Mixing` fica apenas como placeholder na navegação, sem funcionalidade real.

---

## 7. Conceitos do MultiTracks.com aplicáveis ao S-MIX

O ecossistema da MultiTracks organiza o conteúdo em stems separados (bateria, baixo, guitarra, teclas, vocals, click, guide, etc.), com recursos como Playback, RehearsalMix e mixagem personalizada na nuvem.

Para o S-MIX, isso sugere modelar `files` desde já com um campo `tipo` (stem individual vs. arquivo completo), mesmo que o MVP só ofereça download simples — assim a evolução futura para um player com mixer de stems (mute individual, volume, pan, alteração de tonalidade/BPM) não exige remodelar o banco.

---

## 8. Experiência de navegação — referência OLX

A OLX usa busca em destaque, categorias e navegação inferior/chat, com boa adaptação entre app e web. Para o S-MIX, isso reforça a proposta original: no celular, busca grande + carrossel horizontal de artistas + menu inferior com os 5 itens principais; no desktop, menu expandido horizontalmente aproveitando o espaço.

---

## 9. Direitos autorais e licenciamento (ponto crítico)

Antes de colocar qualquer MultiTrack comercial no ar, é necessário:

- Verificar se há autorização/licença para distribuir cada faixa.
- Adicionar a tabela `licenses` (proposta acima) para registrar origem e tipo de licença de cada arquivo.
- Implementar um fluxo de remoção rápida de conteúdo (takedown) caso necessário.
- Definir claramente se o S-MIX está hospedando conteúdo próprio, licenciado, ou atuando como intermediário — isso muda a responsabilidade legal.

Esse ponto não é apenas técnico; recomendo validação jurídica antes de qualquer lançamento em produção com conteúdo de artistas de terceiros.

---

## 10. PWA

É plenamente viável transformar o S-MIX em PWA com Next.js (via `next-pwa` ou Service Worker manual): manifest.json para ícone/instalação na tela inicial, cache de assets estáticos, e experiência "tipo app" em mobile. Recomendo isso ainda na Fase 1, pois o custo é baixo e o ganho de experiência mobile é alto.

---

## 11. Roadmap

**MVP (Fase 1)**: autenticação, cadastro, perfil, assinatura + pagamento (com gateway real ativo, mesmo que só cartão/PIX básicos), artistas, músicas, busca, integração Google Drive, download controlado, painel admin básico, PWA.

**Fase 2**: chat, afinador, notificações, histórico de downloads, melhorias de perfil.

**Fase 3**: bridge OLMS, controle via Wi-Fi, canais/faders/mute/retornos.

**Fase 4**: player de MultiTracks, stems individuais, mixer, click/guide, BPM, tonalidade, mixes personalizados.

---

## 12. Riscos técnicos e recomendações adicionais

- **Dependência de terceiros**: Google Drive API tem cotas de uso — para uma biblioteca grande, monitorar limites de requisições e considerar cache de metadados.
- **Gateway de pagamento**: a escolha final (Pagar.me/Asaas/Mercado Pago/Stripe) deve ser validada com testes de sandbox antes do MVP; nenhuma integração deve ser "inventada" sem confirmar a documentação oficial do gateway escolhido.
- **OLMS**: ainda em desenvolvimento pelo autor original — tratar como experimental, não como dependência do produto.
- **Escalabilidade de arquivos**: se a biblioteca crescer muito, considerar CDN ou cache de streaming para os downloads mais acessados.
- **Modularidade**: manter os 5 módulos (Core/Music/Tools/Support/Admin) como pastas/domínios separados desde o início facilita testes e manutenção.

---

Pronto para começar a implementação do MVP (Fase 1) quando você confirmar as escolhas de gateway de pagamento e a estrutura de módulos proposta.
