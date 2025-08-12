import { AuthGuard } from '@/components/auth-guard';
import PermissionWrapper from '@/components/auth/permission-wrapper';
import { ProtectedLayoutClient } from '@/components/dashboard/protected-layout-client';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

// Force dynamic rendering for all dashboard routes
// This is necessary because dashboard pages require admin permissions
export const dynamic = 'force-dynamic';

type Props = {
  children: ReactNode;
};

/**
 * Dashboard layout - Handles authentication, admin permissions, and layout
 * All pages under /dashboard require:
 * 1. User authentication (AuthGuard)
 * 2. Admin permissions (PermissionWrapper)
 * 3. Dashboard-specific layout (ProtectedLayoutClient)
 */
export default function DashboardLayout({ children }: Props) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AuthGuard useSkeletonFallback>
        <PermissionWrapper>
          <ProtectedLayoutClient>{children}</ProtectedLayoutClient>
        </PermissionWrapper>
      </AuthGuard>
    </Suspense>
  );
}
