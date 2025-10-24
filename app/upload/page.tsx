'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';

export default function UploadPage() {
  return (
    <LayoutWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Inteligente de Extratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-lg font-medium mb-2">
                📁 Arraste extratos aqui
              </div>
              <p className="text-muted-foreground mb-4">
                Suporte: OFX, XLS, XLSX (Bancos Brasileiros)
              </p>
              <p className="text-sm text-muted-foreground">
                Detecta automaticamente: BB, Itaú, Santander, CEF
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium text-green-600">
                  🚀 Processamento com IA para categorização
                </p>
                <p className="text-sm font-medium text-primary">
                  📊 Baseado em 53 categorias financeiras
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve você poderá:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Importar múltiplos arquivos simultaneamente</li>
              <li>Visualizar progresso de processamento em tempo real</li>
              <li>Revisar e corrigir categorizações automáticas</li>
              <li>Configurar regras personalizadas</li>
              <li>Importar dados de planilhas financeiras</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}