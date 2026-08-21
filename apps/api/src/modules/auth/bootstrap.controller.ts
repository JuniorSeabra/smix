import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Post, Query } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

// Rota de uso único para bootstrap do primeiro administrador.
// Protegida por ADMIN_BOOTSTRAP_SECRET (variável de ambiente) — sem essa
// chave correta, ninguém consegue promover uma conta a admin por aqui.
// Recomendado remover este controller (ou trocar o segredo) depois do primeiro uso.
@Controller('bootstrap')
export class BootstrapController {
  constructor(private prisma: PrismaService) {}

  private assertSecret(secret: string | undefined) {
    if (!process.env.ADMIN_BOOTSTRAP_SECRET || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      throw new ForbiddenException('Chave inválida');
    }
  }

  // Cria o primeiro administrador num banco vazio.
  //
  // Sem isto a plataforma fica trancada por fora: com PUBLIC_SIGNUP_ENABLED
  // desligado ninguém se cadastra, criar usuário pelo painel exige já estar
  // logado como admin, e make-admin abaixo só promove uma conta que já exista.
  // Num banco recém-criado não existe nenhuma — nem a do dono.
  //
  // É POST, e não GET como as outras rotas daqui, porque recebe senha: query
  // string vai parar em log de servidor e em histórico de navegador.
  @Post('create-admin')
  async createAdmin(@Body() body: { email?: string; name?: string; password?: string; secret?: string }) {
    this.assertSecret(body.secret);

    const email = body.email?.trim();
    const name = body.name?.trim();
    const password = body.password;
    if (!email || !name || !password) {
      throw new BadRequestException('Informe name, email e password');
    }
    if (password.length < 8) {
      throw new BadRequestException('A senha precisa ter ao menos 8 caracteres');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Já existe usuário com esse e-mail — use /bootstrap/make-admin para promovê-lo');
    }

    const user = await this.prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });

    // Assinatura ativa junto: o admin também passa pela checagem de assinatura
    // ao baixar um arquivo, e sem isto ele tomaria 403 no próprio catálogo.
    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        gateway: 'manual',
        status: 'ACTIVE',
        amount: process.env.SUBSCRIPTION_AMOUNT ?? '40.00',
        periodicity: process.env.SUBSCRIPTION_PERIODICITY ?? 'monthly',
      },
    });

    return { message: `Administrador ${email} criado com acesso liberado.`, user };
  }

  @Get('make-admin')
  async makeAdmin(@Query('email') email: string, @Query('secret') secret: string) {
    this.assertSecret(secret);

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
    this.assertSecret(secret);

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
