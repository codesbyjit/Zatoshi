import { RegisterForm } from '@/components/auth/RegisterForm';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata = {
  title: 'Create Account',
  description: 'Create a new account.',
};

export default function RegisterPage() {
  return (
    <div className="container-content py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md">
            <Skeleton variant="custom" className="h-[500px] w-full rounded-md" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
