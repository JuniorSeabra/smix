import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard) // exige login para qualquer rota deste controller
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get(':id/download')
  download(@Param('id') id: string, @Req() req: any) {
    return this.filesService.getDownloadUrl(req.user.userId, id);
  }
}
