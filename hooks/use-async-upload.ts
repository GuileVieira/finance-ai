import { useState, useCallback, useRef, useEffect } from 'react';
import { usePersistentToast } from './use-persistent-toast';
import ToastManager from '@/lib/toast-manager';

export interface UploadProgress {
  uploadId: string;
  currentBatch: number;
  totalBatches: number;
  processedTransactions: number;
  totalTransactions: number;
  status: 'processing' | 'completed' | 'failed' | 'paused';
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface AsyncUploadResult {
  uploadId: string;
  fileInfo: {
    name: string;
    size: number;
    totalTransactions: number;
  };
  processingInfo: {
    status: string;
    estimatedTime: number;
    progressUrl: string;
    checkInterval: number;
  };
  accountInfo: {
    id: string;
    name: string;
    bankName: string;
  };
  uploadTime: number;
}

export interface UseAsyncUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (uploadId: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

export function useAsyncUpload(options: UseAsyncUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<AsyncUploadResult | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Toast persistente
  const {
    showProcessingToast,
    updateProcessingToast,
    showCompletedToast,
    showErrorToast,
    clearUploadToasts
  } = usePersistentToast({
    onProgress: (progressData) => {
      setProgress(progressData);
    },
    onComplete: (data) => {
      console.log('Upload completado:', data);
    },
    onError: (errorMsg) => {
      setError(errorMsg);
      options.onError?.(errorMsg);
    }
  });

  // Limpar toasts quando componente desmontar
  useEffect(() => {
    return () => {
      if (uploadResult?.uploadId) {
        clearUploadToasts(uploadResult.uploadId);
      }
    };
  }, [uploadResult?.uploadId, clearUploadToasts]);

  const startPolling = useCallback((uploadId: string, checkInterval: number = 2000) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/uploads/${uploadId}/progress`);

        if (!response.ok) {
          throw new Error(`Erro ao consultar progresso: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          const currentProgress = result.data;
          setProgress(currentProgress);

          // Callback de progresso
          options.onProgress?.(currentProgress);

          // Verificar se completou
          if (currentProgress.status === 'completed') {
            stopPolling();
            options.onComplete?.(uploadId);
          } else if (currentProgress.status === 'failed') {
            stopPolling();
            options.onError?.('Processamento falhou');
          }
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('Erro ao consultar progresso:', err);
        // Não para o polling em caso de erro individual
      }
    }, checkInterval);
  }, [options]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setProgress(null);
      setUploadResult(null);

      // Criar AbortController para este upload
      abortControllerRef.current = new AbortController();

      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);

      console.log(`🚀 [ASYNC-UPLOAD] Iniciando upload do arquivo: ${file.name}`);

      // Mostrar toast de processamento inicial
      const { toastId } = showProcessingToast('initial', file.name);

      // Fazer upload assíncrono
      const response = await fetch('/api/ofx/upload-async', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Mostrar toast de erro
        showErrorToast('initial', file.name, errorData.error || `Erro ${response.status}: ${response.statusText}`);

        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        showErrorToast('initial', file.name, result.error || 'Erro no upload');
        throw new Error(result.error || 'Erro no upload');
      }

      setUploadResult(result.data);

      // Atualizar toast com ID real do upload
      if (toastId && result.data.uploadId) {
        ToastManager.clearToast(toastId);
        showProcessingToast(result.data.uploadId, file.name, {
          current: 0,
          total: result.data.fileInfo.totalTransactions,
          percentage: 0
        });
      }

      // Iniciar polling de progresso (se não usar toast persistente)
      if (options.autoStart !== false) {
        startPolling(result.data.uploadId, result.data.processingInfo.checkInterval);
      }

      console.log(`✅ [ASYNC-UPLOAD] Upload iniciado com sucesso:`, {
        uploadId: result.data.uploadId,
        totalTransactions: result.data.fileInfo.totalTransactions,
        estimatedTime: result.data.processingInfo.estimatedTime
      });

      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [options, startPolling, showProcessingToast, showErrorToast]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    stopPolling();
    setIsUploading(false);
    setError('Upload cancelado pelo usuário');
  }, [stopPolling]);

  const reset = useCallback(() => {
    cancelUpload();
    setUploadResult(null);
    setProgress(null);
    setError(null);
  }, [cancelUpload]);

  // Limpar polling ao desmontar
  const cleanup = useCallback(() => {
    stopPolling();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [stopPolling]);

  return {
    // Estado
    isUploading,
    uploadResult,
    progress,
    error,

    // Ações
    uploadFile,
    cancelUpload,
    reset,
    startPolling,
    stopPolling,

    // Utilitários
    cleanup,

    // Status derivados
    isProcessing: progress?.status === 'processing',
    isCompleted: progress?.status === 'completed',
    isFailed: progress?.status === 'failed',
    progressPercentage: progress?.percentage || 0,

    // Textos de status
    statusText: progress ? (
      progress.status === 'processing'
        ? `Processando... ${progress.processedTransactions}/${progress.totalTransactions} transações (${progress.percentage}%)`
        : progress.status === 'completed'
        ? 'Processamento concluído!'
        : progress.status === 'failed'
        ? 'Falha no processamento'
        : 'Aguardando processamento...'
    ) : (
      isUploading ? 'Fazendo upload...' : ''
    )
  };
}