import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Cadastro feito pelo admin, dentro do painel. É o único caminho de entrada
// enquanto PUBLIC_SIGNUP_ENABLED estiver desligado — ver AuthService.register.
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  // Já deixa o usuário podendo baixar, sem passar por cobrança. É o que faz
  // sentido enquanto a plataforma está em teste e o gateway ainda é "manual":
  // sem isto o usuário entra mas esbarra na exigência de assinatura ativa.
  @IsOptional()
  @IsBoolean()
  activateSubscription?: boolean;
}
