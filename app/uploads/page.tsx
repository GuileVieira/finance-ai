'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import {
  FileText,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Upload {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  uploadedAt: string;
  processedAt?: string;
  account?: {
    name: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
  };
  processingStats?: {
    successRate: number;
    failureRate: number;
    isCompleted: boolean;
    hasErrors: boolean;
  };
  fileInfo?: {
    sizeFormatted: string;
    typeFormatted: string;
    storageProvider: string;
  };
}

interface UploadsResponse {
  success: boolean;
  data: {
    uploads: Upload[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    stats: {
      total: number;
      byStatus: {
        completed: number;
        processing: number;
        failed: number;
        pending: number;
      };
      byFileType: {
        ofx: number;
        xlsx: number;
        csv: number;
      };
      totalTransactions: number;
      totalSuccessful: number;
      totalFailed: number;
    };
  };
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (fileTypeFilter) params.append('fileType', fileTypeFilter);

      const response = await fetch(`/api/uploads?${params}`);
      const result: UploadsResponse = await response.json();

      if (result.success) {
        setUploads(result.data.uploads);
        setPagination(result.data.pagination);
        setStats(result.data.stats);
      } else {
        throw new Error(result.error || 'Erro ao carregar uploads');
      }
    } catch (error) {
      console.error('Erro ao carregar uploads:', error);
      toast({
        title: 'Erro ao carregar uploads',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [currentPage, search, statusFilter, fileTypeFilter]);

  const handleDownload = async (upload: Upload) => {
    try {
      const response = await fetch(`/api/uploads/${upload.id}/download`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao baixar arquivo');
      }

      // Criar blob e download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado',
        description: `${upload.originalName} está sendo baixado`
      });
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: 'Erro no download',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao baixar o arquivo',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Uploads</h1>
            <p className="text-muted-foreground">
              Histórico de arquivos OFX e planilhas importadas
            </p>
          </div>
          <Button onClick={() => window.location.href = '/upload'}>
            <FileText className="w-4 h-4 mr-2" />
            Novo Upload
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Uploads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.byStatus.completed}</p>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                    <p className="text-sm text-muted-foreground">Transações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalFailed}</p>
                    <p className="text-sm text-muted-foreground">Falhas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome do arquivo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ofx">OFX</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Uploads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Importados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando...</span>
              </div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum upload encontrado</p>
                <Button
                  className="mt-4"
                  onClick={() => window.location.href = '/upload'}
                >
                  Fazer primeiro upload
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transações</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[200px]" title={upload.originalName}>
                              {upload.originalName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {upload.fileInfo?.sizeFormatted}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {upload.fileInfo?.typeFormatted}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{upload.account?.name}</p>
                            <p className="text-muted-foreground">
                              {upload.account?.bankName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(upload.status)}
                            <Badge className={getStatusColor(upload.status)}>
                              {upload.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{upload.totalTransactions}</p>
                            {upload.processingStats?.hasErrors && (
                              <p className="text-red-600 text-xs">
                                {upload.failedTransactions} falhas
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(upload.uploadedAt)}</p>
                            {upload.processedAt && (
                              <p className="text-muted-foreground text-xs">
                                Processado: {formatDate(upload.processedAt)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(upload)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} a{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                      {pagination.totalItems} uploads
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {pagination.currentPage} de {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}