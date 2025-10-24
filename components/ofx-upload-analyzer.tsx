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
    if (!category) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      'Vendas de Produtos': 'bg-green-100 text-green-800',
      'Salários e Encargos': 'bg-red-100 text-red-800',
      'Aluguel e Ocupação': 'bg-purple-100 text-purple-800',
      'Tecnologia e Software': 'bg-blue-100 text-blue-800',
      'Serviços Profissionais': 'bg-yellow-100 text-yellow-800',
      'Custos de Produtos': 'bg-orange-100 text-orange-800',
      'Logística e Distribuição': 'bg-indigo-100 text-indigo-800',
      'Tributos e Contribuições': 'bg-pink-100 text-pink-800',
      'Utilidades e Insumos': 'bg-gray-100 text-gray-800',
      'Manutenção e Serviços': 'bg-teal-100 text-teal-800',
      'Financeiros e Bancários': 'bg-cyan-100 text-cyan-800',
    };

    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Get confidence color
  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'bg-red-100 text-red-800';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (analysisResult) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análise de OFX</h1>
              <p className="text-gray-600 mt-1">Arquivo processado: {analysisResult.fileInfo.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {analysisResult.processingTime}ms
              </span>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Novo Arquivo
              </button>
              {analysisResult.savedToDatabase && (
                <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Informações do Upload</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Empresa:</span>
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <Building2 className="w-4 h-4 mr-1" />
                    {analysisResult.company?.name || 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conta:</span>
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <CreditCard className="w-4 h-4 mr-1" />
                    {analysisResult.account?.name || 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysisResult.upload.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {analysisResult.upload.status === 'completed' ? 'Concluído' : 'Processando'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Arquivo:</span>
                  <span className="text-sm font-medium text-gray-900 truncate ml-2 max-w-[200px]" title={analysisResult.upload.originalName}>
                    {analysisResult.upload.originalName}
                  </span>
                </div>
              </div>
            </div>

            {/* Status do Banco de Dados */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Database className="w-5 h-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Persistência no Banco</h2>
              </div>

              {analysisResult.statistics.databasePersistence ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <div className="flex items-center text-sm font-medium text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Salvo com sucesso
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Processadas:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {analysisResult.statistics.databasePersistence.totalProcessed}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sucesso:</span>
                    <span className="text-sm font-medium text-green-600">
                      {analysisResult.statistics.databasePersistence.successful}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Falhas:</span>
                    <span className="text-sm font-medium text-red-600">
                      {analysisResult.statistics.databasePersistence.failed}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">ID do Upload:</span>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {analysisResult.upload.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Database className="w-8 h-8 mr-3 text-gray-400" />
                  <span className="text-sm">Aguardando processamento...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo e Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total de transações */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Transações</p>
                <p className="text-2xl font-bold text-gray-900">{analysisResult.statistics.totalTransactions}</p>
              </div>
            </div>
          </div>

          {/* Valor total */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">R$ {analysisResult.statistics.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Créditos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">+</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Créditos</p>
                <p className="text-2xl font-bold text-green-600">{analysisResult.statistics.credits}</p>
              </div>
            </div>
          </div>

          {/* Débitos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">-</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Débitos</p>
                <p className="text-2xl font-bold text-red-600">{analysisResult.statistics.debits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por categoria */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Categoria</h2>
          <div className="space-y-3">
            {Object.entries(analysisResult.statistics.categoryDistribution).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-sm text-gray-600">{count} transação{count !== 1 ? 'ões' : ''}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {((count / analysisResult.statistics.totalTransactions) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de transações */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transações Classificadas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confiança</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisResult.transactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Detalhes da Transação</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valor</label>
                    <p className={`text-sm font-bold ${selectedTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Descrição</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
                </div>

                {selectedTransaction.memo && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Memo OFX</label>
                    <p className="text-sm text-gray-900">{selectedTransaction.memo}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600">Categoria</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedTransaction.category)}`}>
                      {selectedTransaction.category || 'Não classificado'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Confiança</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(selectedTransaction.confidence)}`}>
                      {selectedTransaction.confidence ? `${(selectedTransaction.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Fonte da Classificação</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.source || 'N/A'}</p>
                </div>

                {selectedTransaction.reasoning && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Justificativa</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedTransaction.reasoning}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload e Análise de OFX</h1>
        <p className="text-lg text-gray-600">Carregue seu arquivo OFX para análise inteligente de transações</p>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-12">
        <div
          className={`text-center ${dragActive ? 'border-blue-400 bg-blue-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isUploading ? 'Processando arquivo...' : 'Arraste seu arquivo OFX aqui'}
          </h3>
          <p className="text-gray-600 mb-4">ou clique para selecionar</p>

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
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
          </label>

          <p className="text-xs text-gray-500 mt-4">Formato: .ofx | Tamanho máximo: 10MB</p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Upload Simples</h3>
          <p className="text-sm text-gray-600">Arraste ou selecione seu arquivo OFX para análise imediata</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Análise Inteligente</h3>
          <p className="text-sm text-gray-600">Classificação automática com IA e pesquisa de empresas</p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Save className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Salve os Resultados</h3>
          <p className="text-sm text-gray-600">Botão de salvamento para persistir as classificações</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
    </div>
  );
}