'use server';

import { auth } from '@/lib/auth/auth';
import { isAdmin } from '@/lib/auth/permissions';
import {
  type FileInfo,
  deleteFile,
  getFileInfo,
  getFileList,
  uploadFile,
} from '@/lib/files/file-service';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import type { User } from 'better-auth/types';
import { headers } from 'next/headers';
import { getErrorMessage } from './error-messages';

const fileErrorLogger = new ErrorLogger('file-actions');

export interface FileListResponse {
  files: FileInfo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface FileUploadResponse {
  success: boolean;
  file: FileInfo;
}

export interface FileDeleteResponse {
  success: boolean;
}

/**
 * 上传文件 Server Action
 */
export async function uploadFileAction(formData: FormData): Promise<FileUploadResponse> {
  let session: { user?: User } | null = null;
  let file: File | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    file = formData.get('file') as File;

    if (!file) {
      throw new Error(await getErrorMessage('noFileSelected'));
    }

    const fileInfo = await uploadFile(file, session.user.id);

    return {
      success: true,
      file: fileInfo,
    };
  } catch (error) {
    fileErrorLogger.logError(error as Error, {
      operation: 'uploadFile',
      userId: session?.user?.id,
      fileName: file?.name,
    });

    const errorMessage =
      error instanceof Error ? error.message : await getErrorMessage('fileUploadFailed');
    throw new Error(errorMessage);
  }
}

/**
 * 删除文件 Server Action
 */
export async function deleteFileAction(fileId: string): Promise<FileDeleteResponse> {
  let session: { user?: User } | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    // Check if user is admin - admins can delete any file
    const userIsAdmin = isAdmin(session.user);

    // Pass userId only if user is not admin (to enforce ownership check)
    const success = await deleteFile(fileId, userIsAdmin ? undefined : session.user.id);

    if (!success) {
      throw new Error(await getErrorMessage('fileDeleteFailed'));
    }

    return { success: true };
  } catch (error) {
    fileErrorLogger.logError(error as Error, {
      operation: 'deleteFile',
      userId: session?.user?.id,
      fileId,
    });

    const errorMessage =
      error instanceof Error ? error.message : await getErrorMessage('fileDeleteFailed');
    throw new Error(errorMessage);
  }
}

/**
 * 获取文件列表 Server Action
 */
export async function getFileListAction(
  options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<FileListResponse> {
  let session: { user?: User } | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    const { page = 1, limit = 20, search = '' } = options;

    // Remove userId parameter to fetch all files instead of just current user's files
    const result = await getFileList({
      page,
      limit,
      search,
    });

    return result;
  } catch (error) {
    fileErrorLogger.logError(error as Error, {
      operation: 'getFileList',
      userId: session?.user?.id,
      page: options.page,
      limit: options.limit,
      search: options.search,
    });

    const errorMessage =
      error instanceof Error ? error.message : await getErrorMessage('fileListFailed');
    throw new Error(errorMessage);
  }
}

/**
 * 获取文件信息 Server Action
 */
export async function getFileInfoAction(fileId: string): Promise<FileInfo> {
  let session: { user?: User } | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    const fileInfo = await getFileInfo(fileId);

    if (!fileInfo) {
      throw new Error(await getErrorMessage('fileNotFound'));
    }

    // 检查权限：只有文件所有者可以查看
    if (fileInfo.uploadUserId !== session.user.id) {
      throw new Error(await getErrorMessage('fileAccessDenied'));
    }
    return fileInfo;
  } catch (error) {
    fileErrorLogger.logError(error as Error, {
      operation: 'getFileInfo',
      userId: session?.user?.id,
      fileId,
    });
    const errorMessage =
      error instanceof Error ? error.message : await getErrorMessage('fileInfoFailed');
    throw new Error(errorMessage);
  }
}
