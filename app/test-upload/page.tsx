'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const testBasicValidation = async () => {
    if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'Por favor, selecione um arquivo OFX para testar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test-upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na validação');
      }

      setResult(data);
      toast({
        title: 'Validação concluída',
        description: data.message
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMsg);
      toast({
        title: 'Erro na validação',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testSimpleUpload = async () => {
    if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'Por favor, selecione um arquivo OFX para testar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('safeMode', 'true');

      const response = await fetch('/api/ofx/upload-simple', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload');
      }

      setResult(data);
      toast({
        title: 'Upload simplificado concluído',
        description: 'Arquivo salvo com sucesso'
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMsg);
      toast({
        title: 'Erro no upload',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testFullUpload = async () => {
    if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'Por favor, selecione um arquivo OFX para testar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('safeMode', 'true'); // Modo seguro - apenas 1 transação

      const response = await fetch('/api/ofx/upload-and-analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload');
      }

      setResult(data);
      toast({
        title: 'Upload concluído',
        description: `Processado ${data.data?.statistics?.totalTransactions || 0} transação(ões)`
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMsg);
      toast({
        title: 'Erro no upload',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teste de Upload OFX</h1>
          <p className="text-muted-foreground">
            Teste o processamento de arquivos OFX em modo seguro
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>1. Selecionar Arquivo OFX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para selecionar</span> ou arraste o arquivo
                    </p>
                    <p className="text-xs text-gray-500">Apenas arquivos .ofx</p>
                  </div>
                  <Input
                    type="file"
                    className="hidden"
                    accept=".ofx"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {file && (
                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.type || 'application/x-ofx'}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Options */}
        {file && (
          <Card>
            <CardHeader>
              <CardTitle>2. Opções de Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Teste Rápido</h3>
                  <p className="text-sm text-muted-foreground">
                    Valida apenas a estrutura do arquivo OFX sem processar transações
                  </p>
                  <Button
                    onClick={testBasicValidation}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Validar Estrutura
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Teste Simplificado</h3>
                  <p className="text-sm text-muted-foreground">
                    Salva arquivo sem processar transações (sem IA)
                  </p>
                  <Button
                    onClick={testSimpleUpload}
                    disabled={loading}
                    className="w-full"
                    variant="secondary"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Salvar Arquivo Apenas
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Teste Completo (Modo Seguro)</h3>
                  <p className="text-sm text-muted-foreground">
                    Processa apenas 1 transação para testar o fluxo completo
                  </p>
                  <Button
                    onClick={testFullUpload}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Processar 1 Transação
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Resultado do Teste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.success && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ Sucesso!</h4>
                    <p className="text-green-700">{result.message}</p>
                  </div>
                )}

                {result.fileInfo && (
                  <div>
                    <h4 className="font-medium mb-2">Informações do Arquivo:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Nome:</strong> {result.fileInfo.name}</div>
                      <div><strong>Tamanho:</strong> {formatFileSize(result.fileInfo.size)}</div>
                      <div><strong>Tipo:</strong> {result.fileInfo.type}</div>
                      <div><strong>Tem Transações:</strong> {result.fileInfo.hasTransactions ? 'Sim' : 'Não'}</div>
                    </div>
                  </div>
                )}

                {result.fileInfo?.firstLines && (
                  <div>
                    <h4 className="font-medium mb-2">Primeiras linhas do arquivo:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                      {result.fileInfo.firstLines.join('\n')}
                    </pre>
                  </div>
                )}

                {result.nextSteps && (
                  <div>
                    <h4 className="font-medium mb-2">Próximos passos:</h4>
                    <ul className="space-y-1 text-sm">
                      {result.nextSteps.map((step: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="text-green-600">✓</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.data && (
                  <div>
                    <h4 className="font-medium mb-2">Dados Processados:</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}