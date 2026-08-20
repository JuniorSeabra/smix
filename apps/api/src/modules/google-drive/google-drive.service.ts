import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs';
import { DriveFileMeta } from './interfaces/drive-file.interface';

// Extensões conhecidas dos multitracks (hoje temos .rar e .zip nas pastas reais do Drive,
// não só .rar como uma versão anterior da spec assumia).
const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  rar: 'application/x-rar-compressed',
  zip: 'application/zip',
};

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: drive_v3.Drive | null = null;

  private getClient(): drive_v3.Drive {
    if (this.drive) return this.drive;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!email || !privateKey) {
      throw new ServiceUnavailableException('Integração com Google Drive não configurada (variáveis de ambiente ausentes)');
    }

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      // Precisa de escrita (não só .readonly) pra criar pasta de artista e
      // subir arquivo — a pasta S-MIX no Drive foi compartilhada como "Editor".
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
    return this.drive;
  }

  private guessMimeType(name: string, reportedMimeType: string | null | undefined): string {
    if (reportedMimeType && reportedMimeType !== 'application/octet-stream') return reportedMimeType;
    const ext = name.split('.').pop()?.toLowerCase();
    return (ext && EXTENSION_MIME_FALLBACK[ext]) || 'application/octet-stream';
  }

  // Pastas de artista dentro da raiz do S-MIX (GOOGLE_DRIVE_ROOT_FOLDER_ID).
  async listArtistFolders(): Promise<DriveFileMeta[]> {
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootId) throw new ServiceUnavailableException('GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado');
    return this.listChildren(rootId, "mimeType = 'application/vnd.google-apps.folder'");
  }

  // Arquivos dentro da pasta de um artista.
  async listFilesInFolder(folderId: string): Promise<DriveFileMeta[]> {
    return this.listChildren(folderId, "mimeType != 'application/vnd.google-apps.folder'");
  }

  private async listChildren(folderId: string, extraQuery: string): Promise<DriveFileMeta[]> {
    try {
      const drive = this.getClient();
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and ${extraQuery}`,
        fields: 'files(id, name, mimeType, size)',
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      return (res.data.files ?? []).map((f) => ({
        id: f.id!,
        name: f.name!,
        mimeType: this.guessMimeType(f.name!, f.mimeType),
        size: f.size ? Number(f.size) : null,
      }));
    } catch (err) {
      this.logger.error(`Falha ao listar pasta ${folderId} no Google Drive`, err as Error);
      throw new ServiceUnavailableException('Não foi possível acessar o Google Drive no momento');
    }
  }

  async getFileMeta(fileId: string): Promise<DriveFileMeta> {
    try {
      const drive = this.getClient();
      const res = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true,
      });
      return {
        id: res.data.id!,
        name: res.data.name!,
        mimeType: this.guessMimeType(res.data.name!, res.data.mimeType),
        size: res.data.size ? Number(res.data.size) : null,
      };
    } catch (err: any) {
      if (err?.code === 404) throw new NotFoundException('Arquivo não encontrado no Google Drive');
      this.logger.error(`Falha ao buscar metadados do arquivo ${fileId} no Google Drive`, err as Error);
      throw new ServiceUnavailableException('Não foi possível acessar o Google Drive no momento');
    }
  }

  // Acha a pasta do cantor dentro da raiz do S-MIX pelo nome (sem diferenciar
  // maiúscula/acento) e reaproveita ela; só cria uma nova se realmente não existir.
  // Evita duplicar pasta pro mesmo cantor por causa de "Aline Barros" vs "aline barros".
  async findOrCreateArtistFolder(artistName: string): Promise<string> {
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootId) throw new ServiceUnavailableException('GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado');

    const drive = this.getClient();
    const normalizedTarget = artistName.trim().toLowerCase();

    try {
      const existing = await this.listChildren(rootId, "mimeType = 'application/vnd.google-apps.folder'");
      const match = existing.find((folder) => folder.name.trim().toLowerCase() === normalizedTarget);
      if (match) return match.id;

      const created = await drive.files.create({
        requestBody: {
          name: artistName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      return created.data.id!;
    } catch (err) {
      this.logger.error(`Falha ao criar/achar pasta do artista "${artistName}" no Google Drive`, err as Error);
      throw new ServiceUnavailableException('Não foi possível organizar a pasta do artista no Google Drive');
    }
  }

  // Sobe um arquivo de multitrack pra dentro da pasta do artista. Lê de um
  // arquivo temporário em disco (não da memória) — os arquivos costumam ter
  // centenas de MB, e bufferizar isso tudo em RAM derrubaria a instância grátis.
  async uploadFile(folderId: string, fileName: string, tempFilePath: string, mimeType: string): Promise<DriveFileMeta> {
    try {
      const drive = this.getClient();
      const res = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: fs.createReadStream(tempFilePath) },
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true,
      });
      return {
        id: res.data.id!,
        name: res.data.name!,
        mimeType: this.guessMimeType(res.data.name!, res.data.mimeType),
        size: res.data.size ? Number(res.data.size) : null,
      };
    } catch (err) {
      this.logger.error(`Falha ao subir arquivo "${fileName}" pro Google Drive`, err as Error);
      throw new ServiceUnavailableException('Não foi possível enviar o arquivo para o Google Drive');
    }
  }

  // Link de download direto do arquivo.
  //
  // Tem que ser drive.usercontent.google.com, não o antigo drive.google.com/uc:
  // o /uc responde 303 pro usercontent e descarta o confirm=t no caminho, e sem
  // esse parâmetro o Drive devolve a página "não foi possível verificar se há
  // vírus" em vez do arquivo — o que acontece com qualquer arquivo acima de
  // ~100MB, ou seja, com todos os nossos multitracks. (Verificado em 20/08/2026.)
  buildDownloadUrl(fileId: string): string {
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }

  // Libera o arquivo pra download direto e devolve o link do Google.
  //
  // Por que não fazemos mais proxy (o que este método fazia antes): cada byte do
  // multitrack passava pelo servidor, e 6 downloads de 800MB já estouram os 5GB
  // mensais do plano grátis — foi exatamente o que suspendeu a API em 20/08/2026.
  // Mandando o músico direto pro Drive, o tráfego não encosta no nosso host.
  //
  // O Drive não tem link assinado com validade (como S3/R2 têm), então a única
  // forma de liberar é marcar o arquivo como público. Pra isso não virar um
  // vazamento permanente do catálogo pago, a permissão criada aqui é revogada
  // minutos depois por revokePublicAccess() — quem chama guarda o permissionId.
  async grantTemporaryPublicAccess(fileId: string): Promise<{ permissionId: string; downloadUrl: string }> {
    try {
      const drive = this.getClient();
      const permission = await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        fields: 'id',
        supportsAllDrives: true,
      });
      return { permissionId: permission.data.id!, downloadUrl: this.buildDownloadUrl(fileId) };
    } catch (err: any) {
      if (err?.code === 404) throw new NotFoundException('Arquivo não encontrado no Google Drive');
      this.logger.error(`Falha ao liberar acesso temporário ao arquivo ${fileId}`, err as Error);
      throw new ServiceUnavailableException('Não foi possível liberar o download no momento');
    }
  }

  // Fecha uma liberação. Nunca lança: é chamado em lote pelo sweep de limpeza, e
  // uma permissão que já sumiu (404) ou um arquivo apagado no Drive não podem
  // impedir a revogação das outras liberações da mesma leva.
  async revokePublicAccess(fileId: string, permissionId: string): Promise<boolean> {
    try {
      const drive = this.getClient();
      await drive.permissions.delete({ fileId, permissionId, supportsAllDrives: true });
      return true;
    } catch (err: any) {
      if (err?.code === 404) return true; // já não existe — o acesso está fechado, que é o objetivo
      this.logger.error(`Falha ao revogar permissão ${permissionId} do arquivo ${fileId}`, err as Error);
      return false;
    }
  }
}
