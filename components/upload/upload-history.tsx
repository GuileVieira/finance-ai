'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Upload {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalTransactions: number;
  processedTransactions: number;
  uploadedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

interface UploadHistoryProps {
  companyId: string;
  limit?: number;
  refreshTrigger?: number;
}

export function UploadHistory({
  companyId,
  limit = 5,
  refreshTrigger = 0
}: UploadHistoryProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [companyId, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/uploads?limit=${limit}`);
      const result = await response.json();

      if (result.success && result.data?.uploads) {
        // Mapear para o formato esperado
        const mappedUploads = result.data.uploads.map((upload: Record<string, unknown>) => ({
          id: upload.id as string,
          fileName: upload.originalName as string,
          status: upload.status as 'pending' | 'processing' | 'completed' | 'failed',
          totalTransactions: upload.totalTransactions as number,
          processedTransactions: upload.successfulTransactions as number,
          uploadedAt: upload.uploadedAt as string,
          completedAt: upload.processedAt as string | null,
          errorMessage: (upload.processingLog as string) || null
        }));
        setUploads(mappedUploads);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Upload['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Upload['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-xs">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      case 'processing':
        return <Badge variant="default" className="text-xs">Processando</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Aguardando</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando histórico...</p>
        </div>
      </Card>
    );
  }

  if (uploads.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum upload encontrado
          </p>
          <p className="text-xs text-muted-foreground">
            Faça o upload de um arquivo OFX para começar
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Uploads Recentes</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchHistory}
          className="text-xs"
        >
          Atualizar
        </Button>
      </div>

      <div className="space-y-2">
        {uploads.map((upload) => (
          <Card key={upload.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getStatusIcon(upload.status)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{upload.fileName}</p>
                  {getStatusBadge(upload.status)}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {upload.status === 'completed' ? (
                      `${upload.totalTransactions} transações`
                    ) : upload.status === 'processing' ? (
                      `${upload.processedTransactions}/${upload.totalTransactions} transações`
                    ) : (
                      `${upload.totalTransactions} transações`
                    )}
                  </span>
                  <span>•</span>
                  <span>{formatDate(upload.uploadedAt)}</span>
                </div>

                {upload.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">
                    {upload.errorMessage}
                  </p>
                )}
              </div>

              {upload.status === 'completed' && (
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
