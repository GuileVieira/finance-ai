'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UploadDetails } from '@/components/uploads/upload-details';
import { mockUploads, createMockUpload } from '@/lib/mock-uploads';
import { Upload } from '@/lib/types/uploads';
import {
  getUploadStatusInfo,
  formatFileSize,
  formatProcessingTime,
  calculateSuccessRate,
  fileTypes
} from '@/lib/types/uploads';
import { mockAccounts } from '@/lib/mock-accounts';
import { Plus, Search, Filter, Eye, ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SettingsUploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>(mockUploads);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [viewingUpload, setViewingUpload] = useState<Upload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Filtrar uploads
  const filteredUploads = uploads.filter(upload => {
    const matchesSearch = upload.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         upload.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || upload.status === filterStatus;
    const matchesType = filterType === 'all' || upload.file_type === filterType;
    const matchesAccount = filterAccount === 'all' || upload.account_id === filterAccount;

    return matchesSearch && matchesStatus && matchesType && matchesAccount;
  });

  // Simular upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simular upload
    await new Promise(resolve => setTimeout(resolve, 1000));

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileType = fileExtension === 'ofx' ? 'ofx' :
                     fileExtension === 'xlsx' ? 'xlsx' :
                     fileExtension === 'csv' ? 'csv' : 'ofx';

    // Selecionar conta aleatória para demo
    const randomAccount = mockAccounts[Math.floor(Math.random() * mockAccounts.length)];

    const newUpload = createMockUpload({
      original_name: file.name,
      file_type: fileType,
      account_id: randomAccount.id
    });

    newUpload.file_size = file.size;

    setUploads(prev => [newUpload, ...prev]);
    setIsUploading(false);

    toast({
      title: 'Upload Iniciado',
      description: `${file.name} foi enviado para processamento.`,
    });

    // Limpar input
    event.target.value = '';

    // Simular processamento após alguns segundos
    setTimeout(() => {
      setUploads(prev => prev.map(upload =>
        upload.id === newUpload.id
          ? {
              ...upload,
              status: 'processing',
              processing_log: [
                {
                  step: 'upload',
                  message: 'Arquivo recebido com sucesso',
                  timestamp: new Date().toISOString(),
                  level: 'info'
                },
                {
                  step: 'validation',
                  message: 'Validando formato do arquivo',
                  timestamp: new Date().toISOString(),
                  level: 'info'
                },
                {
                  step: 'parsing',
                  message: 'Processando transações...',
                  timestamp: new Date().toISOString(),
                  level: 'info'
                }
              ]
            }
          : upload
      ));
    }, 2000);

    // Simular conclusão do processamento
    setTimeout(() => {
      const totalTransactions = Math.floor(Math.random() * 200) + 50;
      const successfulTransactions = Math.floor(totalTransactions * (0.9 + Math.random() * 0.1));

      setUploads(prev => prev.map(upload =>
        upload.id === newUpload.id
          ? {
              ...upload,
              status: 'completed',
              total_transactions: totalTransactions,
              successful_transactions: successfulTransactions,
              failed_transactions: totalTransactions - successfulTransactions,
              processed_at: new Date().toISOString(),
              processing_time: Math.floor(Math.random() * 60) + 10,
              processing_log: [
                {
                  step: 'upload',
                  message: 'Arquivo recebido com sucesso',
                  timestamp: new Date(Date.now() - 5000).toISOString(),
                  level: 'info'
                },
                {
                  step: 'validation',
                  message: 'Validando formato do arquivo',
                  timestamp: new Date(Date.now() - 4000).toISOString(),
                  level: 'info'
                },
                {
                  step: 'parsing',
                  message: 'Transações processadas com sucesso',
                  timestamp: new Date(Date.now() - 3000).toISOString(),
                  level: 'info'
                },
                {
                  step: 'categorization',
                  message: 'Categorizando transações automaticamente',
                  timestamp: new Date(Date.now() - 2000).toISOString(),
                  level: 'info'
                },
                {
                  step: 'completion',
                  message: 'Processamento concluído com sucesso',
                  timestamp: new Date(Date.now() - 1000).toISOString(),
                  level: 'info'
                }
              ]
            }
          : upload
      ));

      toast({
        title: 'Processamento Concluído',
        description: `Foram importadas ${successfulTransactions} transações com sucesso.`,
      });
    }, 5000);
  };

  // Reenviar upload falho
  const handleRetryUpload = (uploadId: string) => {
    setUploads(prev => prev.map(upload =>
      upload.id === uploadId
        ? {
            ...upload,
            status: 'processing',
            processing_log: [
              {
                step: 'retry',
                message: 'Tentando processar novamente...',
                timestamp: new Date().toISOString(),
                level: 'info'
              }
            ]
          }
        : upload
    ));

    toast({
      title: 'Reprocessamento Iniciado',
      description: 'O arquivo está sendo processado novamente.',
    });
  };

  // Excluir upload
  const handleDeleteUpload = (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload) return;

    setUploads(prev => prev.filter(u => u.id !== uploadId));

    toast({
      title: 'Upload Excluído',
      description: `${upload.original_name} foi removido com sucesso!`,
    });
  };

  // Calcular estatísticas
  const totalUploads = uploads.length;
  const completedUploads = uploads.filter(u => u.status === 'completed').length;
  const processingUploads = uploads.filter(u => u.status === 'processing').length;
  const failedUploads = uploads.filter(u => u.status === 'failed').length;
  const totalTransactions = uploads.reduce((sum, u) => sum + u.successful_transactions, 0);
  const averageProcessingTime = uploads
    .filter(u => u.processing_time)
    .reduce((sum, u, _, arr) => sum + (u.processing_time || 0) / arr.length, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Configurações
            </Button>
          </Link>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">Uploads</h1>
            <p className="text-muted-foreground">
              Gerencie o histórico de importações de arquivos
            </p>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".ofx,.xlsx,.csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Enviando...' : 'Novo Upload'}
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalUploads}</p>
                  <p className="text-sm text-muted-foreground">Total Uploads</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{completedUploads}</p>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <p className="text-sm text-muted-foreground">Transações</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {averageProcessingTime > 0 ? `${Math.round(averageProcessingTime)}s` : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar uploads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="failed">Falharam</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full lg:w-[120px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fileTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {mockAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>
              Uploads ({filteredUploads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUploads.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum upload encontrado.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transações</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUploads.map((upload) => {
                    const statusInfo = getUploadStatusInfo(upload.status);
                    const account = mockAccounts.find(acc => acc.id === upload.account_id);
                    const successRate = calculateSuccessRate(
                      upload.successful_transactions,
                      upload.total_transactions
                    );

                    return (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileTypeIcon(upload.file_type)}</span>
                            <div>
                              <p className="font-medium">{upload.original_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {upload.filename}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {account ? (
                            <div>
                              <p className="font-medium">{account.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.bank_name}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(upload.status)}
                            <div>
                              <Badge
                                variant="outline"
                                style={{
                                  backgroundColor: `${statusInfo.color}20`,
                                  color: statusInfo.color,
                                  borderColor: statusInfo.color
                                }}
                              >
                                {statusInfo.label}
                              </Badge>
                              {upload.status === 'processing' && (
                                <Progress value={65} className="w-16 h-1 mt-1" />
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">
                              {upload.successful_transactions}/{upload.total_transactions}
                            </p>
                            {upload.total_transactions > 0 && (
                              <p className={`text-xs ${
                                successRate >= 90 ? 'text-green-600' :
                                successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {successRate}% sucesso
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <p>{formatFileSize(upload.file_size)}</p>
                            {upload.processing_time && (
                              <p className="text-xs text-muted-foreground">
                                {formatProcessingTime(upload.processing_time)}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(upload.uploaded_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(upload.uploaded_at).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingUpload(upload)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {upload.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryUpload(upload.id)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir ${upload.original_name}?`)) {
                                  handleDeleteUpload(upload.id);
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={!!viewingUpload} onOpenChange={() => setViewingUpload(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Upload</DialogTitle>
            </DialogHeader>
            {viewingUpload && (
              <UploadDetails
                upload={viewingUpload}
                onClose={() => setViewingUpload(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWrapper>
  );
}