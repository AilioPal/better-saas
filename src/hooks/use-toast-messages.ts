import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function useToastMessages() {
  const t = useTranslations('toast');

  return {
    success: {
      nameUpdated: () => toast.success(t('success.nameUpdated')),
      avatarUpdated: () => toast.success(t('success.avatarUpdated')),
      loginSuccess: () => toast.success(t('success.loginSuccess')),
    },
    error: {
      nameEmpty: () => toast.error(t('error.nameEmpty')),
      nameUpdateFailed: (error?: string) => toast.error(error || t('error.nameUpdateFailed')),
      avatarUpdateFailed: (error?: string) => toast.error(error || t('error.avatarUpdateFailed')),
      fileUploadFailed: (error?: string) => toast.error(error || t('error.fileUploadFailed')),
      loginFailed: (error?: string) => toast.error(error || t('error.loginFailed')),
      socialLoginFailed: (error?: string) => toast.error(error || t('error.socialLoginFailed')),
    },
    info: {
      nameNotChanged: () => toast.info(t('info.nameNotChanged')),
    },
  };
}
