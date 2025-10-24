'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockAlerts } from '@/lib/mock-data';

export function StrategicAlerts() {
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔔 Alertas Estratégicos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mockAlerts.map((alert, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-sm">{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="text-sm font-medium truncate text-foreground">{alert.title}</h4>
                    <Badge
                      variant={getBadgeVariant(alert.type)}
                      className="text-xs shrink-0"
                    >
                      {alert.type === 'critical' ? 'Crítico' :
                       alert.type === 'warning' ? 'Atenção' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-xs leading-tight text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium">💡 Ação Recomendada:</span>
          Priorize a renegociação da taxa de antecipação e analise as contratações recentes.
        </div>
      </CardContent>
    </Card>
  );
}