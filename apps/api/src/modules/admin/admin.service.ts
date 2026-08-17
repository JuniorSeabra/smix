import { Injectable } from '@nestjs/common';
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
