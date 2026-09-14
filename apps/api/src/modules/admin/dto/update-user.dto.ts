import { IsEmail, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Mesmo mínimo do cadastro (RegisterDto/CreateUserDto). Sem isto, a troca de
  // senha pelo painel era o único caminho que aceitava senha de qualquer
  // tamanho — inclusive uma letra.
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  // string ISO pra definir, ou null pra limpar (liberar de novo sem data
  // limite). @IsOptional() do class-validator pula a validação tanto pra
  // undefined (campo não enviado) quanto pra null (envio explícito de "sem data").
  @IsOptional()
  @IsISO8601({}, { message: 'Data de expiração inválida' })
  accessExpiresAt?: string | null;
}
