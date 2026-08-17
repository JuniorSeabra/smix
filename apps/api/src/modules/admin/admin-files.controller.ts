import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminFilesService } from './admin-files.service';

@Controller('admin/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFilesController {
  constructor(private adminFilesService: AdminFilesService) {}

  @Get()
  list(@Query('songId') songId?: string) {
    return this.adminFilesService.list(songId);
  }

  @Post()
  create(@Body() body: { songId: string; name: string; type: string; googleDriveFileId: string; licenseId?: string }) {
    return this.adminFilesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.adminFilesService.update(id, body);
  }

  @Get('licenses')
  listLicenses() {
    return this.adminFilesService.listLicenses();
  }

  @Post('licenses')
  createLicense(@Body() body: { name: string; type: string; source?: string; notes?: string }) {
    return this.adminFilesService.createLicense(body);
  }
}
