import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from '../config.js';

export interface ImageStorage {
  save(buffer: Buffer, relativePath: string): Promise<string>;
  delete(url: string): Promise<void>;
  toRelative(url: string): string | null;
}

export class LocalImageStorage implements ImageStorage {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;
  private readonly publicPathPrefix = '/uploads';

  constructor(
    rootDir: string = resolve(process.cwd(), config.uploads.dir),
    publicBaseUrl: string = config.uploads.publicBaseUrl,
  ) {
    this.rootDir = rootDir;
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
  }

  rootDirectory(): string {
    return this.rootDir;
  }

  async save(buffer: Buffer, relativePath: string): Promise<string> {
    const safe = relativePath.replace(/^\/+/, '');
    const target = join(this.rootDir, safe);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, buffer);
    return `${this.publicBaseUrl}${this.publicPathPrefix}/${safe.replaceAll('\\', '/')}`;
  }

  toRelative(url: string): string | null {
    const expectedPrefix = `${this.publicBaseUrl}${this.publicPathPrefix}/`;
    if (!url.startsWith(expectedPrefix)) return null;
    return url.slice(expectedPrefix.length);
  }

  async delete(url: string): Promise<void> {
    const rel = this.toRelative(url);
    if (!rel) return;
    const target = join(this.rootDir, rel);
    await unlink(target).catch(() => undefined);
  }
}

export const imageStorage: ImageStorage = new LocalImageStorage();
