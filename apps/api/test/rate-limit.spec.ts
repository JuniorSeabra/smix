import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaMock, createApp, createPrismaMock } from './helpers';

// Arquivo separado de propósito: o contador do ThrottlerGuard vive na instância
// da aplicação. Misturar estes testes com os de autorização faria um consumir a
// cota do outro e o resultado dependeria da ordem de execução.
describe('Rate limit', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    prisma = createPrismaMock();
    // Login sempre falha (usuário inexistente): o que importa aqui é a contagem
    // de tentativas, não o resultado da autenticação.
    prisma.user.findUnique.mockResolvedValue(null);
    app = await createApp(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = (headers: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send({ email: 'quem@nao.existe', password: 'senha-qualquer' });

  it('bloqueia a 6ª tentativa de login no mesmo minuto', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await login()).status);
    }

    // As 5 primeiras chegam ao serviço e falham por credencial (401).
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    // A 6ª nem chega: 429 Too Many Requests.
    expect(statuses[5]).toBe(429);
  });

  it('não dá para escapar do limite forjando X-Forwarded-For', async () => {
    // Modela a produção: existe UM proxy (Render) na frente, e ele ACRESCENTA o
    // IP real do cliente ao final do X-Forwarded-For. Com TRUST_PROXY_HOPS=1 o
    // Express desconta exatamente esse salto e lê o último endereço — que o
    // cliente não controla. Tudo que o atacante escrever à esquerda é ignorado.
    const realClient = '203.0.113.9';
    const statuses: number[] = [];

    for (let i = 0; i < 6; i++) {
      // Um IP forjado diferente a cada volta, tentando abrir um balde novo.
      const forged = '10.0.0.' + i;
      statuses.push((await login({ 'X-Forwarded-For': forged + ', ' + realClient })).status);
    }

    // Se o forjado valesse, todas passariam. Como só o último conta, o balde é
    // um só e a 6ª é bloqueada igual.
    expect(statuses[5]).toBe(429);
  });

  it('clientes diferentes têm contadores independentes', async () => {
    // Confirma o outro lado: o limite é por IP real, não global. Sem isto, um
    // atacante trancaria o login de todos os usuários gastando a cota sozinho.
    const a = await login({ 'X-Forwarded-For': '198.51.100.1' });
    const b = await login({ 'X-Forwarded-For': '198.51.100.2' });

    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
  });
});
