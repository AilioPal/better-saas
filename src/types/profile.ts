import type { User } from 'better-auth/types';

export interface ProfileFormData {
  name: string;
  email: string;
}

export interface ProfileContentProps {
  user: User | null;
  isLoading: boolean;

  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;

  isUpdatingName: boolean;
  isUpdatingAvatar: boolean;

  handleUpdateName: () => Promise<void>;
  handleUpdateAvatar: (file: File) => Promise<void>;

  getUserInitials: () => string;
  hasNameChanged: boolean;
}

export interface UseProfileReturn extends ProfileContentProps {}
