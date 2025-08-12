import { uploadAvatarAction } from '@/server/actions/upload-avatar';
import { useAuthLoading, useUpdateUser, useUser } from '@/store/auth-store';
import type { ProfileFormData, UseProfileReturn } from '@/types/profile';
import { useEffect, useState } from 'react';
import { useToastMessages } from './use-toast-messages';

export function useProfile(): UseProfileReturn {
  const user = useUser();
  const updateUser = useUpdateUser();
  const isLoading = useAuthLoading();
  const toastMessages = useToastMessages();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
  });

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleUpdateName = async () => {
    if (!formData.name.trim()) {
      toastMessages.error.nameEmpty();
      return;
    }

    if (formData.name === user?.name) {
      toastMessages.info.nameNotChanged();
      return;
    }

    setIsUpdatingName(true);
    try {
      const result = await updateUser({ name: formData.name.trim() });
      if (result.success) {
        toastMessages.success.nameUpdated();
      } else {
        toastMessages.error.nameUpdateFailed(result.error);
      }
    } catch (error) {
      toastMessages.error.nameUpdateFailed();
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateAvatar = async (file: File) => {
    setIsUpdatingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await uploadAvatarAction(formData);

      const updateResult = await updateUser({ image: result.url });
      if (updateResult.success) {
        toastMessages.success.avatarUpdated();
      } else {
        toastMessages.error.avatarUpdateFailed(updateResult.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : undefined;
      toastMessages.error.fileUploadFailed(errorMessage);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const hasNameChanged = formData.name !== user?.name;

  return {
    user,
    isLoading,
    formData,
    setFormData,
    isUpdatingName,
    isUpdatingAvatar,
    handleUpdateName,
    handleUpdateAvatar,
    getUserInitials,
    hasNameChanged,
  };
}
