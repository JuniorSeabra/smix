import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFileDto {
  @IsUUID()
  songId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  googleDriveFileId!: string;

  @IsOptional()
  @IsUUID()
  licenseId?: string;
}

// Substitui o `@Body() body: any` que ia inteiro pro prisma.file.update.
export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  googleDriveFileId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CreateLicenseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
