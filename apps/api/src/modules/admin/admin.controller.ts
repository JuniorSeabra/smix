import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Todo o controller exige login + role ADMIN, verificado no backend.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // Série temporal + agregados usados pelos gráficos de /admin/atividade.
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    const user = await this.adminService.createUser(dto);
    await this.adminService.recordAudit(req.user.userId, 'create_user', 'User', user.id);
    return user;
  }

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.updateUser(id, dto);
    await this.adminService.recordAudit(req.user.userId, 'update_user', 'User', id);
    return result;
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.adminService.deleteUser(id, req.user.userId);
  }

  @Get('songs')
  listSongs(@Query('search') search?: string) {
    return this.adminService.listSongs(search);
  }

  @Get('subscriptions')
  listSubscriptions() {
    return this.adminService.listSubscriptions();
  }

  @Get('payments')
  listPayments() {
    return this.adminService.listPayments();
  }

  @Get('downloads')
  listDownloadLogs() {
    return this.adminService.listDownloadLogs();
  }

  @Get('audit-logs')
  listAuditLogs() {
    return this.adminService.listAuditLogs();
  }
}
