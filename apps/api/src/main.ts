import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
