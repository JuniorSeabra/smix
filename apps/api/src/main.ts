import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

// Entrada de quem roda a API como servidor de verdade (Render, docker-compose,
// npm run start:dev). Na Vercel o ponto de entrada é api/index.ts, que monta o
// mesmo AppModule com a mesma configureApp, só que sem abrir porta.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
