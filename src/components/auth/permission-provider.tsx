'use client';

import { type ReactNode, createContext, useContext } from 'react';

interface PermissionContextType {
  isAdmin: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  isAdmin: boolean;
}

export function PermissionProvider({ children, isAdmin }: PermissionProviderProps) {
  return <PermissionContext.Provider value={{ isAdmin }}>{children}</PermissionContext.Provider>;
}

export function useIsAdmin(): boolean {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('useIsAdmin must be used within a PermissionProvider');
  }
  return context.isAdmin;
}

// For backward compatibility, but should be removed eventually
export function useUserRole() {
  const isAdmin = useIsAdmin();
  return isAdmin ? 'admin' : 'user';
}

export function useHasPermission() {
  const isAdmin = useIsAdmin();
  return (permission: string) => {
    // Admin has all permissions, regular users have basic permissions
    if (isAdmin) return true;

    // Basic permissions for all users
    const basicPermissions = ['settings.view', 'profile.edit', 'billing.view'];
    return basicPermissions.includes(permission);
  };
}
