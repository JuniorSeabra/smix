import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalUsers,
      activeSubscriptions,
      totalArtists,
      totalSongs,
      totalDownloads,
      pendingMessages,
      recentPayments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.artist.count({ where: { status: 'ACTIVE' } }),
      this.prisma.song.count({ where: { status: 'ACTIVE' } }),
      this.prisma.downloadLog.count(),
      this.prisma.conversation.count({ where: { status: 'open' } }),
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      totalArtists,
      totalSongs,
      totalDownloads,
      pendingMessages,
      recentPayments,
    };
  }

  // Listagens administrativas
  listSongs(search?: string) {
    return this.prisma.song.findMany({
      where: search ? { title: { contains: search, mode: 'insensitive' } } : undefined,
      include: { artist: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listUsers(search?: string) {
    return this.prisma.user.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : undefined,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  updateUser(
    id: string,
    data: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'INACTIVE'; name?: string; email?: string; newPassword?: string },
  ) {
    const { newPassword, ...rest } = data;
    const updateData: any = { ...rest };
    if (newPassword) {
      updateData.passwordHash = bcrypt.hashSync(newPassword, 12);
    }
    return this.prisma.user.update({ where: { id }, data: updateData });
  }

  // Apaga o usuário de verdade (não é o "Desativar", que só marca status =
  // INACTIVE). Precisa apagar tudo que referencia esse usuário primeiro, na
  // ordem certa, senão o banco recusa por violar chave estrangeira.
  async deleteUser(id: string, actingAdminId: string) {
    if (id === actingAdminId) {
      throw new BadRequestException('Você não pode excluir a própria conta enquanto estiver logado como ela');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const messages = await this.prisma.message.findMany({ where: { senderId: id }, select: { id: true } });
    const messageIds = messages.map((m) => m.id);

    await this.prisma.$transaction([
      this.prisma.messageRead.deleteMany({ where: { OR: [{ userId: id }, { messageId: { in: messageIds } }] } }),
      this.prisma.message.deleteMany({ where: { senderId: id } }),
      this.prisma.conversationParticipant.deleteMany({ where: { userId: id } }),
      this.prisma.downloadLog.deleteMany({ where: { userId: id } }),
      this.prisma.payment.deleteMany({ where: { userId: id } }),
      this.prisma.subscription.deleteMany({ where: { userId: id } }),
      this.prisma.auditLog.deleteMany({ where: { adminId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: `Usuário ${user.email} excluído definitivamente.` };
  }

  listSubscriptions() {
    return this.prisma.subscription.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listPayments() {
    return this.prisma.payment.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listDownloadLogs() {
    return this.prisma.downloadLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        file: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async recordAudit(adminId: string, action: string, entity: string, entityId?: string) {
    return this.prisma.auditLog.create({ data: { adminId, action, entity, entityId } });
  }
}
