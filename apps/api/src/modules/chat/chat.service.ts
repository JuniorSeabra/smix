import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Quanto tempo uma conversa fica guardada no site. Passado isso ela é apagada
// sozinha, junto com as mensagens.
export const RETENTION_HOURS = 48;

// A limpeza roda junto das requisições de chat, não num cron. Motivo prático:
// a API dorme quando fica ociosa (plano free do Render) e um agendador não
// dispararia nesse período — enquanto que, do jeito abaixo, nenhuma conversa
// vencida chega a ser exibida, porque a limpeza acontece antes da leitura.
const PURGE_INTERVAL_MS = 60_000;

@Injectable()
export class ChatService {
  private lastPurgeAt = 0;

  constructor(private prisma: PrismaService) {}

  private cutoff() {
    return new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
  }

  /** Apaga o que passou das 48h. Throttled: no máximo uma vez por minuto. */
  async purgeExpired(force = false) {
    if (!force && Date.now() - this.lastPurgeAt < PURGE_INTERVAL_MS) return { deleted: 0 };
    this.lastPurgeAt = Date.now();

    const cutoff = this.cutoff();
    const expired = await this.prisma.message.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
    });
    const expiredIds = expired.map((m) => m.id);

    if (expiredIds.length > 0) {
      await this.prisma.$transaction([
        this.prisma.messageRead.deleteMany({ where: { messageId: { in: expiredIds } } }),
        this.prisma.message.deleteMany({ where: { id: { in: expiredIds } } }),
      ]);
    }

    // Conversa que ficou sem nenhuma mensagem e sem movimento também sai —
    // senão a lista do admin encheria de conversa vazia.
    const empty = await this.prisma.conversation.findMany({
      where: { updatedAt: { lt: cutoff }, messages: { none: {} } },
      select: { id: true },
    });
    if (empty.length > 0) {
      const emptyIds = empty.map((c) => c.id);
      await this.prisma.$transaction([
        this.prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: emptyIds } } }),
        this.prisma.conversation.deleteMany({ where: { id: { in: emptyIds } } }),
      ]);
    }

    return { deleted: expiredIds.length };
  }

  /** Cada usuário tem uma conversa de suporte; é criada no primeiro acesso. */
  private async getOrCreateConversation(userId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { participants: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        status: 'open',
        participants: { create: { userId, role: 'user' } },
      },
    });
  }

  async listMyMessages(userId: string) {
    await this.purgeExpired();
    const conversation = await this.getOrCreateConversation(userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: m.sender.name,
      fromAdmin: m.sender.role === 'ADMIN',
      createdAt: m.createdAt,
      isMine: m.senderId === userId,
    }));
  }

  async sendMyMessage(userId: string, content: string) {
    await this.purgeExpired();
    const conversation = await this.getOrCreateConversation(userId);

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, content: content.trim() },
    });
    // Mexe no updatedAt: é ele que ordena a fila do admin e que segura a
    // conversa viva enquanto houver movimento.
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'open', updatedAt: new Date() },
    });

    return message;
  }

  // ---- Admin ----

  async listConversations() {
    await this.purgeExpired();

    const conversations = await this.prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          where: { role: 'user' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      take: 100,
    });

    return conversations.map((c) => {
      const user = c.participants[0]?.user ?? null;
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        status: c.status,
        user,
        messageCount: c._count.messages,
        lastMessage: last ? { content: last.content, createdAt: last.createdAt } : null,
        updatedAt: c.updatedAt,
        // Quando a conversa some sozinha, contado a partir da última mensagem.
        expiresAt: new Date(
          new Date(last?.createdAt ?? c.updatedAt).getTime() + RETENTION_HOURS * 60 * 60 * 1000,
        ),
      };
    });
  }

  async listConversationMessages(conversationId: string) {
    await this.purgeExpired();

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    const user = conversation.participants.find((p) => p.role === 'user')?.user ?? null;

    return {
      id: conversation.id,
      status: conversation.status,
      user,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.sender.name,
        fromAdmin: m.sender.role === 'ADMIN',
        createdAt: m.createdAt,
      })),
    };
  }

  async replyAsAdmin(adminId: string, conversationId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    // Garante o admin como participante — sem isso a conversa fica sem dono do
    // lado do suporte e não dá pra saber quem respondeu depois.
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: adminId } },
      create: { conversationId, userId: adminId, role: 'admin' },
      update: {},
    });

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: adminId, content: content.trim() },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'open', updatedAt: new Date() },
    });

    return message;
  }

  /** Exclusão manual pelo admin — conversa curta não precisa esperar as 48h. */
  async deleteConversation(conversationId: string, adminId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { select: { id: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const messageIds = conversation.messages.map((m) => m.id);

    await this.prisma.$transaction([
      this.prisma.messageRead.deleteMany({ where: { messageId: { in: messageIds } } }),
      this.prisma.message.deleteMany({ where: { conversationId } }),
      this.prisma.conversationParticipant.deleteMany({ where: { conversationId } }),
      this.prisma.conversation.delete({ where: { id: conversationId } }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'delete_conversation', entity: 'Conversation', entityId: conversationId },
      }),
    ]);

    return { message: 'Conversa excluída.' };
  }

  async deleteMessage(messageId: string, adminId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    await this.prisma.$transaction([
      this.prisma.messageRead.deleteMany({ where: { messageId } }),
      this.prisma.message.delete({ where: { id: messageId } }),
      this.prisma.auditLog.create({
        data: { adminId, action: 'delete_message', entity: 'Message', entityId: messageId },
      }),
    ]);

    return { message: 'Mensagem excluída.' };
  }

  async closeConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: conversation.status === 'open' ? 'closed' : 'open' },
    });
  }

  assertContent(content: unknown): string {
    if (typeof content !== 'string' || !content.trim()) {
      throw new BadRequestException('Mensagem vazia');
    }
    return content.slice(0, 2000);
  }
}
