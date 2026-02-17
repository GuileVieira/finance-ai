'use client';

import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  categoryTypes: Record<string, { name: string; color: string; description: string }>;
}

export function CategoryTabs({ activeTab, onTabChange, categoryTypes }: CategoryTabsProps) {
  const tabs = [
    { id: 'all', name: 'Todas', color: 'hsl(var(--muted-foreground))' },
    ...Object.entries(categoryTypes).map(([key, value]) => ({
      id: key,
      name: value.name,
      color: value.color
    }))
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out",
            "hover:bg-background/60",
            activeTab === tab.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full transition-transform duration-300"
              style={{
                backgroundColor: tab.color,
                transform: activeTab === tab.id ? 'scale(1.25)' : 'scale(1)',
                boxShadow: activeTab === tab.id ? `0 0 6px ${tab.color}50` : 'none'
              }}
            />
            <span>{tab.name}</span>
          </div>
        </button>
      ))}
    </div>
  );
}