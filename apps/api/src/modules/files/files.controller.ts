import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard) // exige login para qualquer rota deste controller
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const file = await this.filesService.getDownloadStream(req.user.userId, id, req.ip);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    if (file.size) res.setHeader('Content-Length', file.size);

    file.stream.pipe(res);
  }
}
