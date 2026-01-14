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
    <div className={cn("flex space-x-1", className)}>
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
              "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-4",
              isActive
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-primary border-b-2 border-transparent"
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}