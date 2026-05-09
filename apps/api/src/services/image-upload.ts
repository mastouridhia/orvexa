import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ValidationError } from '../utils/errors.js';
import { imageStorage, type ImageStorage } from './storage.js';

export type UploadDishImageInput = {
  buffer: Buffer;
  contentType: string;
};

export class ImageUploadService {
  private readonly storage: ImageStorage;

  constructor(storage: ImageStorage = imageStorage) {
    this.storage = storage;
  }

  async uploadDishImage(input: UploadDishImageInput): Promise<{ imageUrl: string }> {
    if (!input.contentType.startsWith('image/')) {
      throw new ValidationError('Uploaded file must be an image');
    }

    const processed = await sharp(input.buffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const filename = `${randomUUID()}.webp`;
    const relativePath = `dishes/${filename}`;
    const imageUrl = await this.storage.save(processed, relativePath);
    return { imageUrl };
  }

  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (!url) return;
    await this.storage.delete(url);
  }
}
