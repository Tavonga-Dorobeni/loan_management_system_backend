import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

import { config } from '@/common/config';

export interface S3UploadUrlResult {
  key: string;
  uploadUrl: string;
  objectUrl: string;
}

export interface S3UploadResult {
  key: string;
  objectUrl: string;
}

export class S3Service {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: config.integrations.s3.region,
      credentials:
        config.integrations.s3.accessKeyId &&
        config.integrations.s3.secretAccessKey
          ? {
              accessKeyId: config.integrations.s3.accessKeyId,
              secretAccessKey: config.integrations.s3.secretAccessKey,
            }
          : undefined,
    });
  }

  private buildObjectUrl(key: string): string {
    if (config.integrations.s3.publicBaseUrl) {
      return `${config.integrations.s3.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return `https://${config.integrations.s3.bucket}.s3.${config.integrations.s3.region}.amazonaws.com/${key}`;
  }

  async generateUploadUrl(params: {
    borrowerId: number;
    fileName: string;
    contentType: string;
  }): Promise<S3UploadUrlResult> {
    const key = `kyc/${params.borrowerId}/${Date.now()}-${params.fileName}`;

    const command = new PutObjectCommand({
      Bucket: config.integrations.s3.bucket,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: config.integrations.s3.signedUrlTtl,
    });

    return {
      key,
      uploadUrl,
      objectUrl: this.buildObjectUrl(key),
    };
  }

  async uploadKycDocument(params: {
    borrowerId: number;
    fileName: string;
    contentType: string;
    body: Buffer;
  }): Promise<S3UploadResult> {
    const key = `kyc/${params.borrowerId}/${Date.now()}-${randomUUID()}-${params.fileName}`;

    const command = new PutObjectCommand({
      Bucket: config.integrations.s3.bucket,
      Key: key,
      ContentType: params.contentType,
      Body: params.body,
    });

    await this.client.send(command);

    return {
      key,
      objectUrl: this.buildObjectUrl(key),
    };
  }

  async getSignedReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: config.integrations.s3.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: config.integrations.s3.signedUrlTtl,
    });
  }

  parseKeyFromUrl(url: string): string {
    const publicBase = config.integrations.s3.publicBaseUrl.replace(/\/$/, '');
    if (publicBase && url.startsWith(publicBase)) {
      return url.replace(`${publicBase}/`, '');
    }

    const prefix = `https://${config.integrations.s3.bucket}.s3.${config.integrations.s3.region}.amazonaws.com/`;
    if (url.startsWith(prefix)) {
      return url.replace(prefix, '');
    }

    return url;
  }
}

export const s3Service = new S3Service();
