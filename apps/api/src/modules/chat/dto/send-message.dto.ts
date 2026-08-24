import { IsString, MaxLength, MinLength } from 'class-validator';

// O corte em 2000 caracteres já existia em ChatService.assertContent, mas só
// depois do corpo ter sido aceito. Validar aqui rejeita antes, e de quebra
// impede que outro campo qualquer entre junto no @Body().
export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
