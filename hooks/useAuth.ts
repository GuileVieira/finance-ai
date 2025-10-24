'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
      } catch (error) {
        // Lidar com caso onde localStorage não está disponível
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userName?: string) => {
    try {
      localStorage.setItem('isLoggedIn', 'true');
      if (userName) {
        localStorage.setItem('userName', userName);
      }
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      setIsLoggedIn(false);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Fallback forçado se localStorage falhar
      router.push('/login');
    }
  };

  const redirectIfNotLoggedIn = (targetPath: string = '/login') => {
    if (!isLoading && !isLoggedIn) {
      router.push(targetPath);
    }
  };

  return {
    isLoggedIn,
    isLoading,
    login,
    logout,
    redirectIfNotLoggedIn,
  };
}