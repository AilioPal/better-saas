import type { FileInfo } from '@/lib/files/file-service';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import db from '../index';
import { file, user } from '../schema';

export interface CreateFileData {
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
}

export interface FileListOptions {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}

type FileRecord = typeof file.$inferSelect;

export class FileRepository {
  async create(data: CreateFileData): Promise<FileInfo> {
    const [created] = await db
      .insert(file)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create file record');
    }

    return this.toFileInfo(created);
  }

  async findById(id: string): Promise<FileInfo | null> {
    const [found] = await db.select().from(file).where(eq(file.id, id));
    return found ? this.toFileInfo(found) : null;
  }

  async findByUserId(
    userId: string,
    options: FileListOptions = {}
  ): Promise<{
    files: FileInfo[];
    total: number;
  }> {
    const { page = 1, limit = 20, search = '' } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(file.uploadUserId, userId)];

    if (search) {
      conditions.push(ilike(file.originalName, `%${search}%`));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // 获取总数
    const countResult = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(file)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // 获取文件列表
    const files = await db
      .select()
      .from(file)
      .where(whereClause)
      .orderBy(desc(file.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      files: files.map((f) => this.toFileInfo(f)),
      total,
    };
  }

  async findAll(options: FileListOptions = {}): Promise<{
    files: FileInfo[];
    total: number;
  }> {
    const { page = 1, limit = 20, search = '' } = options;
    const offset = (page - 1) * limit;

    let whereClause = undefined;
    if (search) {
      whereClause = ilike(file.originalName, `%${search}%`);
    }

    // 获取总数
    const countResult = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(file)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // 获取文件列表 (关联用户表)
    const files = await db
      .select({
        file: file,
        user: {
          email: user.email,
        },
      })
      .from(file)
      .leftJoin(user, eq(file.uploadUserId, user.id))
      .where(whereClause)
      .orderBy(desc(file.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      files: files.map((result) => this.toFileInfoWithUser(result.file, result.user?.email)),
      total,
    };
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(file).where(eq(file.id, id)).returning();

    return !!deleted;
  }

  async deleteByUserId(userId: string, fileId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(file)
      .where(and(eq(file.id, fileId), eq(file.uploadUserId, userId)))
      .returning();

    return !!deleted;
  }

  private toFileInfo(fileRecord: FileRecord): FileInfo {
    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      width: fileRecord.width || undefined,
      height: fileRecord.height || undefined,
      r2Key: fileRecord.r2Key,
      thumbnailKey: fileRecord.thumbnailKey || undefined,
      uploadUserId: fileRecord.uploadUserId,
      createdAt: fileRecord.createdAt.toISOString(),
      updatedAt: fileRecord.updatedAt.toISOString(),
      url: '', // Temporarily set to empty string, actual URL will be added in service layer
      thumbnailUrl: undefined,
    };
  }

  private toFileInfoWithUser(fileRecord: FileRecord, userEmail?: string): FileInfo {
    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      width: fileRecord.width || undefined,
      height: fileRecord.height || undefined,
      r2Key: fileRecord.r2Key,
      thumbnailKey: fileRecord.thumbnailKey || undefined,
      uploadUserId: fileRecord.uploadUserId,
      uploadUserEmail: userEmail,
      createdAt: fileRecord.createdAt.toISOString(),
      updatedAt: fileRecord.updatedAt.toISOString(),
      url: '', // Temporarily set to empty string, actual URL will be added in service layer
      thumbnailUrl: undefined,
    };
  }
}

export const fileRepository = new FileRepository();
