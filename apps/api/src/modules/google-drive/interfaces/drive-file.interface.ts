export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface DriveFileStream {
  stream: NodeJS.ReadableStream;
  name: string;
  mimeType: string;
  size: number | null;
}
