import type { ReactNode } from 'react';
import { PermissionProvider } from './permission-provider';

interface PermissionWrapperProps {
  children: ReactNode;
}

/**
 * Server component that provides permission context to client components
 * Always checks admin status to provide consistent permission context
 */
export default async function PermissionWrapper({ children }: PermissionWrapperProps) {
  let isAdmin = false;

  try {
    // Dynamic import to avoid loading the function when not needed
    const { getUserAdminStatus } = await import('@/server/actions/auth-actions');
    isAdmin = await getUserAdminStatus();
  } catch (error) {
    // Log error but don't fail the entire component
    console.error('Failed to get admin status, defaulting to false:', error);
    isAdmin = false;
  }

  return <PermissionProvider isAdmin={isAdmin}>{children}</PermissionProvider>;
}
