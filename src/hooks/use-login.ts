import { ErrorLogger } from '@/lib/logger/logger-utils';
import {
  useAuthError,
  useAuthLoading,
  useClearError,
  useEmailLogin,
  useIsAuthenticated,
  useSignInWithGithub,
  useSignInWithGoogle,
} from '@/store/auth-store';
import type { LoginFormData, UseLoginReturn } from '@/types/login';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useToastMessages } from './use-toast-messages';

const loginErrorLogger = new ErrorLogger('use-login');

export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastMessages = useToastMessages();

  const isLoading = useAuthLoading();
  const error = useAuthError();
  const isAuthenticated = useIsAuthenticated();
  const emailLogin = useEmailLogin();
  const clearError = useClearError();
  const signInWithGithub = useSignInWithGithub();
  const signInWithGoogle = useSignInWithGoogle();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  // Get callback URL
  const getRedirectUrl = useCallback(() => {
    const callbackUrl = searchParams.get('callbackUrl');
    return callbackUrl || '/settings/profile';
  }, [searchParams]);

  // Auto redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      const redirectUrl = getRedirectUrl();
      router.push(redirectUrl);
    }
  }, [isAuthenticated, router, getRedirectUrl]);

  // Handle social login
  const handleSocialLogin = async (provider: 'github' | 'google') => {
    try {
      clearError();
      if (provider === 'github') {
        await signInWithGithub();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      loginErrorLogger.logError(error as Error, {
        operation: 'socialLogin',
        provider,
      });
      toastMessages.error.socialLoginFailed();
    }
  };

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await emailLogin(formData.email, formData.password);
    if (result.success) {
      toastMessages.success.loginSuccess();
      const redirectUrl = getRedirectUrl();
      router.push(redirectUrl);
    } else {
      toastMessages.error.loginFailed(result.error);
    }
  };

  // Clear error
  const handleClearError = () => {
    clearError();
  };

  return {
    formData,
    setFormData,
    isLoading,
    error,
    isAuthenticated,
    handleEmailLogin,
    handleSocialLogin,
    handleClearError,
    getRedirectUrl,
  };
}
