export class S3Service {
  async generateUploadUrl(
    fileName: string
  ): Promise<{ fileName: string; uploadUrl: string | null }> {
    // TODO: Replace placeholder S3 integration with the project-specific implementation.
    return {
      fileName,
      uploadUrl: null,
    };
  }
}

export const s3Service = new S3Service();
