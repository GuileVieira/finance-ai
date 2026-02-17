'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

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
  errorMessage?: string;
  uncategorizedCount?: number;
}

const MAX_POLL_FAILURES = 5;
const STALE_TIMEOUT_MS = 120_000; // 2 min sem progresso = timeout

export function UploadProgressItem({
  uploadId,
  fileName,
  onComplete,
  onError
}: UploadProgressItemProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [pollFailures, setPollFailures] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const lastProgressRef = useRef<{ percentage: number; timestamp: number }>({
    percentage: -1,
    timestamp: Date.now()
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/uploads/${uploadId}/progress`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setProgress(result.data);
          setPollFailures(0); // Reset failures on success

          // Verificar stale progress (timeout)
          const now = Date.now();
          if (result.data.percentage !== lastProgressRef.current.percentage) {
            lastProgressRef.current = { percentage: result.data.percentage, timestamp: now };
          } else if (
            result.data.status === 'processing' &&
            now - lastProgressRef.current.timestamp > STALE_TIMEOUT_MS
          ) {
            setIsTimedOut(true);
            setIsPolling(false);
            onError?.(uploadId, `Processamento travado há mais de 2 minutos para "${fileName}". Tente novamente.`);
            return;
          }

          // Parar polling se concluído ou com erro
          if (result.data.status === 'completed') {
            setIsPolling(false);
            onComplete?.(uploadId);
          } else if (result.data.status === 'failed') {
            setIsPolling(false);
            onError?.(uploadId, result.data.errorMessage || `Erro ao processar "${fileName}".`);
          }
        } else {
          // API retornou success: false
          throw new Error(result.error || 'Resposta inválida do servidor');
        }
      } catch (error) {
        const failures = pollFailures + 1;
        setPollFailures(failures);
        console.error(`Erro ao buscar progresso (tentativa ${failures}/${MAX_POLL_FAILURES}):`, error);

        if (failures >= MAX_POLL_FAILURES) {
          setIsPolling(false);
          onError?.(uploadId, `Não foi possível acompanhar o processamento de "${fileName}". Verifique o histórico de uploads.`);
        }
      }
    };

    if (isPolling) {
      fetchProgress();
      interval = setInterval(fetchProgress, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadId, isPolling, pollFailures, onComplete, onError, fileName]);

  const handleRetry = () => {
    setPollFailures(0);
    setIsTimedOut(false);
    lastProgressRef.current = { percentage: -1, timestamp: Date.now() };
    setIsPolling(true);
  };

  // Estado de erro de conexão (polling falhou)
  if (pollFailures >= MAX_POLL_FAILURES && !progress) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-destructive">
              Falha ao conectar com o servidor. O processamento pode estar acontecendo em segundo plano.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  // Estado de timeout
  if (isTimedOut) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-destructive">
              Processamento sem progresso há mais de 2 minutos.
              {progress && ` Parou em ${progress.processedTransactions}/${progress.totalTransactions} transações.`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Verificar novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              Inicializando...
              {pollFailures > 0 && (
                <span className="text-amber-500 ml-1">
                  (reconectando... {pollFailures}/{MAX_POLL_FAILURES})
                </span>
              )}
            </p>
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
      return `${progress.totalTransactions} transações importadas`;
    } else if (progress.status === 'processing') {
      const batchInfo = progress.totalBatches > 0
        ? ` (batch ${progress.currentBatch}/${progress.totalBatches})`
        : '';
      return `${progress.processedTransactions}/${progress.totalTransactions} transações${batchInfo}`;
    } else if (progress.status === 'pending') {
      return 'Aguardando processamento...';
    } else {
      return progress.errorMessage || 'Erro no processamento';
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
          {progress.status === 'failed' && (
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Verificar
            </Button>
          )}
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
