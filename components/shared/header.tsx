'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { NavigationTabs } from './navigation-tabs';
import { useAuth } from '@/hooks/useAuth';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  userName?: string;
}

export function Header({ userName }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState(userName || 'João Silva');
  const { theme, setTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();

  useEffect(() => {
    // Buscar nome do usuário do localStorage quando disponível
    try {
      const storedUserName = localStorage.getItem('userName');
      if (storedUserName) {
        setCurrentUser(storedUserName);
      }
    } catch (error) {
      // Ignorar erro se localStorage não estiver disponível
    }
  }, [userName]);

  return (
    <header className="bg-background shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="font-bold text-xl text-primary">FINANCEAI</div>
          </Link>

          {/* Navigation Tabs */}
          <NavigationTabs />

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <Badge
                variant="danger"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                3
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {currentUser.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.toLowerCase().replace(' ', '.')}@empresa.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}