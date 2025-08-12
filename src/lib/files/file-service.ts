import { ErrorLogger } from '@/lib/logger/logger-utils';
import { type CreateFileData, fileRepository } from '@/server/db/repositories';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as createSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateThumbnail, getImageMetadata, validateImageFile } from './image-processor';
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from './r2-client';

const fileServiceErrorLogger = new ErrorLogger('file-service');

export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  r2Key: string;
  thumbnailKey?: string;
  uploadUserId: string;
  uploadUserEmail?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Generate file storage path
 */
export function generateR2Key(
  filename: string,
  type: 'original' | 'thumbnail' = 'original'
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const prefix = type === 'thumbnail' ? 'thumbnails' : 'images';
  return `${prefix}/${year}/${month}/${filename}`;
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return `${uuid}-${timestamp}.${ext}`;
}

// 图像处理函数现在从 image-processor.ts 导入

/**
 * Upload file to R2
 */
export async function uploadToR2(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate file access URL
 */
export function getFileUrl(r2Key: string): string {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

/**
 * Generate presigned URL (for private access)
 */
export async function getSignedUrl(r2Key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });

  return createSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Complete file upload process (including database operations)
 */
export async function uploadFile(file: File, userId: string): Promise<FileInfo> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Read file content
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get image metadata
  const { width, height } = await getImageMetadata(buffer);

  // Generate filename and path
  const filename = generateUniqueFilename(file.name);
  const r2Key = generateR2Key(filename);
  const thumbnailKey = generateR2Key(filename, 'thumbnail');

  // Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(buffer);

  // Upload original image to R2
  await uploadToR2(r2Key, buffer, file.type);

  // Upload thumbnail to R2
  await uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg');

  // Save file info to database
  const fileData: CreateFileData = {
    id: crypto.randomUUID(),
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    width,
    height,
    r2Key,
    thumbnailKey,
    uploadUserId: userId,
  };

  const fileInfo = await fileRepository.create(fileData);

  // Add access URL
  return {
    ...fileInfo,
    url: getFileUrl(r2Key),
    thumbnailUrl: getFileUrl(thumbnailKey),
  };
}

/**
 * Delete file (including R2 and database)
 */
export async function deleteFile(fileId: string, userId?: string): Promise<boolean> {
  // Get file info from database
  const fileInfo = await fileRepository.findById(fileId);
  if (!fileInfo) {
    return false;
  }

  // If user ID is specified, verify permissions
  if (userId && fileInfo.uploadUserId !== userId) {
    throw new Error('No permission to delete this file');
  }

  try {
    // Delete file from R2
    await deleteFromR2(fileInfo.r2Key);

    // Delete thumbnail
    if (fileInfo.thumbnailKey) {
      await deleteFromR2(fileInfo.thumbnailKey);
    }

    // Delete record from database
    const deleted = userId
      ? await fileRepository.deleteByUserId(userId, fileId)
      : await fileRepository.delete(fileId);

    return deleted;
  } catch (error) {
    fileServiceErrorLogger.logError(error as Error, {
      operation: 'deleteFile',
      fileId,
      userId,
      r2Key: fileInfo.r2Key,
    });
    return false;
  }
}

/**
 * Get file list (with pagination)
 */
export async function getFileList(options: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}) {
  const { userId, ...listOptions } = options;

  if (userId) {
    const result = await fileRepository.findByUserId(userId, listOptions);
    return {
      files: result.files.map((file) => ({
        ...file,
        url: getFileUrl(file.r2Key),
        thumbnailUrl: file.thumbnailKey ? getFileUrl(file.thumbnailKey) : undefined,
      })),
      pagination: {
        page: listOptions.page || 1,
        limit: listOptions.limit || 20,
        total: result.total,
      },
    };
  }

  const result = await fileRepository.findAll(listOptions);
  return {
    files: result.files.map((file) => ({
      ...file,
      url: getFileUrl(file.r2Key),
      thumbnailUrl: file.thumbnailKey ? getFileUrl(file.thumbnailKey) : undefined,
    })),
    pagination: {
      page: listOptions.page || 1,
      limit: listOptions.limit || 20,
      total: result.total,
    },
  };
}

/**
 * Get single file info
 */
export async function getFileInfo(fileId: string): Promise<FileInfo | null> {
  const fileInfo = await fileRepository.findById(fileId);
  if (!fileInfo) {
    return null;
  }

  return {
    ...fileInfo,
    url: getFileUrl(fileInfo.r2Key),
    thumbnailUrl: fileInfo.thumbnailKey ? getFileUrl(fileInfo.thumbnailKey) : undefined,
  };
}
