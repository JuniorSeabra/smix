import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';

// Diagnóstico da API. Aberto de propósito: precisa responder justamente quando
// o login está quebrado, que é quando ninguém consegue autenticar pra investigar.
//
// Nunca devolve credencial — só se as variáveis existem e se o serviço
// respondeu. Mensagens de erro passam por um filtro antes de sair.
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private drive: GoogleDriveService,
  ) {}

  @Get()
  async check() {
    return {
      api: 'ok',
      banco: await this.checarBanco(),
      drive: await this.checarDrive(),
      flags: {
        cadastroPublico: process.env.PUBLIC_SIGNUP_ENABLED === 'true',
        exigeAssinatura: process.env.REQUIRE_SUBSCRIPTION !== 'false',
      },
    };
  }

  private async checarBanco() {
    if (!process.env.DATABASE_URL) return { configurado: false, status: 'DATABASE_URL ausente' };
    try {
      // Contar tabelas separa "conectado" de "conectado e com schema aplicado":
      // banco vazio é exatamente o estado em que o login falha sem motivo claro.
      // $queryRaw (template tag), e não $queryRawUnsafe: esta rota é pública e
      // sem autenticação. A consulta de hoje é uma constante e não seria
      // injetável, mas Unsafe aqui é uma armadilha — basta alguém interpolar um
      // parâmetro nessa string no futuro pra virar SQL injection direta, sem
      // nenhum aviso. A versão em template tag parametriza sozinha.
      const r = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;
      const tabelas = Number(r[0]?.total ?? 0);
      return { configurado: true, status: tabelas > 0 ? 'ok' : 'sem tabelas (falta prisma db push)', tabelas };
    } catch (err: any) {
      return { configurado: true, status: 'erro: ' + this.limpar(err?.message) };
    }
  }

  // Não basta dizer se as variáveis existem: chave malformada e pasta não
  // compartilhada com a conta de serviço passam nessa checagem e só falham na
  // hora do download. Aqui a gente lista a raiz de verdade e reporta o motivo.
  private async checarDrive() {
    const temEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const temChave = !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const temPasta = !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const variaveis = { email: temEmail, chavePrivada: temChave, pastaRaiz: temPasta };
    if (!temEmail || !temChave || !temPasta) {
      return { configurado: false, status: 'faltam variáveis de ambiente', variaveis };
    }

    try {
      const pastas = await this.drive.listArtistFolders();
      return { configurado: true, status: 'ok', variaveis, pastasDeArtista: pastas.length };
    } catch (err: any) {
      return { configurado: true, status: 'erro: ' + this.limpar(err?.message), variaveis };
    }
  }

  private limpar(msg: unknown): string {
    return String(msg ?? 'sem detalhe')
      .replace(/postgres(ql)?:\/\/\S+/gi, '[connection string omitida]')
      .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[chave omitida]')
      .slice(0, 400);
  }
}
