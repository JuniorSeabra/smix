import { Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SongsService } from './songs.service';
import { CreateSongDto, UpdateSongDto } from './dto/create-song.dto';

@Controller('songs')
export class SongsController {
  constructor(private songsService: SongsService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.songsService.search(typeof q === 'string' ? q.slice(0, 100) : '');
  }

  // ParseUUIDPipe rejeita id malformado antes de chegar ao banco. O que sai daqui
  // é filtrado em SongsService.findOne — googleDriveFileId não vai no payload.
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const song = await this.songsService.findOne(id);
    if (!song) throw new NotFoundException('Música não encontrada');
    return song;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSongDto) {
    return this.songsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSongDto) {
    return this.songsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.songsService.remove(id);
  }
}
