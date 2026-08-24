import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminFilesService } from './admin-files.service';
import { CreateFileDto, CreateLicenseDto, UpdateFileDto } from './dto/file.dto';

@Controller('admin/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFilesController {
  constructor(private adminFilesService: AdminFilesService) {}

  // 'licenses' precisa vir antes de qualquer rota com parâmetro no mesmo nível,
  // senão o Nest casaria /admin/files/licenses com um :id.
  @Get('licenses')
  listLicenses() {
    return this.adminFilesService.listLicenses();
  }

  @Post('licenses')
  createLicense(@Body() dto: CreateLicenseDto) {
    return this.adminFilesService.createLicense(dto);
  }

  @Get()
  list(@Query('songId') songId?: string) {
    return this.adminFilesService.list(songId);
  }

  // Botão "Sincronizar com o Drive" — lê as pastas de cantor e importa pro
  // banco o que ainda não existe. É a via segura de subir conteúdo (leitura
  // não esbarra na cota de Service Account que um upload direto esbarraria).
  @Post('sync-drive')
  syncDrive() {
    return this.adminFilesService.syncFromDrive();
  }

  @Post()
  create(@Body() dto: CreateFileDto) {
    return this.adminFilesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFileDto) {
    return this.adminFilesService.update(id, dto);
  }
}
