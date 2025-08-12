import { authClient } from '@/lib/auth/auth-client';
import { ErrorLogger } from '@/lib/logger/logger-utils';
import type { User } from 'better-auth/types';
import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';

const authErrorLogger = new ErrorLogger('auth-store');

interface AuthState {
  // Persistent state
  user: User | null;
  isAuthenticated: boolean;
  lastUpdated: number;

  // Temporary state
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Cache configuration
  cacheExpiry: number;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;

  updateUser: (data: { name?: string; image?: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;

  initialize: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAuth: () => void;

  // Cache methods
  isCacheValid: () => boolean;
  invalidateCache: () => void;
  setCacheExpiry: (expiry: number) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, get): AuthState => ({
        // Persistent state - default values must match server-side
        user: null,
        isAuthenticated: false,
        lastUpdated: 0,

        // Temporary state
        isLoading: false,
        error: null,
        isInitialized: false,
        cacheExpiry: 10 * 60 * 1000, // 10 minutes

        // Cache methods
        isCacheValid: () => {
          const { lastUpdated, cacheExpiry } = get();
          return lastUpdated > 0 && Date.now() - lastUpdated < cacheExpiry;
        },

        invalidateCache: () => set({ lastUpdated: 0 }),

        setCacheExpiry: (expiry: number) => set({ cacheExpiry: expiry }),

        // Actions
        setUser: (user) => {
          set({
            user,
            isAuthenticated: !!user,
            lastUpdated: Date.now(),
          });
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setInitialized: (initialized) => {
          set({ isInitialized: initialized });
        },

        setError: (error) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },
        signIn: async (email, password) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.signIn.email({
              email,
              password,
            });

            if (result.data) {
              const user = result.data.user;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                lastUpdated: Date.now(),
              });
              return { success: true };
            }

            set({ isLoading: false });
            return {
              success: false,
              error: result.error?.message || 'signIn error',
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'signIn error';
            set({ error: errorMessage, isLoading: false });
            return {
              success: false,
              error: errorMessage,
            };
          }
        },
        signUp: async (email, password, name) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.signUp.email({
              email: email,
              password,
              name: name || '',
            });

            if (result.data) {
              const user = result.data.user;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                lastUpdated: Date.now(),
              });
              return { success: true };
            }
            set({ isLoading: false });
            return {
              success: false,
              error: result.error?.message || 'signUp error',
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'signUp error';
            set({ error: errorMessage, isLoading: false });
            return {
              success: false,
              error: errorMessage,
            };
          }
        },

        signOut: async () => {
          set({ isLoading: true });

          try {
            await authClient.signOut();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              lastUpdated: 0,
            });
          } catch (error) {
            authErrorLogger.logError(error as Error, {
              operation: 'signOut',
            });
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              lastUpdated: 0,
            });
          }
        },

        signInWithGithub: async () => {
          set({ isLoading: true, error: null });

          try {
            await authClient.signIn.social({
              provider: 'github',
            });
            // Clear cache to force refresh
            set({ lastUpdated: 0 });
          } catch (error) {
            authErrorLogger.logError(error as Error, {
              operation: 'signInWithGithub',
            });
            set({ isLoading: false });
          }
        },

        signInWithGoogle: async () => {
          set({ isLoading: true, error: null });

          try {
            await authClient.signIn.social({
              provider: 'google',
            });
            // Clear cache to force refresh
            set({ lastUpdated: 0 });
          } catch (error) {
            authErrorLogger.logError(error as Error, {
              operation: 'signInWithGoogle',
            });
            set({ isLoading: false });
          }
        },

        updateUser: async (data) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.updateUser(data);

            if (result.data?.status) {
              await get().refreshSession();
              set({ isLoading: false });
              return { success: true };
            }

            set({ isLoading: false });
            return {
              success: false,
              error: result.error?.message || 'updateUser error',
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'updateUser error';
            set({ error: errorMessage, isLoading: false });
            return {
              success: false,
              error: errorMessage,
            };
          }
        },

        refreshSession: async () => {
          try {
            const session = await authClient.getSession();

            if (session.data) {
              const user = session.data.user;
              set({
                user,
                isAuthenticated: true,
                lastUpdated: Date.now(),
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                lastUpdated: Date.now(),
              });
            }
          } catch (error) {
            authErrorLogger.logError(error as Error, {
              operation: 'refreshSession',
            });
            set({
              user: null,
              isAuthenticated: false,
              lastUpdated: Date.now(),
            });
          }
        },

        initialize: async () => {
          if (get().isInitialized) return;

          set({ isLoading: true });

          try {
            // Always check server session to ensure consistency
            const session = await authClient.getSession();
            if (session.data) {
              const user = session.data.user;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                lastUpdated: Date.now(),
              });
            } else {
              // Only clear auth if cache is invalid or expired
              if (!get().isCacheValid()) {
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  isInitialized: true,
                  lastUpdated: Date.now(),
                });
              } else {
                // Keep existing state if cache is valid
                set({
                  isLoading: false,
                  isInitialized: true,
                });
              }
            }
          } catch (error) {
            authErrorLogger.logError(error as Error, {
              operation: 'initialize',
            });
            // On error, keep existing state if cache is valid
            if (!get().isCacheValid()) {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
                lastUpdated: Date.now(),
              });
            } else {
              set({
                isLoading: false,
                isInitialized: true,
              });
            }
          }
        },
        clearAuth: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            lastUpdated: 0,
          });
        },
      }),
      {
        name: 'better-saas-auth',
        storage: createJSONStorage(() => localStorage),
        // Only persist safe state fields
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          lastUpdated: state.lastUpdated,
          cacheExpiry: state.cacheExpiry,
        }),
        skipHydration: false, // Allow automatic hydration
        version: 1,
      }
    )
  )
);

export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthInitialized = () => useAuthStore((state) => state.isInitialized);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useInitialize = () => useAuthStore((state) => state.initialize);
export const useEmailLogin = () => useAuthStore((state) => state.signIn);
export const useClearError = () => useAuthStore((state) => state.clearError);
export const useSignInWithGithub = () => useAuthStore((state) => state.signInWithGithub);
export const useSignInWithGoogle = () => useAuthStore((state) => state.signInWithGoogle);
export const useSignOut = () => useAuthStore((state) => state.signOut);
export const useRefreshSession = () => useAuthStore((state) => state.refreshSession);
export const useEmailSignup = () => useAuthStore((state) => state.signUp);
export const useSetError = () => useAuthStore((state) => state.setError);
export const useUpdateUser = () => useAuthStore((state) => state.updateUser);
