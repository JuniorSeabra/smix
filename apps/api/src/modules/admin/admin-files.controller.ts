import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as fs from 'fs';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminFilesService } from './admin-files.service';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB — multitrack costuma ser um arquivo grande

@Controller('admin/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFilesController {
  constructor(private adminFilesService: AdminFilesService) {}

  @Get()
  list(@Query('songId') songId?: string) {
    return this.adminFilesService.list(songId);
  }

  // Cadastro simplificado: Cantor + Música + arquivo do computador -> Vincular.
  // O arquivo vai pra disco temporário (não pra memória — pode ter centenas de
  // MB) e é apagado assim que termina de subir pro Drive, dê certo ou erro.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: os.tmpdir() }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @Body() body: { artistName: string; title: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo no campo "file"');
    if (!body.artistName?.trim()) throw new BadRequestException('Informe o nome do cantor');
    if (!body.title?.trim()) throw new BadRequestException('Informe o nome da música');

    try {
      return await this.adminFilesService.uploadAndLink(body.artistName, body.title, file);
    } finally {
      fs.unlink(file.path, () => {});
    }
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
