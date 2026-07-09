import { LoginForm } from '@/components/auth/LoginForm';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your account.',
};

export default function LoginPage() {
  return (
    <div className="container-content py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md">
            <Skeleton variant="custom" className="h-[400px] w-full rounded-md" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
