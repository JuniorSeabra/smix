import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
export const SONG_ID = '33333333-3333-4333-8333-333333333333';

// Mock do Prisma: a suíte não sobe banco. O objetivo dos testes é a camada de
// autorização e validação, que roda inteira antes de qualquer consulta — e o
// que importa verificar é justamente O QUE a aplicação manda pro banco (ou
// deixa de mandar), não o que o banco responderia.
export function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    song: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    file: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    artist: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    subscription: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
    downloadLog: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    conversation: { count: jest.fn().mockResolvedValue(0) },
    driveShare: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ total: BigInt(1) }]),
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export async function createApp(prisma: PrismaMock): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  // Mesma configuração da produção — sem isto o ValidationPipe não estaria
  // ligado e os testes de mass assignment passariam por engano.
  configureApp(app);
  await app.init();
  return app;
}

// Assina tokens direto, sem passar pelo login: permite montar exatamente o
// token adulterado que cada teste precisa (vencido, segredo errado, tipo errado).
export function signToken(
  payload: Record<string, unknown>,
  options: jwt.SignOptions = {},
  secret = process.env.JWT_SECRET as string,
): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '15m', ...options });
}

export function accessTokenFor(userId: string, email = 'a@b.com'): string {
  return signToken({ sub: userId, email, type: 'access' });
}
