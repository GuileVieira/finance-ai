'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface SimpleClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
  source: 'rule_based' | 'ai';
  processingTime: number;
}

interface SimpleApiResponse {
  success: boolean;
  data?: SimpleClassificationResult & {
    timestamp: string;
  };
  error?: string;
}

const TestSimpleAgent: React.FC = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimpleClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transações de exemplo para teste rápido
  const exampleTransactions = [
    { description: 'DEBITO IFOOD RESTAURANTES 45.90', amount: 45.90 },
    { description: 'CREDITO SALARIO FOLHA PAGAMENTO 5500.00', amount: 5500.00 },
    { description: 'DEBITO ALUGUEL PREDIO COMERCIAL 2500.00', amount: 2500.00 },
    { description: 'DEBITO NETFLIX ASSINATURA MENSAL 39.90', amount: 39.90 },
    { description: 'DEBITO UBER CORRIDA 25.30', amount: 25.30 },
    { description: 'CREDITO VENDA MERCADORIAS LOJA 1200.00', amount: 1200.00 }
  ];

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
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/simple-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount)
        })
      });

      const data: SimpleApiResponse = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        toast({
          title: 'Classificação realizada',
          description: `Categoria: ${data.data.category} (${Math.round(data.data.confidence * 100)}% confiança)`
        });
      } else {
        setError(data.error || 'Erro desconhecido');
        toast({
          title: 'Erro na classificação',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      setError(errorMessage);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar à API',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (example: { description: string; amount: number }) => {
    setDescription(example.description);
    setAmount(example.amount.toString());
    setResult(null);
    setError(null);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'rule_based':
        return { label: 'Regras', variant: 'secondary' as const };
      case 'ai':
        return { label: 'IA', variant: 'default' as const };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Agente Simples de IA</h1>
          <p className="text-xl text-gray-600">Categorização básica de transações financeiras</p>
          <p className="text-sm text-gray-500">
            Baseado em LangChain com regras e LiteLLM
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Categorizar Transação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Descrição da Transação
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: DEBITO IFOOD RESTAURANTES 45.90"
                className="w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="45.90"
                className="w-full"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleClassify}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Processando...' : 'Categorizar Transação'}
            </Button>
          </CardContent>
        </Card>

        {/* Exemplos Rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplos para Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleTransactions.map((example, index) => (
                <div
                  key={index}
                  onClick={() => loadExample(example)}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-sm">{example.description}</div>
                  <div className="text-lg font-semibold">R$ {example.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Resultado da Classificação
                <Badge {...getSourceBadge(result.source)}>
                  {getSourceBadge(result.source).label}
                </Badge>
                <Badge className={getConfidenceColor(result.confidence)}>
                  {Math.round(result.confidence * 100)}% confiança
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Categoria</h4>
                  <p className="text-lg">{result.category}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Tempo de Processamento</h4>
                  <p className="text-lg">{result.processingTime}ms</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Justificativa</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{result.reasoning}</p>
              </div>

              <div className="text-sm text-gray-500">
                Processado em: {new Date(result.timestamp).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Como Funciona */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-green-600">1️⃣ Regras Baseadas</h4>
              <p className="text-sm text-gray-600">
                Primeiro, tenta categorizar usando palavras-chave conhecidas (ifood → Alimentação, uber → Transporte)
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600">2️⃣ Inteligência Artificial</h4>
              <p className="text-sm text-gray-600">
                Se as regras não tiverem confiança alta, usa IA com LiteLLM + Gemini
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-600">3️⃣ Resultado Combinado</h4>
              <p className="text-sm text-gray-600">
                Retorna a melhor categoria com base em regras e IA
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestSimpleAgent;