import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Foto vem como multipart (campo "photo"), não mais como base64 no JSON —
  // ver AuthController.register e common/utils/profile-photo.ts.
}
