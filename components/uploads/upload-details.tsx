'use client';

import { Upload } from '@/lib/types/uploads';
import {
  getUploadStatusInfo,
  formatFileSize,
  formatProcessingTime,
  calculateSuccessRate
} from '@/lib/types/uploads';
import { mockAccounts } from '@/lib/mock-accounts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, Calendar, TrendingUp, Activity } from 'lucide-react';

interface UploadDetailsProps {
  upload: Upload;
  onClose: () => void;
}

export function UploadDetails({ upload }: UploadDetailsProps) {
  const statusInfo = getUploadStatusInfo(upload.status);
  const account = mockAccounts.find(acc => acc.id === upload.account_id);
  const successRate = calculateSuccessRate(upload.successful_transactions, upload.total_transactions);

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Informações Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Original</p>
              <p className="font-medium">{upload.original_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nome do Arquivo</p>
              <p className="font-medium font-mono text-sm">{upload.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge variant="outline" className="mt-1">
                {upload.file_type.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tamanho</p>
              <p className="font-medium">{formatFileSize(upload.file_size)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant="outline"
                className="mt-1"
                style={{
                  backgroundColor: `${statusInfo.color}20`,
                  color: statusInfo.color,
                  borderColor: statusInfo.color
                }}
              >
                <div className="flex items-center gap-1">
                  <span>{statusInfo.icon}</span>
                  <span>{statusInfo.label}</span>
                </div>
              </Badge>
            </div>
          </div>

          {account && (
            <div>
              <p className="text-sm text-muted-foreground">Conta Bancária</p>
              <div className="mt-1">
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  {account.bank_name} - {account.account_number}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas de Processamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estatísticas de Processamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{upload.total_transactions}</p>
              <p className="text-sm text-muted-foreground">Total Transações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {upload.successful_transactions}
              </p>
              <p className="text-sm text-muted-foreground">Sucesso</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {upload.failed_transactions}
              </p>
              <p className="text-sm text-muted-foreground">Falhas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {successRate}%
              </p>
              <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
            </div>
          </div>

          {upload.total_transactions > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{successRate}%</span>
              </div>
              <Progress value={successRate} className="w-full" />
            </div>
          )}

          {upload.processing_time && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tempo de Processamento</span>
              <span className="font-medium">
                {formatProcessingTime(upload.processing_time)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline do Processamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Upload Iniciado</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(upload.uploaded_at)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Arquivo recebido e aguardando processamento
                </p>
              </div>
            </div>

            {/* Processing Steps */}
            {upload.processing_log?.map((log, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getStatusIcon(log.level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium capitalize">{log.step}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message}</p>
                </div>
              </div>
            ))}

            {/* Status Final */}
            {upload.status === 'completed' && upload.processed_at && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Processamento Concluído</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(upload.processed_at)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {upload.successful_transactions} transações importadas com sucesso
                    {upload.failed_transactions > 0 &&
                      ` e ${upload.failed_transactions} falhas registradas`
                    }
                  </p>
                </div>
              </div>
            )}

            {upload.status === 'failed' && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-red-600">Processamento Falhou</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(upload.uploaded_at)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ocorreu um erro durante o processamento do arquivo
                  </p>
                </div>
              </div>
            )}

            {upload.status === 'processing' && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-blue-600">Processando</p>
                    <p className="text-xs text-muted-foreground">
                      Em andamento...
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O arquivo está sendo processado no momento
                  </p>
                  <div className="mt-2">
                    <Progress value={65} className="w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ID do Upload</p>
              <p className="font-medium font-mono text-sm">{upload.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID da Conta</p>
              <p className="font-medium font-mono text-sm">{upload.account_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Enviado por</p>
              <p className="font-medium">user1</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company ID</p>
              <p className="font-medium font-mono text-sm">{upload.company_id}</p>
            </div>
          </div>

          {upload.file_url && (
            <div>
              <p className="text-sm text-muted-foreground">URL do Arquivo</p>
              <p className="font-medium font-mono text-sm break-all">{upload.file_url}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}