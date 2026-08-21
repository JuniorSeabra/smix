import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Diagnóstico da API. Aberto de propósito: precisa responder justamente quando
// o login está quebrado, que é quando ninguém consegue autenticar pra investigar.
//
// Nunca devolve a connection string nem parte dela — só se a variável existe e
// se o banco respondeu. Mensagem de erro do Prisma é sanitizada antes de sair:
// falha de autenticação costuma trazer usuário e host no texto.
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    const temDatabaseUrl = !!process.env.DATABASE_URL;

    let banco: string;
    let tabelas: number | null = null;

    if (!temDatabaseUrl) {
      banco = 'DATABASE_URL nao configurada';
    } else {
      try {
        // Conta as tabelas do schema public: confirma conexão E se o
        // `prisma db push` chegou a rodar. Banco conectado mas vazio é
        // exatamente o estado em que o login falha sem motivo aparente.
        const r = await this.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
          "SELECT COUNT(*)::bigint AS total FROM information_schema.tables WHERE table_schema = 'public'",
        );
        tabelas = Number(r[0]?.total ?? 0);
        banco = tabelas > 0 ? 'ok' : 'conectado, porem sem tabelas (falta rodar prisma db push)';
      } catch (err: any) {
        const cru = String(err?.message ?? err);
        // corta credencial/host caso o driver os inclua no texto
        banco = 'erro ao conectar: ' + cru.replace(/postgres(ql)?:\/\/\S+/gi, '[connection string omitida]').slice(0, 300);
      }
    }

    return {
      api: 'ok',
      databaseUrlConfigurada: temDatabaseUrl,
      banco,
      tabelas,
      cadastroPublico: process.env.PUBLIC_SIGNUP_ENABLED === 'true',
      exigeAssinatura: process.env.REQUIRE_SUBSCRIPTION !== 'false',
      driveConfigurado: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    };
  }
}
