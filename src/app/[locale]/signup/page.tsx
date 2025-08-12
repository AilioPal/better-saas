import { SignupForm } from '@/components/blocks/signup/signup-form';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Suspense
          fallback={
            <div className="flex w-full max-w-sm flex-col items-center gap-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">加载中...</p>
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
