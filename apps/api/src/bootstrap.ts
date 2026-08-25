import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';

// Quantos proxies existem na frente da aplicação.
//
// Render e Vercel colocam exatamente um. Isso importa para o rate limit: sem
// 'trust proxy', o Express reporta o IP do PROXY em req.ip, e o ThrottlerGuard
// passa a contar todas as requisições do mundo num balde só — o limite de 5/min
// no login seria consumido pelo tráfego legítimo de todos os usuários juntos, e
// bastaria um atacante gastar essas 5 tentativas para trancar o login de todo
// mundo (negação de serviço trivial).
//
// O valor precisa ser o número REAL de proxies, nunca `true`. Com 'trust proxy'
// = true o Express aceita o X-Forwarded-For inteiro como veio, e o cliente
// escolhe o próprio IP mandando um header — cada requisição vira um "IP" novo e
// o rate limit deixa de existir. Com o número de saltos, o Express desconta os
// endereços acrescentados pelos proxies confiáveis e chega no IP verdadeiro,
// que o cliente não controla.
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? '1');

// Configuração aplicada à aplicação Nest independente de onde ela roda:
// servidor comum (main.ts) ou função serverless (api/index.ts). Ficou num
// arquivo só porque são as regras que valem pro app inteiro — CORS, limite de
// corpo, validação — e duas cópias iam divergir na primeira mudança.
export function configureApp(app: INestApplication): void {
  (app as NestExpressApplication).set('trust proxy', TRUST_PROXY_HOPS);

  // Cabeçalhos de segurança. contentSecurityPolicy fica desligado porque esta
  // aplicação só responde JSON — a CSP protegeria HTML que ela não serve, e
  // ligada atrapalharia a página de erro do próprio Nest em desenvolvimento.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(json({ limit: '5mb' })); // fotos de perfil em base64 podem passar de 100kb (padrão)

  app.enableCors({
    // Sem curinga: `origin: '*'` é incompatível com credentials e permitiria a
    // qualquer site ler as respostas da API no navegador da vítima.
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
    // Sem isso, o navegador esconde esses headers do JS mesmo quando o servidor
    // responde com eles — o download de arquivo usa os dois pra saber o nome
    // real (Content-Disposition) e calcular o progresso (Content-Length).
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist remove do objeto qualquer campo sem decorator no DTO;
      // forbidNonWhitelisted transforma a presença desse campo em 400 em vez de
      // descartá-lo em silêncio. Juntos são a barreira contra mass assignment —
      // mas só agem sobre DTOs que sejam CLASSE: um tipo TypeScript inline no
      // @Body() vira `Object` em runtime e o pipe o ignora por inteiro.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
