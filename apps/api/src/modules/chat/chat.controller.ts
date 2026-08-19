import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChatService, RETENTION_HOURS } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ---- Usuário ----

  @Get('conversation')
  listMine(@Req() req: any) {
    return this.chatService.listMyMessages(req.user.userId);
  }

  @Post('conversation/messages')
  sendMine(@Req() req: any, @Body() body: { content: string }) {
    const content = this.chatService.assertContent(body?.content);
    return this.chatService.sendMyMessage(req.user.userId, content);
  }

  @Get('retention')
  retention() {
    return { hours: RETENTION_HOURS };
  }

  // ---- Admin ----
  // Cada rota repete os guards porque o controller inteiro não pode exigir
  // ADMIN: as rotas de cima são do usuário comum.

  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listConversations() {
    return this.chatService.listConversations();
  }

  @Get('admin/conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listConversationMessages(@Param('id') id: string) {
    return this.chatService.listConversationMessages(id);
  }

  @Post('admin/conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reply(@Req() req: any, @Param('id') id: string, @Body() body: { content: string }) {
    const content = this.chatService.assertContent(body?.content);
    return this.chatService.replyAsAdmin(req.user.userId, id, content);
  }

  @Delete('admin/conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteConversation(@Req() req: any, @Param('id') id: string) {
    return this.chatService.deleteConversation(id, req.user.userId);
  }

  @Delete('admin/messages/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteMessage(@Req() req: any, @Param('id') id: string) {
    return this.chatService.deleteMessage(id, req.user.userId);
  }

  @Patch('admin/conversations/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  toggleStatus(@Param('id') id: string) {
    return this.chatService.closeConversation(id);
  }
}
