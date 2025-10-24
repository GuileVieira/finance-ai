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
  { name: 'Relatórios', href: '/reports' }
];

export function NavigationTabs({ className }: NavigationTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("w-full border-b bg-white", className)}>
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  "border-transparent hover:text-emerald-700",
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "text-gray-600 hover:text-emerald-700"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}