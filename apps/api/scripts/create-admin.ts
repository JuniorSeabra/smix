// Cria (ou promove) um administrador pela linha de comando.
//
// Substitui o antigo BootstrapController, que fazia isso por HTTP. Aquele
// desenho tinha um problema que nenhuma melhoria de senha resolvia: um endpoint
// capaz de conceder ADMIN ficava publicamente alcançável 24h por dia, protegido
// só por um segredo compartilhado — e duas das três rotas recebiam esse segredo
// por query string, que vaza em log de acesso do host, histórico de navegador e
// cabeçalho Referer. Um segredo lido num log virava administrador.
//
// Aqui não existe rota. Rodar isto exige acesso ao shell com o DATABASE_URL em
// mãos; quem já tem isso pode escrever no banco de qualquer forma, então o
// script não amplia o alcance de ninguém.
//
// Uso:
//   npm run create-admin -- --email=voce@exemplo.com --name="Seu Nome" --password='senha-forte'
//
// Se o e-mail já existir, o usuário é promovido a ADMIN em vez de duplicado.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const name = arg('name')?.trim();
  const password = arg('password');

  if (!email || !name || !password) {
    throw new Error(
      'Uso: npm run create-admin -- --email=... --name="..." --password=...',
    );
  }
  if (password.length < 12) {
    // Mais exigente que o cadastro comum (8): esta conta administra a
    // plataforma inteira e a senha é digitada uma vez só, por uma pessoa.
    throw new Error('A senha do administrador precisa ter ao menos 12 caracteres');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN', status: 'ACTIVE', passwordHash },
        select: { id: true, email: true, role: true },
      })
    : await prisma.user.create({
        data: { name, email, passwordHash, role: 'ADMIN' },
        select: { id: true, email: true, role: true },
      });

  // Assinatura ativa junto: o admin também passa pela checagem de assinatura ao
  // baixar um arquivo, e sem isto ele tomaria 403 no próprio catálogo.
  const hasSubscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
  });
  if (!hasSubscription) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        gateway: 'manual',
        status: 'ACTIVE',
        amount: process.env.SUBSCRIPTION_AMOUNT ?? '40.00',
        periodicity: process.env.SUBSCRIPTION_PERIODICITY ?? 'monthly',
      },
    });
  }

  // Nunca imprime a senha nem o hash.
  console.log(`Administrador pronto: ${user.email} (${existing ? 'promovido' : 'criado'})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
