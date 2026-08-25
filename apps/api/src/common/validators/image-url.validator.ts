import { registerDecorator, ValidationOptions } from 'class-validator';

// Só https:// e data:image/... são aceitos como origem de imagem.
//
// Esses valores (photoUrl de artista, coverUrl de música) vão direto pro
// atributo src de uma <img> no frontend. Navegador atual não executa
// javascript: em img src, então isto não é a última linha de defesa contra XSS —
// mas http:// puro gera conteúdo misto num site https, e um esquema exótico
// (javascript:, vbscript:, blob:) não tem nenhum uso legítimo aqui. Restringir a
// dois esquemas conhecidos é mais barato que auditar cada consumidor depois.
export function IsSafeImageUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeImageUrl',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} deve ser uma URL https:// ou um data:image/`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return /^https:\/\//i.test(value) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value);
        },
      },
    });
  };
}
