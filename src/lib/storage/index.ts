import fs from 'node:fs/promises';
import { accessSync, constants, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getValidatedSupabaseConfig } from '@/lib/db/supabase-config';

export type MediaBucket = 'public-media' | 'private-verification';

export const ALLOWED_PUBLIC_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_PRIVATE_DOC_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
}

export interface StorageAdapter {
  saveFile(params: {
    bucket: MediaBucket;
    folder: string;
    buffer: Buffer;
    contentType: string;
    ownerId: string;
  }): Promise<UploadResult>;
  readFile(bucket: MediaBucket, key: string): Promise<{ buffer: Buffer; contentType: string } | null>;
}

function sanitizeSegment(seg: string): string {
  return seg.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function validateSafeKey(key: string): string {
  const normalized = path.posix.normalize(key).replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid storage key');
  }
  return normalized;
}

function resolveUploadBaseDir(): string {
  if (
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  ) {
    return path.join(os.tmpdir(), 'housed-uploads');
  }
  const localDir = path.resolve(process.cwd(), 'data', 'uploads');
  try {
    mkdirSync(localDir, { recursive: true });
    accessSync(localDir, constants.W_OK);
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'housed-uploads');
  }
}

class LocalDiskStorage implements StorageAdapter {
  private readonly baseDir = resolveUploadBaseDir();

  private getFolderDir(bucket: MediaBucket): string {
    return path.join(this.baseDir, bucket === 'public-media' ? 'public' : 'private');
  }

  async saveFile(params: {
    bucket: MediaBucket;
    folder: string;
    buffer: Buffer;
    contentType: string;
    ownerId: string;
  }): Promise<UploadResult> {
    const ext = MIME_TO_EXT[params.contentType.toLowerCase()];
    if (!ext) {
      throw new Error('Unsupported file content type');
    }

    const safeOwner = sanitizeSegment(params.ownerId);
    const safeFolder = sanitizeSegment(params.folder);
    const key = path.posix.join(safeFolder, safeOwner, `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
    const fullPath = path.join(this.getFolderDir(params.bucket), key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, params.buffer);

    const url =
      params.bucket === 'public-media'
        ? `/api/media/${key}`
        : `/api/verification-docs/${key}`;

    return {
      key,
      url,
      contentType: params.contentType,
      sizeBytes: params.buffer.byteLength,
    };
  }

  async readFile(
    bucket: MediaBucket,
    rawKey: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const key = validateSafeKey(rawKey);
    const fullPath = path.join(this.getFolderDir(bucket), key);
    const rootDir = this.getFolderDir(bucket);
    if (!fullPath.startsWith(rootDir)) {
      return null;
    }
    try {
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).slice(1).toLowerCase();
      return {
        buffer,
        contentType: EXT_TO_MIME[ext] ?? 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }
}

class SupabaseStorageAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async saveFile(params: {
    bucket: MediaBucket;
    folder: string;
    buffer: Buffer;
    contentType: string;
    ownerId: string;
  }): Promise<UploadResult> {
    const ext = MIME_TO_EXT[params.contentType.toLowerCase()];
    if (!ext) {
      throw new Error('Unsupported file content type');
    }

    const safeOwner = sanitizeSegment(params.ownerId);
    const safeFolder = sanitizeSegment(params.folder);
    const key = path.posix.join(safeFolder, safeOwner, `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);

    const { error } = await this.client.storage
      .from(params.bucket)
      .upload(key, params.buffer, {
        contentType: params.contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    let url = `/api/verification-docs/${key}`;
    if (params.bucket === 'public-media') {
      const { data } = this.client.storage.from('public-media').getPublicUrl(key);
      url = data.publicUrl;
    }

    return {
      key,
      url,
      contentType: params.contentType,
      sizeBytes: params.buffer.byteLength,
    };
  }

  async readFile(
    bucket: MediaBucket,
    rawKey: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const key = validateSafeKey(rawKey);
    const { data, error } = await this.client.storage.from(bucket).download(key);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: data.type || EXT_TO_MIME[path.extname(key).slice(1).toLowerCase()] || 'application/octet-stream',
    };
  }
}

let cachedStorage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (cachedStorage) return cachedStorage;
  const sbConfig = getValidatedSupabaseConfig();
  if (sbConfig) {
    cachedStorage = new SupabaseStorageAdapter(sbConfig.url, sbConfig.serviceKey);
  } else {
    cachedStorage = new LocalDiskStorage();
  }
  return cachedStorage;
}
