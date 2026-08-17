import { Controller, ForbiddenException, Get, NotFoundException, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Rota de uso único para bootstrap do primeiro administrador.
// Protegida por ADMIN_BOOTSTRAP_SECRET (variável de ambiente) — sem essa
// chave correta, ninguém consegue promover uma conta a admin por aqui.
// Recomendado remover este controller (ou trocar o segredo) depois do primeiro uso.
@Controller('bootstrap')
export class BootstrapController {
  constructor(private prisma: PrismaService) {}

  @Get('make-admin')
  async makeAdmin(@Query('email') email: string, @Query('secret') secret: string) {
    if (!process.env.ADMIN_BOOTSTRAP_SECRET || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      throw new ForbiddenException('Chave inválida');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado com esse e-mail');
    }

    await this.prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    return { message: `Usuário ${email} agora é administrador.` };
  }

  // Popula os artistas iniciais da especificação — uso único, mesma chave do make-admin.
  @Get('seed-artists')
  async seedArtists(@Query('secret') secret: string) {
    if (!process.env.ADMIN_BOOTSTRAP_SECRET || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      throw new ForbiddenException('Chave inválida');
    }

    const names = [
      'Aline Barros', 'Gabriela Rocha', 'Fernandinho', 'Isadora Pompeo',
      'Anderson Freire', 'Bruna Karla', 'Thalles Roberto', 'Isaias Saad',
      'Fernanda Brum', 'Cassiane', 'Julliany Souza', 'Gabriel Guedes',
    ];

    let created = 0;
    for (const name of names) {
      const existing = await this.prisma.artist.findFirst({ where: { name } });
      if (!existing) {
        await this.prisma.artist.create({ data: { name } });
        created++;
      }
    }

    return { message: `${created} artista(s) criado(s). Total verificado: ${names.length}.` };
  }
}
