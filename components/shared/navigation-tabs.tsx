'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavigationTabsProps {
  className?: string;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Transações', href: '/transactions' },
  { name: 'Upload', href: '/upload' },
  { name: 'Categorias', href: '/categories' },
  { name: 'Projeções', href: '/projections' },
  { name: 'Relatórios', href: '/reports' },
  { name: 'Empresas', href: '/settings/companies' },
  { name: 'Contas', href: '/settings/accounts' },
];

export function NavigationTabs({ className }: NavigationTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {navigationItems.map((item) => {
        // Para rotas de settings, verificar se começa com o href
        const isActive = item.href.startsWith('/settings')
          ? pathname.startsWith(item.href)
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium rounded-lg px-3 py-2 transition-all duration-200 ease-out",
              isActive
                ? "text-foreground bg-muted/80 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}