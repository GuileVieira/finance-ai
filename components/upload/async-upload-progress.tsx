'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAsyncUpload } from '@/hooks/use-async-upload';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AsyncUploadProgressProps {
  onUploadComplete?: (uploadId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function AsyncUploadProgress({
  onUploadComplete,
  onUploadError,
  className = ''
}: AsyncUploadProgressProps) {
  const {
    isUploading,
    uploadResult,
    progress,
    error,
    uploadFile,
    cancelUpload,
    reset,
    isProcessing,
    isCompleted,
    isFailed,
    progressPercentage,
    statusText
  } = useAsyncUpload({
    onComplete: onUploadComplete,
    onError: onUploadError,
    autoStart: true
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ofx')) {
      onUploadError?.('Por favor, selecione um arquivo .ofx válido');
      return;
    }

    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  };

  const formatTime = (milliseconds?: number) => {
    if (!milliseconds) return '--';
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!uploadResult && !isUploading) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Upload de Arquivo OFX</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Processamento assíncrono - você pode fechar a página
              </p>
            </div>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".ofx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors">
                <FileText className="h-4 w-4 mr-2" />
                <span className="text-sm">Selecionar arquivo OFX</span>
              </div>
            </label>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• Upload instantâneo</p>
              <p>• Processamento em background</p>
              <p>• Não perde o progresso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isUploading && <Upload className="h-5 w-5" />}
            {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
            {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
            {isFailed && <AlertCircle className="h-5 w-5 text-red-600" />}

            Upload OFX
          </CardTitle>

          {!isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelUpload}
              disabled={isCompleted}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do arquivo */}
        {uploadResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{uploadResult.fileInfo.name}</span>
              <Badge variant="secondary">
                {formatFileSize(uploadResult.fileInfo.size)}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{uploadResult.fileInfo.totalTransactions} transações</span>
              <span>{uploadResult.uploadTime}ms</span>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          {isUploading && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-600">Fazendo upload...</span>
            </>
          )}

          {isProcessing && (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-orange-600" />
              <span className="text-sm text-orange-600">Processando...</span>
            </>
          )}

          {isCompleted && (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Concluído!</span>
            </>
          )}

          {isFailed && (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Falhou</span>
            </>
          )}
        </div>

        {/* Barra de progresso */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{statusText}</span>
              <span className="text-muted-foreground">{progress.percentage}%</span>
            </div>

            <Progress value={progress.percentage} className="h-2" />

            {progress.estimatedTimeRemaining && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Tempo restante: {formatTime(progress.estimatedTimeRemaining)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Batch {progress.currentBatch}/{progress.totalBatches}</span>
              <span>{progress.processedTransactions}/{progress.totalTransactions} transações</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Ações */}
        {isCompleted && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Novo Upload
            </Button>

            <Button
              size="sm"
              onClick={() => window.location.href = '/transactions'}
              className="flex-1"
            >
              Ver Transações
            </Button>
          </div>
        )}

        {isFailed && (
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}

        {/* Informações do sistema */}
        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p>✅ Upload instantâneo - não trava navegador</p>
          <p>📦 Processamento em batches de 15 transações</p>
          <p>💾 Progresso salvo - pode fechar a página</p>
          <p>🔄 Retomada automática se falhar</p>
        </div>
      </CardContent>
    </Card>
  );
}