import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IsSafeImageUrl } from '../../../common/validators/image-url.validator';

// Classe, e não tipo inline no @Body().
//
// O ValidationPipe de bootstrap.ts (whitelist + forbidNonWhitelisted) depende de
// metadata que o class-validator grava na classe. Um tipo TypeScript escrito
// direto no parâmetro é apagado na compilação: o pipe não encontra metadata
// nenhuma e deixa o corpo passar inteiro, sem validar e sem filtrar campo extra.
export class CreateSongDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsUUID()
  artistId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsSafeImageUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class UpdateSongDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsSafeImageUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
