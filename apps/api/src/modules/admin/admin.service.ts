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

  // Números agregados pro painel de Atividade. A agregação roda no banco (não
  // no navegador, sobre uma lista já truncada em 50 registros), pra que os
  // gráficos mostrem o total real e não só o que coube na última listagem.
  async getStats() {
    const days = 14;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [dashboard, downloadsByDay, auditByDay, topFiles] = await Promise.all([
      this.getDashboard(),
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "DownloadLog"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day
      `,
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
        FROM "AuditLog"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day
      `,
      this.prisma.downloadLog.groupBy({
        by: ['fileId'],
        _count: { fileId: true },
        orderBy: { _count: { fileId: 'desc' } },
        take: 5,
      }),
    ]);

    const files = await this.prisma.file.findMany({
      where: { id: { in: topFiles.map((f) => f.fileId) } },
      select: {
        id: true,
        name: true,
        song: { select: { title: true, artist: { select: { name: true } } } },
      },
    });

    // Preenche os dias sem registro com zero — senão o gráfico "pula" datas e
    // dá a impressão de movimento em dia que não teve nada.
    const toSeries = (rows: { day: Date; count: bigint }[]) => {
      const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]));
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(since);
        date.setDate(since.getDate() + i);
        const key = date.toISOString().slice(0, 10);
        return { date: key, count: byDay.get(key) ?? 0 };
      });
    };

    const { recentPayments, ...totals } = dashboard;

    return {
      totals,
      downloadsPerDay: toSeries(downloadsByDay),
      auditPerDay: toSeries(auditByDay),
      topDownloads: topFiles.map((row) => {
        const file = files.find((f) => f.id === row.fileId);
        return {
          fileId: row.fileId,
          title: file?.song?.title ?? file?.name ?? 'Arquivo removido',
          artist: file?.song?.artist?.name ?? '',
          count: row._count.fileId,
        };
      }),
    };
  }


  async recordAudit(adminId: string, action: string, entity: string, entityId?: string) {
    return this.prisma.auditLog.create({ data: { adminId, action, entity, entityId } });
  }
}
