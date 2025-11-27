'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '../shared/header';
import { useAuth } from '@/hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/signup'];

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Redirecionar se não estiver logado (usando useEffect, não durante render)
  useEffect(() => {
    if (!isLoading && !isLoggedIn && !isPublicRoute) {
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, isPublicRoute, router]);

  // Páginas públicas - renderiza sem header
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  // Não logado e não é rota pública - não renderiza nada (vai redirecionar)
  if (!isLoggedIn) {
    return null;
  }

  // Logado - renderiza com header
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}