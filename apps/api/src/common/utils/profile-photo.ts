import { UnsupportedMediaTypeException, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — vindo já do multer, checado de novo aqui por segurança
const OUTPUT_SIZE = 512;

// Nunca confia no MIME/extensão que o cliente declarou: sharp lê os bytes reais
// do arquivo e falha se não for uma imagem de verdade, recodifica pra webp
// (removendo metadados EXIF/polyglot) e redimensiona pra um tamanho fixo.
export async function processProfilePhoto(buffer: Buffer, declaredMimeType: string): Promise<string> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new PayloadTooLargeException('Imagem muito grande (máximo 5MB)');
  }
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    throw new UnsupportedMediaTypeException('Formato de imagem não suportado (use JPEG, PNG ou WebP)');
  }

  let output: Buffer;
  try {
    output = await sharp(buffer)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new UnsupportedMediaTypeException('Arquivo enviado não é uma imagem válida');
  }

  return `data:image/webp;base64,${output.toString('base64')}`;
}

// multer.fileFilter — rejeita cedo por extensão/mimetype declarados, antes mesmo
// de gastar tempo lendo o corpo do arquivo. A validação de verdade (bytes reais)
// acontece em processProfilePhoto acima.
export function profilePhotoFileFilter(
  _req: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new UnsupportedMediaTypeException('Formato de imagem não suportado (use JPEG, PNG ou WebP)'), false);
    return;
  }
  callback(null, true);
}

export const PROFILE_PHOTO_MULTER_LIMITS = { fileSize: MAX_UPLOAD_BYTES };
