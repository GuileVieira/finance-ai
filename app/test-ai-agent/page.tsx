'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ClassificationResult {
  transactionId: string;
  originalDescription: string;
  classification: {
    macro: string;
    micro: string;
    confidence: number;
    reasoning: string;
  };
  rawData: {
    companyName?: string;
    cnpj?: string;
    website?: string;
    description: string;
  };
  source: 'history' | 'cache' | 'ai';
  processingTime: number;
}

interface BatchResult {
  results: ClassificationResult[];
  summary: {
    total: number;
    fromHistory: number;
    fromCache: number;
    fromAI: number;
    processingTime: number;
    costEstimate: number;
  };
}

const TestAIAgent: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [batchTransactions, setBatchTransactions] = useState('');
  const [batchResults, setBatchResults] = useState<BatchResult | null>(null);
  const [stats, setStats] = useState<{
    history?: {
      totalRecords?: number;
      totalPatterns?: number;
      averageAccuracy?: number;
    };
    cache?: {
      totalEntries?: number;
    };
  } | null>(null);
  const [feedback, setFeedback] = useState('');

  // Transações de exemplo para teste
  const exampleTransactions = [
    { description: 'DEBITO IFOOD RESTAURANTES 45.90', amount: 45.90 },
    { description: 'CREDITO SALARIO FOLHA PAGAMENTO 5500.00', amount: 5500.00 },
    { description: 'DEBITO ALUGUEL PREDIO COMERCIAL 2500.00', amount: 2500.00 },
    { description: 'DEBITO NETFLIX ASSINATURA MENSAL 39.90', amount: 39.90 },
    { description: 'DEBITO INSS CONTRIBUICAO MENSAL 850.50', amount: 850.50 },
    { description: 'DEBITO UBER CORRIDA 25.30', amount: 25.30 },
    { description: 'DEBITO ENERGIA ELETRICA CONTA 180.75', amount: 180.75 },
    { description: 'CREDITO VENDA MERCADORIAS LOJA 1200.00', amount: 1200.00 }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/ai/history?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleClassify = async () => {
    if (!description || !amount) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha descrição e valor',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          useCache: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        toast({
          title: 'Classificação realizada',
          description: `Processado em ${data.data.processingTime}ms via ${data.data.source}`
        });
      } else {
        toast({
          title: 'Erro na classificação',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar à API',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchClassify = async () => {
    if (!batchTransactions.trim()) {
      toast({
        title: 'Transações obrigatórias',
        description: 'Adicione transações para processamento em lote',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Parsear transações do textarea
      const lines = batchTransactions.trim().split('\\n');
      const transactions = lines.map((line, index) => {
        const parts = line.split(';').map(p => p.trim());
        return {
          id: `batch_${index}`,
          description: parts[0] || '',
          amount: parseFloat(parts[1]) || 0,
          date: parts[2] || new Date().toISOString().split('T')[0]
        };
      }).filter(t => t.description && t.amount > 0);

      const response = await fetch('/api/ai/batch-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactions,
          useCache: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setBatchResults(data.data);
        toast({
          title: 'Processamento em lote concluído',
          description: `${data.data.summary.total} transações processadas`
        });
      } else {
        toast({
          title: 'Erro no processamento',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar à API',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isCorrect: boolean) => {
    if (!result) return;

    try {
      const response = await fetch('/api/ai/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: result.transactionId,
          originalDescription: result.originalDescription,
          originalClassification: result.classification,
          isCorrect,
          feedback: feedback || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Feedback enviado',
          description: 'Obrigado por ajudar a melhorar o sistema'
        });
        setFeedback('');
        loadStats(); // Recarregar estatísticas
      }
    } catch (error) {
      toast({
        title: 'Erro no feedback',
        description: 'Não foi possível enviar o feedback',
        variant: 'destructive'
      });
    }
  };

  const loadExample = (index: number) => {
    const example = exampleTransactions[index];
    setDescription(example.description);
    setAmount(example.amount.toString());
    setResult(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'history': return '📚';
      case 'cache': return '💾';
      case 'ai': return '🤖';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Teste do Agente de IA</h1>
          <p className="text-xl text-gray-600">Sistema de categorização inteligente de transações financeiras</p>
        </div>

        {/* Estatísticas */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.history?.totalRecords || 0}</div>
                  <div className="text-sm text-gray-600">Registros no Histórico</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.history?.totalPatterns || 0}</div>
                  <div className="text-sm text-gray-600">Padrões Aprendidos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.cache?.totalEntries || 0}</div>
                  <div className="text-sm text-gray-600">Entradas no Cache</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{((stats.history?.averageAccuracy || 0) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Acurácia Média</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Classificação Individual</TabsTrigger>
            <TabsTrigger value="batch">Processamento em Lote</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Classificar Transação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Descrição da Transação</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: DEBITO IFOOD RESTAURANTES 45.90"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Valor (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="45.90"
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleClassify}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Processando...' : 'Classificar Transação'}
                </Button>
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Resultado da Classificação
                    <Badge variant="secondary">
                      {getSourceIcon(result.source)} {result.source}
                    </Badge>
                    <Badge className={getConfidenceColor(result.classification.confidence)}>
                      {Math.round(result.classification.confidence * 100)}% confiança
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Categoria Macro</h4>
                      <p className="text-lg">{result.classification.macro}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Categoria Micro</h4>
                      <p className="text-lg">{result.classification.micro}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold">Justificativa</h4>
                    <p className="text-gray-600">{result.classification.reasoning}</p>
                  </div>

                  {result.rawData.companyName && (
                    <div>
                      <h4 className="font-semibold">Empresa Identificada</h4>
                      <p className="text-gray-600">{result.rawData.companyName}</p>
                      {result.rawData.cnpj && <p className="text-sm text-gray-500">CNPJ: {result.rawData.cnpj}</p>}
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    Processado em {result.processingTime}ms
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Esta classificação está correta?</h4>
                    <div className="flex gap-2">
                      <Button onClick={() => handleFeedback(true)} variant="default">
                        ✅ Sim, está correta
                      </Button>
                      <Button onClick={() => handleFeedback(false)} variant="outline">
                        ❌ Não, precisa corrigir
                      </Button>
                    </div>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Comentários opcionais sobre a classificação..."
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processamento em Lote</CardTitle>
                <p className="text-sm text-gray-600">
                  Formato: descrição;valor;data (opcional)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={batchTransactions}
                  onChange={(e) => setBatchTransactions(e.target.value)}
                  placeholder="DEBITO IFOOD RESTAURANTES 45.90;45.90;2024-01-15
CREDITO SALARIO FOLHA PAGAMENTO 5500.00;5500.00;2024-01-05
DEBITO ALUGUEL PREDIO COMERCIAL 2500.00;2500.00;2024-01-10"
                  className="w-full h-40 font-mono"
                />

                <Button
                  onClick={handleBatchClassify}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Processando...' : 'Processar Lote'}
                </Button>
              </CardContent>
            </Card>

            {batchResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados do Processamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{batchResults.summary.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{batchResults.summary.fromHistory}</div>
                      <div className="text-sm text-gray-600">Histórico</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{batchResults.summary.fromCache}</div>
                      <div className="text-sm text-gray-600">Cache</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{batchResults.summary.fromAI}</div>
                      <div className="text-sm text-gray-600">IA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">${batchResults.summary.costEstimate.toFixed(4)}</div>
                      <div className="text-sm text-gray-600">Custo Est.</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {batchResults.results.map((result, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{getSourceIcon(result.source)}</Badge>
                          <span className="font-medium">{result.originalDescription}</span>
                          <Badge className={getConfidenceColor(result.classification.confidence)}>
                            {Math.round(result.classification.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {result.classification.macro} → {result.classification.micro}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transações de Exemplo</CardTitle>
                <p className="text-sm text-gray-600">
                  Clique para carregar exemplos e testar o sistema
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exampleTransactions.map((example, index) => (
                    <div
                      key={index}
                      onClick={() => loadExample(index)}
                      className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{example.description}</div>
                      <div className="text-sm text-gray-600">R$ {example.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestAIAgent;