// Ponto de entrada da API quando ela roda como função serverless na Vercel.
//
// Existe porque src/main.ts abre um servidor com app.listen(), o que não vale
// na Vercel: lá não há processo de longa duração, cada requisição chega num
// handler. Aqui montamos o mesmo AppModule sobre um express() e devolvemos o
// handler dele — as rotas, os guards e os pipes são exatamente os mesmos.
//
// main.ts continua sendo o caminho de quem roda em servidor comum (Render,
// docker-compose, npm run start:dev). Os dois compartilham a configuração
// abaixo justamente pra não divergirem com o tempo.
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

const server = express();

// A instância do Nest é cara de montar (lê metadados de todos os módulos), e a
// Vercel reaproveita o mesmo container entre requisições próximas. Guardamos a
// promessa, não o app: assim duas requisições que cheguem juntas na primeira
// invocação esperam o mesmo bootstrap em vez de dispararem dois.
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  configureApp(app);
  // init() e não listen(): quem escuta a porta é a Vercel, não nós.
  await app.init();
}

export default async function handler(req: Request, res: Response) {
  if (!bootstrapPromise) bootstrapPromise = bootstrap();
  await bootstrapPromise;
  server(req, res);
}
