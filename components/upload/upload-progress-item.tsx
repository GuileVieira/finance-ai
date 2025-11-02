'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

interface UploadProgressItemProps {
  uploadId: string;
  fileName: string;
  onComplete?: (uploadId: string) => void;
  onError?: (uploadId: string, error: string) => void;
}

interface ProgressData {
  uploadId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentBatch: number;
  totalBatches: number;
  processedTransactions: number;
  totalTransactions: number;
  percentage: number;
}

export function UploadProgressItem({
  uploadId,
  fileName,
  onComplete,
  onError
}: UploadProgressItemProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/uploads/${uploadId}/progress`);
        const result = await response.json();

        if (result.success && result.data) {
          setProgress(result.data);

          // Parar polling se concluído ou com erro
          if (result.data.status === 'completed') {
            setIsPolling(false);
            onComplete?.(uploadId);
          } else if (result.data.status === 'failed') {
            setIsPolling(false);
            onError?.(uploadId, 'Erro no processamento');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar progresso:', error);
      }
    };

    if (isPolling) {
      // Buscar imediatamente
      fetchProgress();

      // Depois continuar polling a cada 500ms
      interval = setInterval(fetchProgress, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadId, isPolling, onComplete, onError]);

  if (!progress) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">Inicializando...</p>
          </div>
        </div>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (progress.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Erro</Badge>;
      case 'processing':
        return <Badge variant="default">Processando</Badge>;
      case 'pending':
        return <Badge variant="secondary">Aguardando</Badge>;
    }
  };

  const getDetailsText = () => {
    if (progress.status === 'completed') {
      return `✓ ${progress.totalTransactions} transações importadas`;
    } else if (progress.status === 'processing') {
      const batchInfo = progress.totalBatches > 0
        ? ` (batch ${progress.currentBatch}/${progress.totalBatches})`
        : '';
      return `${progress.processedTransactions}/${progress.totalTransactions} transações${batchInfo}`;
    } else if (progress.status === 'pending') {
      return 'Aguardando processamento...';
    } else {
      return 'Erro no processamento';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header com ícone, nome e badge */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground">{getDetailsText()}</p>
          </div>
        </div>

        {/* Barra de progresso (apenas se processando ou concluído) */}
        {(progress.status === 'processing' || progress.status === 'completed') && (
          <div className="space-y-1">
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.percentage}%</span>
              {progress.status === 'processing' && (
                <span className="animate-pulse">Processando...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
