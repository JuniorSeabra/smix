import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json } from 'express';

// Configuração aplicada à aplicação Nest independente de onde ela roda:
// servidor comum (main.ts) ou função serverless (api/index.ts). Ficou num
// arquivo só porque são as regras que valem pro app inteiro — CORS, limite de
// corpo, validação — e duas cópias iam divergir na primeira mudança.
export function configureApp(app: INestApplication): void {
  app.use(json({ limit: '5mb' })); // fotos de perfil em base64 podem passar de 100kb (padrão)

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
    // Sem isso, o navegador esconde esses headers do JS mesmo quando o servidor
    // responde com eles — o download de arquivo usa os dois pra saber o nome
    // real (Content-Disposition) e calcular o progresso (Content-Length).
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
