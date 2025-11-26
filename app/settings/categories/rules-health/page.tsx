'use client';

import { useEffect, useState } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { RulesHealthDashboard } from '@/components/categories/rules-health-dashboard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RulesHealthPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyId() {
      try {
        const response = await fetch('/api/companies');
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          setCompanyId(result.data[0].id);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanyId();
  }, []);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header com navegação */}
        <div className="flex items-center gap-4">
          <Link href="/settings/categories">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Categorias
            </Button>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Carregando...</span>
          </div>
        ) : companyId ? (
          <RulesHealthDashboard companyId={companyId} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhuma empresa encontrada. Configure uma empresa primeiro.
            </p>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
