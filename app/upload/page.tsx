'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { OFXParserService, ParsedOFX, ParsedTransaction } from '@/lib/services/ofx-parser.service';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Calendar, DollarSign, Eye, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  id: string;
  status: 'processing' | 'completed' | 'error';
  data?: ParsedOFX;
  analysis?: any;
  error?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const ofxParser = new OFXParserService();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const processFile = async (file: File): Promise<UploadedFile> => {
    const fileId = Math.random().toString(36).substr(2, 9);

    try {
      if (file.name.toLowerCase().includes('.ofx')) {
        const data = await ofxParser.parseFile(file);
        const analysis = ofxParser.analyzeOFXData(data);

        return {
          file,
          id: fileId,
          status: 'completed',
          data,
          analysis
        };
      } else {
        throw new Error('Formato de arquivo não suportado. Use arquivos .ofx');
      }
    } catch (error) {
      return {
        file,
        id: fileId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'processing' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Processar arquivos em paralelo
    const processedFiles = await Promise.all(acceptedFiles.map(file => processFile(file)));

    setUploadedFiles(prev => {
      const updatedFiles = [...prev];
      processedFiles.forEach(processed => {
        const index = updatedFiles.findIndex(f => f.file.name === processed.file.name && f.status === 'processing');
        if (index !== -1) {
          updatedFiles[index] = processed;
        }
      });
      return updatedFiles;
    });

    setIsProcessing(false);

    const successCount = processedFiles.filter(f => f.status === 'completed').length;
    const errorCount = processedFiles.filter(f => f.status === 'error').length;

    if (successCount > 0) {
      toast({
        title: 'Arquivos processados!',
        description: `${successCount} arquivo(s) importado(s) com sucesso.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: 'Erro em alguns arquivos',
        description: `${errorCount} arquivo(s) falharam ao processar.`,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/ofx': ['.ofx'],
      'text/ofx': ['.ofx']
    },
    maxFiles: 5
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
  const errorFiles = uploadedFiles.filter(f => f.status === 'error');

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Inteligente de Extratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {isProcessing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <p className="text-lg font-medium">
                    Processando arquivos...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">
                    {isDragActive ? 'Solte os arquivos aqui' : '📁 Arraste extratos aqui ou clique para selecionar'}
                  </div>
                  <p className="text-muted-foreground">
                    Suporte: OFX (Bancos Brasileiros)
                  </p>
                  <div className="mt-4 space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      🚀 Processamento automático
                    </Badge>
                    <Badge variant="secondary" className="text-xs ml-2">
                      📊 Extração de transações
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arquivos com Erro */}
        {errorFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Arquivos com Erro ({errorFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">{file.file.name}</p>
                      <p className="text-sm text-red-600">{file.error}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Arquivos Processados */}
        {completedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Arquivos Importados ({completedFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="transactions">Transações</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <div className="space-y-4">
                    {completedFiles.map(file => (
                      <div key={file.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">{file.file.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {file.data?.accountInfo.bankId} - Conta {file.data?.accountInfo.accountId}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                              {file.analysis?.totalTransactions}
                            </p>
                            <p className="text-sm text-muted-foreground">Transações</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">
                              {file.analysis?.credits.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Créditos</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">
                              {file.analysis?.debits.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Débitos</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">
                              {formatCurrency(file.analysis?.netBalance || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Saldo</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium mb-2">Período</p>
                            <p className="text-sm">
                              {formatDate(file.data?.period.startDate)} a {formatDate(file.data?.period.endDate)}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium mb-2">Saldo Final</p>
                            <p className="text-lg font-medium">
                              {formatCurrency(file.data?.balance.amount || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="transactions">
                  <div className="space-y-4">
                    {completedFiles.map(file => (
                      <div key={file.id}>
                        <h4 className="font-medium mb-3">{file.file.name}</h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {file.data?.transactions.slice(0, 10).map((tx, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-sm">
                                    {formatDate(tx.date)}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium truncate max-w-[200px]" title={tx.description}>
                                        {tx.description}
                                      </p>
                                      {tx.name && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={tx.name}>
                                          {tx.name}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>
                                      {tx.type === 'credit' ? 'Crédito' : 'Débito'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(tx.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {file.data?.transactions.length > 10 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              ...e mais {file.data.transactions.length - 10} transações
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    {completedFiles.map(file => (
                      <div key={file.id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{file.file.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">Informações Bancárias</h5>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Banco:</span> {file.data?.accountInfo.bankId}</p>
                              <p><span className="font-medium">Agência:</span> {file.data?.accountInfo.branchId}</p>
                              <p><span className="font-medium">Conta:</span> {file.data?.accountInfo.accountId}</p>
                              <p><span className="font-medium">Tipo:</span> {file.data?.accountInfo.accountType}</p>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium mb-2">Estatísticas</h5>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Total Créditos:</span> {formatCurrency(file.analysis?.totalCredits || 0)}</p>
                              <p><span className="font-medium">Total Débitos:</span> {formatCurrency(file.analysis?.totalDebits || 0)}</p>
                              <p><span className="font-medium">Média por Transação:</span> {formatCurrency(file.analysis?.averageTransaction || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Implementado</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Importação de arquivos OFX</li>
                  <li>• Processamento automático de transações</li>
                  <li>• Análise financeira básica</li>
                  <li>• Visualização de dados estruturados</li>
                  <li>• Detecção de banco e conta</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">🚀 Em Breve</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Importação de múltiplos arquivos</li>
                  <li>• Categorização automática com IA</li>
                  <li>• Suporte para Excel (XLS/XLSX)</li>
                  <li>• Regras personalizadas de categorização</li>
                  <li>• Integração com sistema financeiro</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}