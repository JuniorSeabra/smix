import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // Sem $connect() no boot, de propósito.
  //
  // O PrismaClient conecta sozinho na primeira consulta. Conectar no
  // onModuleInit, como estava antes, tornava o banco um requisito pra aplicação
  // sequer subir: um banco indisponível (ou DATABASE_URL faltando) derrubava a
  // inicialização do Nest e TODA rota passava a responder 500 — inclusive as
  // que nem tocam o banco, como GET /auth/config.
  //
  // Em serverless isso também custa: cada instância nova pagaria o handshake
  // com o Postgres antes de responder qualquer coisa, mesmo requisições que não
  // fazem consulta nenhuma.

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
