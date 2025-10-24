'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockProjections } from '@/lib/mock-data';

export function Scenarios() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de Cenários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Situação Atual</h4>
            <div className="grid grid-cols-3 gap-4 text-base">
              <div>
                <span className="text-muted-foreground">Receita:</span>
                <div className="font-semibold text-lg">R$ {mockProjections.current.revenue.toLocaleString('pt-BR')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Despesas:</span>
                <div className="font-semibold text-lg">R$ {mockProjections.current.expenses.toLocaleString('pt-BR')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Margem:</span>
                <div className="font-semibold text-lg">{mockProjections.current.margin}%</div>
              </div>
            </div>
          </div>

          {mockProjections.scenarios.map((scenario, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{scenario.name}</h4>
                <Badge variant="outline">
                  Margem: {scenario.margin}%
                </Badge>
              </div>
              <p className="text-base text-muted-foreground mb-3">
                {scenario.description}
              </p>
              <div className="grid grid-cols-3 gap-4 text-base">
                <div>
                  <span className="text-muted-foreground">Receita:</span>
                  <div className="font-semibold text-red-600 text-lg">
                    R$ {scenario.revenue.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Despesas:</span>
                  <div className="font-semibold text-red-600 text-lg">
                    R$ {scenario.expenses.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Resultado:</span>
                  <div className={`font-semibold text-lg ${scenario.result > 0 ? 'text-success' : 'text-danger'}`}>
                    R$ {scenario.result.toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-base text-red-800">
            <span className="font-medium">💡 Recomendação:</span>
            O cenário de corte de 10% no custo fixo
            oferece o melhor ROI (33.3% de margem) com risco baixo.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm">
            Criar Novo Cenário
          </Button>
          <Button variant="outline" size="sm">
            Exportar Análise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}