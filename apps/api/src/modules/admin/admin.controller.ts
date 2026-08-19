import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

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

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'INACTIVE'; name?: string; email?: string; newPassword?: string },
    @Req() req: any,
  ) {
    const result = await this.adminService.updateUser(id, body);
    await this.adminService.recordAudit(req.user.userId, 'update_user', 'User', id);
    return result;
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
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
