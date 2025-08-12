'use client';

import type { FileInfo } from '@/lib/files/file-service';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import {
  type FileListResponse,
  deleteFileAction,
  getFileListAction,
  uploadFileAction,
} from '@/server/actions/file-actions';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

const filesErrorLogger = new ErrorLogger('use-files');

interface UseFilesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

const fetcher = async (key: string): Promise<FileListResponse> => {
  const [, page, limit, search] = key.split('|');
  try {
    return await getFileListAction({
      page: Number(page),
      limit: Number(limit),
      search: search || '',
    });
  } catch (error) {
    filesErrorLogger.logError(error as Error, {
      operation: 'fetchFiles',
      page: Number(page),
      limit: Number(limit),
      search: search || '',
    });
    throw error;
  }
};

export function useFiles(options: UseFilesOptions = {}) {
  const { page = 1, limit = 20, search = '' } = options;

  const key = `files|${page}|${limit}|${search}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  // Upload file
  const { trigger: uploadFile, isMutating: isUploading } = useSWRMutation(
    'upload-file',
    async (_, { arg }: { arg: File }) => {
      const formData = new FormData();
      formData.append('file', arg);

      return await uploadFileAction(formData);
    },
    {
      onSuccess: () => {
        // Refetch file list after successful upload
        mutate();
      },
    }
  );

  // Delete file
  const { trigger: deleteFile, isMutating: isDeleting } = useSWRMutation(
    'delete-file',
    async (_, { arg }: { arg: string }) => {
      // Optimistic delete
      if (data) {
        const optimisticData = {
          ...data,
          files: data.files.filter((file) => file.id !== arg),
        };
        mutate(optimisticData, false);
      }

      try {
        return await deleteFileAction(arg);
      } catch (error) {
        // Restore data on deletion failure
        mutate();
        throw error;
      }
    },
    {
      onSuccess: () => {
        // Refetch data after successful deletion
        mutate();
      },
      onError: () => {
        // Restore data on deletion failure
        mutate();
      },
    }
  );

  return {
    files: data?.files || [],
    pagination: data?.pagination,
    error,
    isLoading,
    isUploading,
    isDeleting,
    uploadFile,
    deleteFile,
    refresh: () => mutate(),
  };
}
