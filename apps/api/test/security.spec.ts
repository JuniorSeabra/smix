import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ADMIN_ID,
  PrismaMock,
  SONG_ID,
  USER_ID,
  accessTokenFor,
  createApp,
  createPrismaMock,
  signToken,
} from './helpers';

const ACTIVE_USER = { id: USER_ID, status: 'ACTIVE', role: 'USER' };
const ACTIVE_ADMIN = { id: ADMIN_ID, status: 'ACTIVE', role: 'ADMIN' };

describe('Segurança', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createApp(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Por padrão, quem está autenticado é um usuário comum ativo.
    prisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
  });

  // ------------------------------------------------------------------
  // 1. Escalação de privilégio
  // ------------------------------------------------------------------
  describe('escalação de privilégio', () => {
    it('usuário comum NÃO vira ADMIN mandando role no PATCH /users/me', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID))
        .send({ name: 'Fulano', role: 'ADMIN' });

      // forbidNonWhitelisted transforma campo estranho em 400, em vez de descartar calado.
      expect(res.status).toBe(400);
      // O que mais importa: nada foi escrito no banco.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('usuário comum NÃO altera a própria role nem com ela sozinha no corpo', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID))
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('campos protegidos (status, passwordHash, id) também são recusados', async () => {
      for (const extra of [{ status: 'ACTIVE' }, { passwordHash: 'x' }, { id: ADMIN_ID }]) {
        const res = await request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID))
          .send({ name: 'Fulano', ...extra });

        expect(res.status).toBe(400);
      }
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('atualização legítima passa, e SÓ o nome chega ao banco', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, name: 'Fulano' });

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID))
        .send({ name: 'Fulano' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data).toEqual({ name: 'Fulano' });
      // O id vem do token, nunca do corpo.
      expect(call.where).toEqual({ id: USER_ID });
    });

    it('role adulterada DENTRO do JWT é ignorada — o cargo vem do banco', async () => {
      // Token bem assinado, mas afirmando ser ADMIN. O banco diz USER.
      const forged = signToken({ sub: USER_ID, email: 'a@b.com', type: 'access', role: 'ADMIN' });

      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer ' + forged);

      expect(res.status).toBe(403);
    });
  });

  // ------------------------------------------------------------------
  // 2. Autenticação e autorização
  // ------------------------------------------------------------------
  describe('autenticação e autorização', () => {
    it('endpoint admin sem token responde 401', async () => {
      const res = await request(app.getHttpServer()).get('/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('endpoint admin com token de usuário comum responde 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID));
      expect(res.status).toBe(403);
    });

    it('token malformado é rejeitado', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer nao.e.um.token');
      expect(res.status).toBe(401);
    });

    it('token expirado é rejeitado', async () => {
      const expired = signToken({ sub: USER_ID, email: 'a@b.com', type: 'access' }, { expiresIn: '-10s' });
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + expired);
      expect(res.status).toBe(401);
    });

    it('token assinado com outro segredo é rejeitado', async () => {
      const wrong = signToken(
        { sub: USER_ID, email: 'a@b.com', type: 'access' },
        {},
        'outro-segredo-completamente-diferente-aqui',
      );
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + wrong);
      expect(res.status).toBe(401);
    });

    it('refresh token não serve como token de acesso', async () => {
      // Assinado com o segredo de ACESSO de propósito: simula o cenário em que
      // JWT_SECRET e JWT_REFRESH_SECRET foram configurados com o mesmo valor.
      // Só a checagem de `type` impede o token de 7 dias de valer como acesso.
      const refresh = signToken({ sub: USER_ID, email: 'a@b.com', type: 'refresh' });
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + refresh);
      expect(res.status).toBe(401);
    });

    it('usuário desativado perde acesso na hora, mesmo com token válido', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'INACTIVE' });
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + accessTokenFor(USER_ID));
      expect(res.status).toBe(401);
    });

    it('admin de verdade (cargo vindo do banco) entra no painel', async () => {
      prisma.user.findUnique.mockResolvedValue(ACTIVE_ADMIN);
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer ' + accessTokenFor(ADMIN_ID));
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 3. Mass assignment em rotas administrativas
  // ------------------------------------------------------------------
  describe('mass assignment', () => {
    it('campo desconhecido em PATCH /artists/:id é recusado', async () => {
      prisma.user.findUnique.mockResolvedValue(ACTIVE_ADMIN);
      const res = await request(app.getHttpServer())
        .patch('/artists/' + SONG_ID)
        .set('Authorization', 'Bearer ' + accessTokenFor(ADMIN_ID))
        .send({ name: 'Novo', campoInventado: 'x' });
      expect(res.status).toBe(400);
    });

    it('coverUrl com esquema perigoso é recusado', async () => {
      prisma.user.findUnique.mockResolvedValue(ACTIVE_ADMIN);
      const res = await request(app.getHttpServer())
        .patch('/songs/' + SONG_ID)
        .set('Authorization', 'Bearer ' + accessTokenFor(ADMIN_ID))
        .send({ coverUrl: 'javascript:alert(1)' });
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // 4. Vazamento de dados (IDOR)
  // ------------------------------------------------------------------
  describe('exposição de dados', () => {
    it('GET /songs/:id nunca pede googleDriveFileId ao banco', async () => {
      prisma.song.findUnique.mockResolvedValue({ id: SONG_ID, title: 'X', artist: {}, files: [] });

      await request(app.getHttpServer()).get('/songs/' + SONG_ID);

      expect(prisma.song.findUnique).toHaveBeenCalledTimes(1);
      const args = prisma.song.findUnique.mock.calls[0][0];
      const fileSelect = args.include.files.select;
      // O select é explícito e o id do Drive não está nele.
      expect(fileSelect).toBeDefined();
      expect(fileSelect.googleDriveFileId).toBeUndefined();
      expect(Object.keys(fileSelect).sort()).toEqual(['createdAt', 'id', 'name', 'size', 'type']);
    });

    it('id que não é UUID é recusado antes de tocar o banco', async () => {
      const res = await request(app.getHttpServer()).get('/songs/nao-e-uuid');
      expect(res.status).toBe(400);
      expect(prisma.song.findUnique).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // 5. Rotas de bootstrap removidas
  // ------------------------------------------------------------------
  describe('bootstrap de administrador', () => {
    it('GET /bootstrap/make-admin não existe mais', async () => {
      const res = await request(app.getHttpServer()).get('/bootstrap/make-admin?email=a@b.com&secret=x');
      expect(res.status).toBe(404);
    });

    it('GET /bootstrap/seed-artists não existe mais', async () => {
      const res = await request(app.getHttpServer()).get('/bootstrap/seed-artists?secret=x');
      expect(res.status).toBe(404);
    });

    it('POST /bootstrap/create-admin não existe mais', async () => {
      const res = await request(app.getHttpServer()).post('/bootstrap/create-admin').send({ secret: 'x' });
      expect(res.status).toBe(404);
    });
  });
});
