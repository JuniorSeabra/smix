import { Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ArtistsService } from './artists.service';
import { CreateArtistDto, UpdateArtistDto } from './dto/artist.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private artistsService: ArtistsService) {}

  // Rotas públicas — não exigem login
  @Get()
  findAll(@Query('search') search?: string) {
    return this.artistsService.findAll(typeof search === 'string' ? search.slice(0, 100) : undefined);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const artist = await this.artistsService.findOneWithSongs(id);
    if (!artist) throw new NotFoundException('Artista não encontrado');
    return artist;
  }

  // Rotas administrativas — exigem JWT válido E role ADMIN.
  // A verificação acontece aqui no backend, independente do que o frontend mostra.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateArtistDto) {
    return this.artistsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.artistsService.remove(id);
  }
}
