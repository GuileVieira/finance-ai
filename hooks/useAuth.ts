'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const isLoggedIn = status === 'authenticated';

  const logout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const redirectIfNotLoggedIn = (targetPath: string = '/login') => {
    if (!isLoading && !isLoggedIn) {
      router.push(targetPath);
    }
  };

  return {
    user: session?.user,
    companyId: session?.user?.companyId,
    isLoggedIn,
    isLoading,
    logout,
    redirectIfNotLoggedIn,
  };
}
