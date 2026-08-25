import { IsString, MaxLength, MinLength } from 'class-validator';

// ESCALAÇÃO DE PRIVILÉGIO — motivo real desta classe existir.
//
// Antes o controller declarava `@Body() body: { name?: string }`, um tipo
// TypeScript inline. Tipo inline vira `Object` no metadata em tempo de execução,
// e o ValidationPipe ignora `Object` — ou seja, o corpo NÃO era validado nem
// filtrado. Esse mesmo objeto ia inteiro pro `prisma.user.update({ data })` em
// UsersService.updateProfile.
//
// Na prática, qualquer usuário logado virava administrador com uma requisição:
//
//     PATCH /users/me   {"role":"ADMIN"}
//
// E como JwtStrategy.validate relê o cargo do banco a cada requisição (correto,
// para desativação ter efeito imediato), a promoção valia no request seguinte —
// sem relogar, sem passar por /admin/usuarios, sem deixar registro em AuditLog.
// Dava também pra escrever status e passwordHash pelo mesmo caminho.
//
// Com a classe abaixo o ValidationPipe volta a agir: `whitelist` remove qualquer
// campo fora daqui e `forbidNonWhitelisted` responde 400 em vez de aceitar calado.
export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
