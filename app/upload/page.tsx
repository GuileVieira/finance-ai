'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { SQLiteSaveService } from '@/lib/services/sqlite-save.service';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Calendar, DollarSign, Eye, Loader2, X, Save, Download, BarChart3 } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [savedStats, setSavedStats] = useState<any>(null);
  const { toast } = useToast();

  const ofxParser = new OFXParserService();
  const saveService = SQLiteSaveService.getInstance();

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
    // Gerar ID estável baseado no nome do arquivo e timestamp
    const fileId = `${file.name}_${Date.now()}_${file.size}`.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);

    try {
      if (file.name.toLowerCase().includes('.ofx')) {
        // 1. Parser do OFX
        console.log(`🔍 Fazendo parser do arquivo: ${file.name}`);
        const data = await ofxParser.parseFile(file);
        const analysis = ofxParser.analyzeOFXData(data);

        // 2. Classificar cada transação com IA
        console.log(`🤖 Classificando ${data.transactions.length} transações com IA...`);
        const classifiedTransactions = await classifyTransactions(data.transactions, file.name, data.accountInfo);

        return {
          file,
          id: fileId,
          status: 'completed',
          data: {
            ...data,
            transactions: classifiedTransactions
          },
          analysis: {
            ...analysis,
            categoryDistribution: getCategoryDistribution(classifiedTransactions),
            averageConfidence: getAverageConfidence(classifiedTransactions)
          }
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

  // Função para classificar transações usando a API
  const classifyTransactions = async (transactions: any[], fileName: string, accountInfo: any) => {
    const classifiedTransactions = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];

      try {
        console.log(`📝 Classificando transação ${i + 1}/${transactions.length}: ${transaction.description}`);

        // Chamar API de classificação
        const classifyResponse = await fetch('/api/ai/work-categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: transaction.description,
            amount: transaction.amount,
            memo: transaction.memo,
            fileName: fileName,
            bankName: accountInfo.bankId,
            date: transaction.date.toISOString(),
            balance: undefined
          })
        });

        if (!classifyResponse.ok) {
          console.error(`❌ Erro ao classificar transação ${i + 1}:`, classifyResponse.statusText);
          classifiedTransactions.push({
            ...transaction,
            category: 'Utilidades e Insumos',
            confidence: 0.1,
            reasoning: `Erro na classificação: ${classifyResponse.statusText}`,
            source: 'ai'
          });
        } else {
          const classifyResult = await classifyResponse.json();
          if (classifyResult.success) {
            console.log(`✅ Transação ${i + 1} classificada:`, classifyResult.data.category);
            classifiedTransactions.push({
              ...transaction,
              ...classifyResult.data
            });
          } else {
            console.error(`❌ Erro na resposta da classificação ${i + 1}:`, classifyResult.error);
            classifiedTransactions.push({
              ...transaction,
              category: 'Utilidades e Insumos',
              confidence: 0.1,
              reasoning: `Erro na resposta: ${classifyResult.error}`,
              source: 'ai'
            });
          }
        }

        // Pequeno delay para não sobrecarregar a API
        if (i < transactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ Erro ao classificar transação ${i + 1}:`, error);
        classifiedTransactions.push({
          ...transaction,
          category: 'Utilidades e Insumos',
          confidence: 0.1,
          reasoning: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          source: 'ai'
        });
      }
    }

    return classifiedTransactions;
  };

  // Obter distribuição por categoria
  const getCategoryDistribution = (transactions: any[]) => {
    return transactions.reduce((stats, transaction) => {
      const category = transaction.category || 'Não classificado';
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  };

  // Obter confiança média
  const getAverageConfidence = (transactions: any[]) => {
    const validTransactions = transactions.filter(t => t.confidence !== undefined);
    if (validTransactions.length === 0) return 0;

    const totalConfidence = validTransactions.reduce((sum, t) => sum + t.confidence, 0);
    return totalConfidence / validTransactions.length;
  };

  
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);

    const newFiles = acceptedFiles.map(file => ({
      file,
      // Gerar ID estável baseado no arquivo
      id: `${file.name}_${file.size}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 25),
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

  // Função para salvar transações
  const saveTransactions = async (file: UploadedFile) => {
    if (!file.data?.transactions) return;

    setIsSaving(true);
    try {
      await saveService.saveTransactions(
        file.data.transactions,
        file.file.name,
        file.data.accountInfo?.bankId
      );

      toast({
        title: 'Transações Salvas!',
        description: `${file.data.transactions.length} transações foram salvas com sucesso.`,
      });

      // Atualizar estatísticas
      const stats = await saveService.getStatistics();
      setSavedStats(stats);

    } catch (error) {
      console.error('Erro ao salvar transações:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao salvar as transações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para exportar transações salvas
  const exportSavedTransactions = async () => {
    try {
      const jsonData = await saveService.exportTransactions();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `transacoes_salvas_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação Concluída',
        description: 'Transações exportadas para JSON com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar transações:', error);
      toast({
        title: 'Erro na Exportação',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar as transações.',
        variant: 'destructive',
      });
    }
  };

  // Carregar estatísticas ao iniciar
  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await saveService.getStatistics();
        setSavedStats(stats);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      }
    };
    loadStats();
  }, []);

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
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => saveTransactions(file)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              {isSaving ? 'Salvando...' : 'Salvar Transações'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-primary/10 rounded-lg">
                            <p className="text-2xl font-bold text-primary">
                              {file.analysis?.totalTransactions}
                            </p>
                            <p className="text-sm text-muted-foreground">Transações</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {file.analysis?.credits.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Créditos</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {file.analysis?.debits.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Débitos</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
                                <TableHead>Categoria</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Confiança</TableHead>
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
                                    <Badge variant="secondary">
                                      {tx.category || 'Não classificado'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>
                                      {tx.type === 'credit' ? 'Crédito' : 'Débito'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        tx.confidence && tx.confidence >= 0.8 ? 'default' :
                                        tx.confidence && tx.confidence >= 0.6 ? 'secondary' :
                                        'destructive'
                                      }
                                    >
                                      {tx.confidence ? `${(tx.confidence * 100).toFixed(0)}%` : 'N/A'}
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

        {/* Estatísticas de Transações Salvas */}
        {savedStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Estatísticas de Transações Salvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {savedStats.totalTransactions}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Salvas</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    R$ {savedStats.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Object.keys(savedStats.categoryDistribution || {}).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Categorias</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {(savedStats.averageConfidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Confiança Média</p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {Object.entries(savedStats.categoryDistribution || {}).map(([category, count]) => (
                    <span key={category} className="mr-4">
                      {category}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={exportSavedTransactions}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar JSON
                  </Button>
                </div>
              </div>
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
                  <li>• <strong>Categorização inteligente com IA</strong></li>
                  <li>• <strong>Pesquisa automática de empresas (CNPJ/CNAE)</strong></li>
                  <li>• <strong>Confiança de classificação</strong></li>
                  <li>• Análise financeira avançada</li>
                  <li>• Visualização de dados estruturados</li>
                  <li>• Detecção de banco e conta</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">🚀 Em Breve</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Importação de múltiplos arquivos</li>
                  <li>• Botão Salvar funcional (persistência no banco)</li>
                  <li>• Suporte para Excel (XLS/XLSX)</li>
                  <li>• Regras personalizadas de categorização</li>
                  <li>• Integração com sistema financeiro completo</li>
                  <li>• Edição manual de categorias</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}