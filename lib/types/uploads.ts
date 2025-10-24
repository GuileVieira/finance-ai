export interface Upload {
  id: string;
  company_id: string;
  account_id: string;
  filename: string;
  original_name: string;
  file_type: 'ofx' | 'xlsx' | 'csv';
  file_size: number;
  file_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_log?: any;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  uploaded_at: string;
  processed_at?: string;
  uploaded_by: string;
  processing_time?: number; // em segundos
}

export interface UploadFormData {
  company_id: string;
  account_id: string;
  original_name: string;
  file_type: 'ofx' | 'xlsx' | 'csv';
}

export interface ProcessingLog {
  step: string;
  message: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

export const fileTypes = [
  { value: 'ofx', label: 'OFX', description: 'Arquivo OFX bancário', icon: '📄' },
  { value: 'xlsx', label: 'Excel', description: 'Planilha Excel (.xlsx)', icon: '📊' },
  { value: 'csv', label: 'CSV', description: 'Valores separados por vírgula', icon: '📋' }
];

export const uploadStatus = {
  pending: { label: 'Aguardando', color: '#F59E0B', icon: '⏳' },
  processing: { label: 'Processando', color: '#3B82F6', icon: '🔄' },
  completed: { label: 'Concluído', color: '#10B981', icon: '✅' },
  failed: { label: 'Falhou', color: '#EF4444', icon: '❌' }
};

export const getUploadStatusInfo = (status: keyof typeof uploadStatus) => {
  return uploadStatus[status];
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatProcessingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export const calculateSuccessRate = (successful: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((successful / total) * 100);
};

export const getFileTypeIcon = (fileType: string): string => {
  const type = fileTypes.find(t => t.value === fileType);
  return type?.icon || '📄';
};