'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { mockInsights } from '@/lib/mock-data';

export function Insights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights Baseados nos Dados Reais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                {index + 1}
              </Badge>
              <p className="text-sm">{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}