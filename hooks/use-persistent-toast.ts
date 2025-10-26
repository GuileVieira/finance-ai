import { useCallback, useRef } from 'react';
import ToastManager, { PersistentToastData } from '@/lib/toast-manager';

interface UsePersistentToastOptions {
  onUpdate?: (progress: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export function usePersistentToast(options: UsePersistentToastOptions = {}) {
  const toastIdsRef = useRef<Set<string>>(new Set());

  /**
   * Mostrar toast de processamento persistente
   */
  const showProcessingToast = useCallback((
    uploadId: string,
    fileName: string,
    initialProgress?: { current: number; total: number }
  ) => {
    // Gerar ID único para este toast
    const toastId = `upload-${uploadId}-${Date.now()}`;
    toastIdsRef.current.add(toastId);

    const toastData: PersistentToastData = {
      id: toastId,
      type: 'upload-processing',
      title: '🔄 Processando Upload OFX',
      fileName,
      progress: initialProgress || {
        current: 0,
        total: 0,
        percentage: 0
      },
      uploadId,
      dismissible: false,
      action: {
        label: 'Acompanhar',
        onClick: () => {
          window.location.href = '/test-async-upload';
        }
      }
    };

    const toast = ToastManager.showPersistentToast(toastData);

    return {
      toastId,
      toast
    };
  }, [options.onUpdate]);

  /**
   * Atualizar toast de processamento
   */
  const updateProcessingToast = useCallback((
    toastId: string,
    progress: { current: number; total: number; percentage: number; estimatedTime?: number }
  ) => {
    ToastManager.updateToast(toastId, {
      progress
    });

    options.onUpdate?.(progress);
  }, [options.onUpdate]);

  /**
   * Mostrar toast de conclusão
   */
  const showCompletedToast = useCallback((
    uploadId: string,
    fileName: string,
    totalTransactions: number,
    resultUrl?: string
  ) => {
    // Limpar toast de processamento se existir
    const processingToastId = Array.from(toastIdsRef.current)
      .find(id => id.includes(uploadId));

    if (processingToastId) {
      ToastManager.clearToast(processingToastId);
      toastIdsRef.current.delete(processingToastId);
    }

    // Gerar ID para toast de conclusão
    const toastId = `completed-${uploadId}-${Date.now()}`;
    toastIdsRef.current.add(toastId);

    const toastData: PersistentToastData = {
      id: toastId,
      type: 'upload-completed',
      title: '✅ Upload Concluído!',
      description: `${totalTransactions} transações processadas com sucesso`,
      fileName,
      duration: 8000, // 8 segundos
      action: {
        label: 'Ver Transações',
        onClick: () => {
          if (resultUrl) {
            window.location.href = resultUrl;
          } else {
            window.location.href = '/transactions';
          }
        }
      },
      dismissible: true
    };

    ToastManager.showPersistentToast(toastData);
    options.onComplete?.({
      uploadId,
      totalTransactions,
      fileName
    });

    return toastId;
  }, [options.onComplete]);

  /**
   * Mostrar toast de erro
   */
  const showErrorToast = useCallback((
    uploadId: string,
    fileName: string,
    errorMessage: string,
    retryAction?: () => void
  ) => {
    // Limpar toast de processamento se existir
    const processingToastId = Array.from(toastIdsRef.current)
      .find(id => id.includes(uploadId));

    if (processingToastId) {
      ToastManager.clearToast(processingToastId);
      toastIdsRef.current.delete(processingToastId);
    }

    // Gerar ID para toast de erro
    const toastId = `error-${uploadId}-${Date.now()}`;
    toastIdsRef.current.add(toastId);

    const toastData: PersistentToastData = {
      id: toastId,
      type: 'upload-error',
      title: '❌ Falha no Upload',
      description: errorMessage,
      fileName,
      duration: 10000, // 10 segundos
      dismissible: false,
      action: retryAction ? {
        label: 'Tentar Novamente',
        onClick: retryAction
      } : {
        label: 'Fechar',
        onClick: () => {
          ToastManager.clearToast(toastId);
          toastIdsRef.current.delete(toastId);
        }
      }
    };

    ToastManager.showPersistentToast(toastData);
    options.onError?.(errorMessage);

    return toastId;
  }, [options.onError]);

  /**
   * Limpar toast específico
   */
  const clearToast = useCallback((toastId: string) => {
    ToastManager.clearToast(toastId);
    toastIdsRef.current.delete(toastId);
  }, []);

  /**
   * Limpar todos os toasts
   */
  const clearAllToasts = useCallback(() => {
    ToastManager.clearAllToasts();
    toastIdsRef.current.clear();
  }, []);

  /**
   * Limpar toasts relacionados a um upload específico
   */
  const clearUploadToasts = useCallback((uploadId: string) => {
    const toastsToClear = Array.from(toastIdsRef.current)
      .filter(id => id.includes(uploadId));

    toastsToClear.forEach(toastId => {
      ToastManager.clearToast(toastId);
      toastIdsRef.current.delete(toastId);
    });
  }, []);

  return {
    showProcessingToast,
    updateProcessingToast,
    showCompletedToast,
    showErrorToast,
    clearToast,
    clearAllToasts,
    clearUploadToasts
  };
}