import { getLocale } from 'next-intl/server';

// Multi-language support for error messages in Server Actions
export async function getErrorMessage(key: string): Promise<string> {
  const locale = await getLocale();

  const messages = {
    zh: {
      unauthorizedAccess: '未授权访问',
      fileNotFound: '未找到文件',
      onlyImageFiles: '只允许上传图片文件',
      fileSizeLimit: '文件大小不能超过5MB',
      fileUploadFailed: '文件上传失败',
      fileDeleteFailed: '文件删除失败',
      fileListFailed: '获取文件列表失败',
      fileInfoFailed: '获取文件信息失败',
      noFileSelected: '未选择文件',
      invalidFileType: '仅支持 JPEG、PNG、GIF、WebP 格式的图片',
      fileSizeTooLarge: '文件大小不能超过 10MB',
      fileAccessDenied: '无权访问此文件',
    },
    en: {
      unauthorizedAccess: 'Unauthorized access',
      fileNotFound: 'File not found',
      onlyImageFiles: 'Only image files are allowed',
      fileSizeLimit: 'File size cannot exceed 5MB',
      fileUploadFailed: 'File upload failed',
      fileDeleteFailed: 'File delete failed',
      fileListFailed: 'Failed to get file list',
      fileInfoFailed: 'Failed to get file info',
      noFileSelected: 'No file selected',
      invalidFileType: 'Only JPEG, PNG, GIF, WebP formats are supported',
      fileSizeTooLarge: 'File size cannot exceed 10MB',
      fileAccessDenied: 'Access denied to this file',
    },
  };

  const localeMessages = messages[locale as keyof typeof messages] || messages.en;
  return localeMessages[key as keyof typeof localeMessages] || key;
}
