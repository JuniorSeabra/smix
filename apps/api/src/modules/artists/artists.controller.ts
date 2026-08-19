import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private artistsService: ArtistsService) {}

  // Rotas públicas — não exigem login
  @Get()
  findAll(@Query('search') search?: string) {
    return this.artistsService.findAll(search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const artist = await this.artistsService.findOneWithSongs(id);
    if (!artist) throw new NotFoundException('Artista não encontrado');
    return artist;
  }

  // Rotas administrativas — exigem JWT válido E role ADMIN.
  // A verificação acontece aqui no backend, independente do que o frontend mostra.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() body: { name: string; photoUrl?: string; description?: string }) {
    return this.artistsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.artistsService.update(id, body);
  }
}
