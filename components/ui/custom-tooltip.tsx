'use client';

import { TooltipProps } from 'recharts';

export function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    return String(value);
  };

  return (
    <div className="bg-popover border border-border rounded-md p-3 shadow-lg">
      <p className="text-sm font-medium text-popover-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-popover-foreground">
              {entry.name}: {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
