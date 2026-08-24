import { Controller, Get, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
  //
  // Limite próprio, abaixo do global: cada chamada abre uma permissão pública de
  // 60 minutos no Drive. Uma conta legítima baixa alguns arquivos por sessão;
  // 100/min permitiria a um único login escancarar o catálogo inteiro em pouco
  // tempo, e as janelas ficariam todas abertas simultaneamente.
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get(':id/download')
  async download(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Res() res: Response) {
    const url = await this.filesService.getDownloadUrl(req.user.userId, id, req.ip);
    res.json({ url });
  }
}
