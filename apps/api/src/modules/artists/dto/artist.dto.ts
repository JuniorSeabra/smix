import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsSafeImageUrl } from '../../../common/validators/image-url.validator';

export class CreateArtistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsSafeImageUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

// Substitui o `@Body() body: any` que ia inteiro pro prisma.artist.update.
// Com `any` o corpo era gravado sem filtro (mass assignment): qualquer coluna do
// modelo Artist podia ser escrita por quem alcançasse a rota, incluindo as que a
// tela nunca oferece. Aqui só estes quatro campos passam.
export class UpdateArtistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsSafeImageUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
