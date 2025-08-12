'use server';

import { auth } from '@/lib/auth/auth';
import { uploadFile } from '@/lib/files/file-service';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import type { User } from 'better-auth/types';
import { headers } from 'next/headers';
import { getErrorMessage } from './error-messages';

const avatarErrorLogger = new ErrorLogger('upload-avatar');

export async function uploadAvatarAction(formData: FormData) {
  let session: { user?: User } | null = null;
  let file: File | null = null;

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    file = formData.get('avatar') as File;

    if (!file) {
      throw new Error(await getErrorMessage('fileNotFound'));
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(await getErrorMessage('onlyImageFiles'));
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(await getErrorMessage('fileSizeLimit'));
    }

    // Use the unified file upload logic that saves to database
    const fileInfo = await uploadFile(file, session.user.id);

    return {
      success: true,
      url: fileInfo.url,
      fileInfo,
    };
  } catch (error) {
    avatarErrorLogger.logError(error as Error, {
      operation: 'uploadAvatar',
      userId: session?.user?.id,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });

    throw new Error(
      error instanceof Error ? error.message : await getErrorMessage('fileUploadFailed')
    );
  }
}
