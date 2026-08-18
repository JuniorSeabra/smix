import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GoogleDriveService } from './google-drive.service';

// Rotas de apoio pro admin, usadas na tela de Arquivos pra navegar o Drive
// em vez de precisar copiar o ID do arquivo manualmente do navegador.
@Controller('admin/google-drive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class GoogleDriveController {
  constructor(private googleDriveService: GoogleDriveService) {}

  @Get('folders')
  listArtistFolders() {
    return this.googleDriveService.listArtistFolders();
  }

  @Get('folders/:folderId/files')
  listFiles(@Param('folderId') folderId: string) {
    return this.googleDriveService.listFilesInFolder(folderId);
  }

  // "Testar arquivo" — confirma que o ID informado existe de fato no Drive antes de salvar.
  @Get('files/:fileId')
  verifyFile(@Param('fileId') fileId: string) {
    return this.googleDriveService.getFileMeta(fileId);
  }
}
