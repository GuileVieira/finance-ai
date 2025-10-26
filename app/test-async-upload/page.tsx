'use client';

import { AsyncUploadProgress } from '@/components/upload/async-upload-progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Zap, Shield, Clock, CheckCircle } from 'lucide-react';

export default function TestAsyncUploadPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Upload Assíncrono OFX</h1>
          <Badge variant="secondary">Novo</Badge>
        </div>

        <p className="text-muted-foreground max-w-2xl mx-auto">
          Sistema de upload incremental que processa arquivos grandes em background sem travar o navegador.
          Você pode fechar a página e voltar depois - o progresso será mantido!
        </p>
      </div>

      {/* Upload Component */}
      <div className="flex justify-center">
        <AsyncUploadProgress
          onUploadComplete={(uploadId) => {
            console.log('Upload completado:', uploadId);
            // Aqui você pode redirecionar ou mostrar notificação
          }}
          onUploadError={(error) => {
            console.error('Erro no upload:', error);
          }}
        />
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Upload Instantâneo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload do arquivo em segundos. Resposta imediata sem bloquear navegador.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Batch Processing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Processamento em lotes de 15 transações. Progresso salvo incrementalmente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Progresso Real-Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acompanhe o processamento em tempo real. Estimativa de tempo restante.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">À Prova de Falhas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Retomada automática se falhar. Perde zero progresso em caso de erro.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✅ Novo Sistema (Assíncrono)</h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. Upload instantâneo (segundos)</li>
                <li>2. Resposta imediata com ID</li>
                <li>3. Processamento em background</li>
                <li>4. Progresso salvo no banco</li>
                <li>5. Pode fechar a página</li>
                <li>6. Retomada automática</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-red-600">❌ Sistema Antigo (Síncrono)</h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. Upload + processamento juntos</li>
                <li>2. Espera por minutos</li>
                <li>3. Navegador travado</li>
                <li>4. Se fechar, perde tudo</li>
                <li>5. Sem retomada</li>
                <li>6. Experiência ruim</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* APIs */}
      <Card>
        <CardHeader>
          <CardTitle>APIs Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <Badge variant="outline">POST</Badge> /api/ofx/upload-async - Upload assíncrono
            </div>
            <div>
              <Badge variant="outline">GET</Badge> /api/uploads/[id]/progress - Consultar progresso
            </div>
            <div>
              <Badge variant="outline">GET</Badge> /api/ofx/upload-async - Documentação
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}