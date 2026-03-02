import type { FileResponseDto } from '@/modules/files/dto';

export class FileService {
  async list(): Promise<FileResponseDto[]> {
    // TODO: Replace placeholder file list with actual persistence and storage metadata.
    return [
      {
        id: '30000000-0000-0000-0000-000000000001',
        fileName: 'placeholder.txt',
        mimeType: 'text/plain',
        storageKey: null,
      },
    ];
  }
}

export const fileService = new FileService();
