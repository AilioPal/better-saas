/**
 * Cross-platform image processor
 * Uses Jimp instead of sharp, supports Vercel Serverless Functions, Edge Functions and Cloudflare Workers
 */

import { appConfig } from '@/config/app.config';
import Jimp from 'jimp';

export interface ImageMetadata {
  width: number;
  height: number;
}

/**
 * Decode image
 */
async function decodeImage(buffer: Buffer): Promise<Jimp> {
  try {
    return await Jimp.read(buffer);
  } catch (error) {
    throw new Error(
      `Failed to decode image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate thumbnail
 * Equivalent to sharp(buffer).resize(300, 300, { fit: 'cover', position: 'center' }).jpeg({ quality: 80 }).toBuffer()
 */
export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    // Decode original image
    const image = await decodeImage(buffer);

    // Resize - use cover mode (maintain aspect ratio, crop excess)
    const resizedImage = image.cover(300, 300);

    // Set JPEG quality and convert to Buffer
    const thumbnailBuffer = await resizedImage.quality(80).getBufferAsync(Jimp.MIME_JPEG);

    return thumbnailBuffer;
  } catch (error) {
    throw new Error(
      `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get image metadata
 * Equivalent to sharp(buffer).metadata()
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    // Decode image to get dimension information
    const image = await decodeImage(buffer);

    return {
      width: image.getWidth(),
      height: image.getHeight(),
    };
  } catch (error) {
    throw new Error(
      `Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Use configuration from appConfig
  const { allowedTypes, maxFileSize } = appConfig.upload;

  if (!allowedTypes.includes(file.type)) {
    const supportedFormats = allowedTypes
      .map((type) => type.replace('image/', '').toUpperCase())
      .join(', ');
    return { valid: false, error: `Only ${supportedFormats} image formats are supported` };
  }

  if (file.size > maxFileSize) {
    const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
    return { valid: false, error: `File size cannot exceed ${maxSizeMB}MB` };
  }

  return { valid: true };
}
