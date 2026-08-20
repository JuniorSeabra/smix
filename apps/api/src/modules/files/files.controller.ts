import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard) // exige login para qualquer rota deste controller
export class FilesController {
  constructor(private filesService: FilesService) {}

  // Devolve o link em JSON em vez de redirecionar (302): o frontend chama isto
  // com fetch + Authorization, e um redirect seria seguido pelo próprio fetch,
  // que então bateria no Drive com o header Authorization junto e tomaria erro
  // de CORS. Com o link em mãos, o frontend navega até ele por fora do fetch.
  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const url = await this.filesService.getDownloadUrl(req.user.userId, id, req.ip);
    res.json({ url });
  }
}
