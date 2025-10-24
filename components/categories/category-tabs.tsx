'use client';

import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  categoryTypes: Record<string, { name: string; color: string; description: string }>;
}

export function CategoryTabs({ activeTab, onTabChange, categoryTypes }: CategoryTabsProps) {
  const tabs = [
    { id: 'all', name: 'Todas', color: '#6B7280' },
    ...Object.entries(categoryTypes).map(([key, value]) => ({
      id: key,
      name: value.name,
      color: value.color
    }))
  ];

  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
            "hover:bg-background/80 hover:shadow-sm",
            activeTab === tab.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tab.color }}
            />
            <span>{tab.name}</span>
            {tab.id !== 'all' && (
              <span className="text-xs opacity-60">
                ({tab.id === 'revenue' ? '1' : tab.id === 'variable_cost' ? '3' : tab.id === 'fixed_cost' ? '5' : '3'})
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}