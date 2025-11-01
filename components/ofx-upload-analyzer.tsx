'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, BarChart3, Clock, CheckCircle, AlertCircle, X, Save, Eye, Database, Building2, CreditCard } from 'lucide-react';

interface OFXTransaction {
  id?: string;
  type: 'debit' | 'credit';
  amount: number;
  date: string;
  description: string;
  memo?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  source?: string;
}

interface AnalysisResult {
  fileInfo: {
    name: string;
    size: number;
    uploadDate: string;
  };
  bankInfo?: {
    bankName?: string;
    accountId?: string;
  };
  company?: {
    id: string;
    name: string;
  };
  account?: {
    id: string;
    name: string;
    bankName: string;
  };
  upload?: {
    id: string;
    filename: string;
    filePath: string;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    status: string;
  };
  transactions: OFXTransaction[];
  statistics: {
    totalTransactions: number;
    totalAmount: number;
    credits: number;
    debits: number;
    categoryDistribution: Record<string, number>;
    averageConfidence: number;
    databasePersistence?: {
      successful: number;
      failed: number;
      totalProcessed: number;
    };
  };
  processingTime: number;
  savedToDatabase?: boolean;
}

export default function OFXUploadAnalyzer() {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<OFXTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validar arquivo
    if (!file.name.toLowerCase().endsWith('.ofx')) {
      setError('Por favor, selecione um arquivo .ofx válido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('O arquivo não pode ser maior que 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);

      // Enviar para API
      const response = await fetch('/api/ofx/upload-and-analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao processar o arquivo');
      }

      setAnalysisResult(result.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao processar o arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount > 0 ? `+R$ ${formatted}` : `-R$ ${formatted}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get category color
  const getCategoryColor = (category?: string): string => {
    if (!category) return 'bg-muted/50 text-muted-foreground';

    const colors: Record<string, string> = {
      'Vendas de Produtos': 'bg-success/10 text-success dark:bg-success/20',
      'Salários e Encargos': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
      'Aluguel e Ocupação': 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
      'Tecnologia e Software': 'bg-info/10 text-info dark:bg-info/20',
      'Serviços Profissionais': 'bg-warning/10 text-warning dark:bg-warning/20',
      'Custos de Produtos': 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
      'Logística e Distribuição': 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
      'Tributos e Contribuições': 'bg-pink-500/10 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
      'Utilidades e Insumos': 'bg-muted/50 text-muted-foreground',
      'Manutenção e Serviços': 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
      'Financeiros e Bancários': 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
    };

    return colors[category] || 'bg-muted/50 text-muted-foreground';
  };

  // Get confidence color
  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'bg-destructive/10 text-destructive dark:bg-destructive/20';
    if (confidence >= 0.8) return 'bg-success/10 text-success dark:bg-success/20';
    if (confidence >= 0.6) return 'bg-warning/10 text-warning dark:bg-warning/20';
    return 'bg-destructive/10 text-destructive dark:bg-destructive/20';
  };

  if (analysisResult) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Análise de OFX</h1>
              <p className="text-muted-foreground mt-1">Arquivo processado: {analysisResult.fileInfo.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground/70 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {analysisResult.processingTime}ms
              </span>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-background hover:bg-muted/30"
              >
                Novo Arquivo
              </button>
              {analysisResult.savedToDatabase && (
                <div className="flex items-center px-4 py-2 bg-success/10 text-success dark:bg-success/20 rounded-md text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvo no Banco
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Upload e Banco de Dados */}
        {analysisResult.upload && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Informações do Upload */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-info mr-2" />
                <h2 className="text-lg font-semibold text-card-foreground">Informações do Upload</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Empresa:</span>
                  <div className="flex items-center text-sm font-medium text-card-foreground">
                    <Building2 className="w-4 h-4 mr-1" />
                    {analysisResult.company?.name || 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Conta:</span>
                  <div className="flex items-center text-sm font-medium text-card-foreground">
                    <CreditCard className="w-4 h-4 mr-1" />
                    {analysisResult.account?.name || 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysisResult.upload.status === 'completed'
                      ? 'bg-success/10 text-success dark:bg-success/20'
                      : 'bg-warning/10 text-warning dark:bg-warning/20'
                  }`}>
                    {analysisResult.upload.status === 'completed' ? 'Concluído' : 'Processando'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Arquivo:</span>
                  <span className="text-sm font-medium text-card-foreground truncate ml-2 max-w-[200px]" title={analysisResult.upload.originalName}>
                    {analysisResult.upload.originalName}
                  </span>
                </div>
              </div>
            </div>

            {/* Status do Banco de Dados */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex items-center mb-4">
                <Database className="w-5 h-5 text-success mr-2" />
                <h2 className="text-lg font-semibold text-card-foreground">Persistência no Banco</h2>
              </div>

              {analysisResult.statistics.databasePersistence ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex items-center text-sm font-medium text-success">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Salvo com sucesso
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Processadas:</span>
                    <span className="text-sm font-medium text-card-foreground">
                      {analysisResult.statistics.databasePersistence.totalProcessed}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sucesso:</span>
                    <span className="text-sm font-medium text-success">
                      {analysisResult.statistics.databasePersistence.successful}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Falhas:</span>
                    <span className="text-sm font-medium text-destructive">
                      {analysisResult.statistics.databasePersistence.failed}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ID do Upload:</span>
                      <span className="text-xs font-mono text-muted-foreground/70 bg-muted/50 px-2 py-1 rounded">
                        {analysisResult.upload.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground/70">
                  <Database className="w-8 h-8 mr-3 text-muted-foreground/50" />
                  <span className="text-sm">Aguardando processamento...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo e Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total de transações */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-info" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold text-card-foreground">{analysisResult.statistics.totalTransactions}</p>
              </div>
            </div>
          </div>

          {/* Valor total */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-success" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-card-foreground">R$ {analysisResult.statistics.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Créditos */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-success font-bold text-sm">+</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Créditos</p>
                <p className="text-2xl font-bold text-success">{analysisResult.statistics.credits}</p>
              </div>
            </div>
          </div>

          {/* Débitos */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-destructive font-bold text-sm">-</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Débitos</p>
                <p className="text-2xl font-bold text-destructive">{analysisResult.statistics.debits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por categoria */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Distribuição por Categoria</h2>
          <div className="space-y-3">
            {Object.entries(analysisResult.statistics.categoryDistribution).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-sm text-muted-foreground">{count} transação{count !== 1 ? 'ões' : ''}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-card-foreground">
                    {((count / analysisResult.statistics.totalTransactions) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de transações */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">Transações Classificadas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Confiança</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-gray-200">
                {analysisResult.transactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.amount > 0 ? 'text-success' : 'text-destructive'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                        {transaction.category || 'Não classificado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(transaction.confidence)}`}>
                        {transaction.confidence ? `${(transaction.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground/70">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-info hover:text-info/80 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de detalhes da transação */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Detalhes da Transação</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data</label>
                    <p className="text-sm text-card-foreground">{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Valor</label>
                    <p className={`text-sm font-bold ${selectedTransaction.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm text-card-foreground">{selectedTransaction.description}</p>
                </div>

                {selectedTransaction.memo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Memo OFX</label>
                    <p className="text-sm text-card-foreground">{selectedTransaction.memo}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedTransaction.category)}`}>
                      {selectedTransaction.category || 'Não classificado'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confiança</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(selectedTransaction.confidence)}`}>
                      {selectedTransaction.confidence ? `${(selectedTransaction.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fonte da Classificação</label>
                  <p className="text-sm text-card-foreground">{selectedTransaction.source || 'N/A'}</p>
                </div>

                {selectedTransaction.reasoning && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Justificativa</label>
                    <p className="text-sm text-card-foreground bg-gray-50 p-3 rounded">{selectedTransaction.reasoning}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-background hover:bg-muted/30"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Upload interface
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-card-foreground mb-4">Upload e Análise de OFX</h1>
        <p className="text-lg text-muted-foreground">Carregue seu arquivo OFX para análise inteligente de transações</p>
      </div>

      {/* Upload area */}
      <div className="bg-background rounded-lg shadow-sm border-2 border-dashed border-border p-12">
        <div
          className={`text-center ${dragActive ? 'border-info bg-info/10' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            {isUploading ? 'Processando arquivo...' : 'Arraste seu arquivo OFX aqui'}
          </h3>
          <p className="text-muted-foreground mb-4">ou clique para selecionar</p>

          <input
            type="file"
            accept=".ofx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />

          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
          </label>

          <p className="text-xs text-muted-foreground/70 mt-4">Formato: .ofx | Tamanho máximo: 10MB</p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6 text-info" />
          </div>
          <h3 className="font-medium text-card-foreground mb-2">Upload Simples</h3>
          <p className="text-sm text-muted-foreground">Arraste ou selecione seu arquivo OFX para análise imediata</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-medium text-card-foreground mb-2">Análise Inteligente</h3>
          <p className="text-sm text-muted-foreground">Classificação automática com IA e pesquisa de empresas</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Save className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-medium text-card-foreground mb-2">Salve os Resultados</h3>
          <p className="text-sm text-muted-foreground">Botão de salvamento para persistir as classificações</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-destructive mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
    </div>
  );
}