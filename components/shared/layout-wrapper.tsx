'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { useAuth } from '@/hooks/useAuth';

interface LayoutWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function LayoutWrapper({ children, requireAuth = true }: LayoutWrapperProps) {
  const pathname = usePathname();
  const { isLoggedIn, isLoading, redirectIfNotLoggedIn } = useAuth();

  // Redirecionar se autenticação for requerida e não estiver logado
  if (!isLoading && requireAuth && !isLoggedIn && pathname !== '/login') {
    redirectIfNotLoggedIn();
  }

  // Se for página de login, renderiza sem header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}