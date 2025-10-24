'use client';

import { usePathname } from 'next/navigation';
import { Header } from '../shared/header';
import { useAuth } from '@/hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { isLoggedIn, isLoading, redirectIfNotLoggedIn } = useAuth();

  // Redirecionar se não estiver logado (exceto na página de login)
  if (!isLoading && !isLoggedIn && pathname !== '/login') {
    redirectIfNotLoggedIn();
  }

  // Se for página de login, renderiza sem o header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}