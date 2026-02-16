'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Upload, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UploadProgressItem } from '@/components/upload/upload-progress-item';
import { UploadHistory } from '@/components/upload/upload-history';

interface ActiveUpload {
  uploadId: string;
  fileName: string;
}

export default function UploadPage() {
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('async', 'true'); // Habilitar modo assíncrono

      const response = await fetch('/api/ofx/upload-and-analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro no processamento do arquivo');
      }

      // Adicionar ao estado de uploads ativos
      setActiveUploads(prev => [...prev, {
        uploadId: result.data.upload.id,
        fileName: file.name
      }]);

    } catch (error) {
      console.error(`Erro ao processar arquivo ${file.name}:`, error);
      setErrorCount(prev => prev + 1);
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setCompletedCount(0);
    setErrorCount(0);

    // Processar todos os arquivos em paralelo
    await Promise.all(acceptedFiles.map(file => processFile(file)));

    setIsUploading(false);

    toast({
      title: 'Upload iniciado',
      description: `${acceptedFiles.length} arquivo(s) sendo processados`,
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive, fileRejections, open } = useDropzone({
    onDrop,
    accept: {
      'application/ofx': ['.ofx'],
      'text/ofx': ['.ofx'],
      'application/x-ofx': ['.ofx']
    },
    maxFiles: 10,
    disabled: isUploading,
    noClick: true, // Impedir que clique na área abra o seletor (evita bugs no drag)
    noKeyboard: true
  });

  // Efeito para mostrar toast de arquivos rejeitados
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      const fileNames = fileRejections.map(r => r.file.name).join(', ');
      toast({
        title: 'Arquivo(s) ignorado(s)',
        description: `Formato inválido ou limite excedido: ${fileNames}. Use apenas arquivos .ofx`,
        variant: 'destructive'
      });
    }
  }, [fileRejections, toast]);

  const handleUploadComplete = (uploadId: string) => {
    setCompletedCount(prev => prev + 1);
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Upload concluído',
      description: 'Arquivo processado com sucesso!',
    });
  };

  const handleUploadError = (uploadId: string, error: string) => {
    setErrorCount(prev => prev + 1);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewUpload = () => {
    setActiveUploads([]);
    setCompletedCount(0);
    setErrorCount(0);
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Área de Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Inteligente de Extratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              data-tutorial="upload-dropzone"
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 ${
                isDragActive
                  ? 'border-primary bg-primary/10 scale-[1.01] shadow-lg'
                  : isUploading
                  ? 'border-muted bg-muted/30 cursor-not-allowed'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-6">
                <div className={`p-4 rounded-full bg-primary/10 w-fit mx-auto transition-transform duration-200 ${isDragActive ? 'scale-110' : ''}`}>
                  <Upload className={`h-12 w-12 mx-auto ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="text-xl font-semibold tracking-tight">
                    {isDragActive ? (
                      'Solte para iniciar o upload'
                    ) : isUploading ? (
                      'Processando arquivos...'
                    ) : (
                      'Arraste seus extratos bancários'
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    O sistema irá identificar automaticamente o banco e a conta.
                  </p>
                </div>

                {!isUploading && !isDragActive && (
                  <div className="pt-2">
                    <Button 
                      type="button" 
                      onClick={open}
                      variant="outline"
                      className="relative z-10"
                    >
                      Selecionar Arquivos
                    </Button>
                  </div>
                )}

                <div className="flex gap-3 justify-center flex-wrap pt-4">
                  <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    OFX (Bradesco, Itaú, BB, etc)
                  </Badge>
                  <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20">
                    Categorização com IA
                  </Badge>
                  <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20">
                    Multi-upload (máx 10)
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploads em Andamento */}
        {activeUploads.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Processando Arquivos</CardTitle>
                {completedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{completedCount} concluído(s)</span>
                    {errorCount > 0 && (
                      <>
                        <span>•</span>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>{errorCount} erro(s)</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeUploads.map((upload) => (
                  <UploadProgressItem
                    key={upload.uploadId}
                    uploadId={upload.uploadId}
                    fileName={upload.fileName}
                    onComplete={handleUploadComplete}
                    onError={handleUploadError}
                  />
                ))}
              </div>

              {completedCount === activeUploads.length && activeUploads.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Todos os uploads foram concluídos! Você pode visualizar os dados no{' '}
                      <a href="/dashboard" className="font-medium underline">
                        dashboard
                      </a>
                      .
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center mt-4">
                    <Button onClick={handleNewUpload} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fazer Novo Upload
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico de Uploads */}
        <UploadHistory
          companyId="default-company"
          limit={10}
          refreshTrigger={refreshTrigger}
        />

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Recursos Implementados</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Upload com progresso em tempo real</li>
                  <li>✓ Processamento em paralelo de múltiplos arquivos</li>
                  <li>✓ Armazenamento no Supabase Storage</li>
                  <li>✓ Categorização automática com IA</li>
                  <li>✓ Detecção de banco e conta</li>
                  <li>✓ Histórico de uploads</li>
                  <li>✓ Resumo detalhado por arquivo</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">Próximos Passos</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Faça o upload dos seus extratos bancários (formato OFX)</li>
                  <li>2. Acompanhe o progresso em tempo real</li>
                  <li>3. Veja o resumo de cada arquivo processado</li>
                  <li>4. Acesse o dashboard para análises detalhadas</li>
                  <li>5. Consulte o histórico de uploads a qualquer momento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}
