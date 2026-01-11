import { toast as sonnerToast } from 'sonner';

export interface PersistentToastData {
  id: string;
  type: 'upload-processing' | 'upload-completed' | 'upload-error';
  title: string;
  description?: string;
  fileName?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
    estimatedTime?: number;
  };
  uploadId?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

class ToastManager {
  private static instance: ToastManager;
  private activeToasts: Map<string, any> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() { }

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * Mostrar toast persistente
   */
  showPersistentToast(data: PersistentToastData) {
    // Limpar toast anterior se existir para o mesmo upload
    this.clearToast(data.id);

    const toast = sonnerToast(data.title, {
      description: this.getDescription(data),
      duration: data.duration || 999999999, // Muito longo para ser persistente
      action: data.action ? {
        label: data.action.label,
        onClick: () => {
          data.action?.onClick();
          this.clearToast(data.id);
        }
      } : undefined,
      dismissible: data.dismissible !== false,
      style: this.getToastStyle(data),
      onAutoClose: () => {
        this.clearToast(data.id);
      }
    });

    this.activeToasts.set(data.id, toast);

    // Se for toast de processamento, iniciar atualização automática
    if (data.type === 'upload-processing' && data.uploadId) {
      this.startAutoUpdate(data);
    }

    return toast;
  }

  /**
   * Atualizar toast existente
   */
  updateToast(id: string, updates: Partial<PersistentToastData>) {
    const existingToast = this.activeToasts.get(id);
    if (!existingToast) return;

    // Limpar interval anterior se existir
    this.clearUpdateInterval(id);

    // Criar dados atualizados
    const updatedData: PersistentToastData = {
      id,
      type: 'upload-processing', // Será sobrescrito se necessário
      title: 'Processando Upload...',
      ...updates
    };

    // Mostrar toast atualizado
    this.showPersistentToast(updatedData);
  }

  /**
   * Limpar toast específico
   */
  clearToast(id: string) {
    this.clearUpdateInterval(id);

    const toast = this.activeToasts.get(id);
    if (toast) {
      toast.dismiss();
      this.activeToasts.delete(id);
    }
  }

  /**
   * Limpar todos os toasts
   */
  clearAllToasts() {
    // Limpar todos os intervals
    for (const [id] of this.updateIntervals) {
      this.clearUpdateInterval(id);
    }

    // Dismissar todos os toasts ativos
    for (const [id, toast] of this.activeToasts) {
      toast.dismiss();
    }

    this.activeToasts.clear();
  }

  /**
   * Iniciar atualização automática para toast de processamento
   */
  private startAutoUpdate(data: PersistentToastData) {
    if (!data.uploadId) return;

    const updateInterval = setInterval(async () => {
      try {
        // Buscar progresso atual
        const response = await fetch(`/api/uploads/${data.uploadId}/progress`);

        if (!response.ok) {
          console.error('Erro ao buscar progresso:', response.statusText);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const progress = result.data;

          // Se completou, mostrar toast de sucesso
          if (progress.status === 'completed') {
            this.clearToast(data.id);
            this.showPersistentToast({
              id: data.id,
              type: 'upload-completed',
              title: '✅ Upload Concluído!',
              description: `${progress.totalTransactions} transações processadas com sucesso`,
              fileName: data.fileName,
              duration: 5000,
              action: {
                label: 'Ver Transações',
                onClick: () => {
                  window.location.href = '/transactions';
                }
              }
            });
            return;
          }

          // Se falhou, mostrar toast de erro
          if (progress.status === 'failed') {
            this.clearToast(data.id);
            this.showPersistentToast({
              id: data.id,
              type: 'upload-error',
              title: '❌ Falha no Upload',
              description: 'Ocorreu um erro durante o processamento',
              fileName: data.fileName,
              duration: 8000,
              dismissible: false,
              action: {
                label: 'Tentar Novamente',
                onClick: () => {
                  // Implementar retry se necessário
                  window.location.reload();
                }
              }
            });
            return;
          }

          // Atualizar progresso
          this.updateToast(data.id, {
            progress: {
              current: progress.processedTransactions,
              total: progress.totalTransactions,
              percentage: progress.percentage,
              estimatedTime: progress.estimatedTimeRemaining
            }
          });
        }
      } catch (error) {
        console.error('Erro na atualização automática do toast:', error);
      }
    }, 2000); // Atualizar a cada 2 segundos

    this.updateIntervals.set(data.id, updateInterval);
  }

  /**
   * Limpar interval de atualização
   */
  private clearUpdateInterval(id: string) {
    const interval = this.updateIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(id);
    }
  }

  /**
   * Obter descrição formatada do toast
   */
  private getDescription(data: PersistentToastData): string {
    if (data.type === 'upload-processing' && data.progress) {
      const { current, total, percentage, estimatedTime } = data.progress;
      const timeText = estimatedTime ? `Tempo estimado: ${this.formatTime(estimatedTime)}` : '';
      const progressText = `Progresso: ${current}/${total} (${percentage}%)`;

      return `${data.fileName ? `📁 ${data.fileName}\n` : ''}${progressText}${timeText ? `\n${timeText}` : ''}`;
    }

    return data.description || '';
  }

  /**
   * Obter estilo CSS do toast baseado no tipo
   */
  private getToastStyle(data: PersistentToastData): React.CSSProperties {
    switch (data.type) {
      case 'upload-processing':
        return {
          borderLeft: '4px solid #3b82f6',
          background: '#eff6ff'
        };
      case 'upload-completed':
        return {
          borderLeft: '4px solid #22c55e',
          background: '#f0fdf4'
        };
      case 'upload-error':
        return {
          borderLeft: '4px solid #ef4444',
          background: '#fef2f2'
        };
      default:
        return {};
    }
  }

  /**
   * Formatar tempo em milissegundos para texto
   */
  private formatTime(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} min`;
  }
}

export default ToastManager.getInstance();