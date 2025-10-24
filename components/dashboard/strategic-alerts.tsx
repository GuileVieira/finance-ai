'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockAlerts } from '@/lib/mock-data';

export function StrategicAlerts() {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-primary/5 border-primary/20 text-primary';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'info':
        return 'bg-primary/10 text-primary hover:bg-primary/5';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
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
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm">{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="text-sm font-medium truncate">{alert.title}</h4>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getBadgeColor(alert.type)} shrink-0`}
                    >
                      {alert.type === 'critical' ? 'Crítico' :
                       alert.type === 'warning' ? 'Atenção' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-xs leading-tight">{alert.description}</p>
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