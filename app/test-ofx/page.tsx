'use client';

import { useState } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OFXParserService, ParsedOFX, ParsedTransaction } from '@/lib/services/ofx-parser.service';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Calendar, DollarSign, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TestOFXPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedOFX | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const ofxParser = new OFXParserService();

  // Testar com o arquivo OFX real
  const testRealFile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Ler o arquivo OFX real
      const response = await fetch('/Extrato-01-06-2025-a-30-09-2025-OFX.ofx');
      const ofxData = await response.text();

      console.log('Dados brutos do OFX:', ofxData.substring(0, 500) + '...');

      // Parse do OFX
      const parsed = await ofxParser.parseFromString(ofxData);
      console.log('Dados parseados:', parsed);

      setParsedData(parsed);

      // Analisar dados
      const analysisResult = ofxParser.analyzeOFXData(parsed);
      console.log('Análise:', analysisResult);

      setAnalysis(analysisResult);

      toast({
        title: 'OFX Parseado com Sucesso!',
        description: `Foram encontradas ${analysisResult.totalTransactions} transações.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao testar OFX:', err);

      toast({
        title: 'Erro ao Processar OFX',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().includes('.ofx')) {
      toast({
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo .ofx',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsed = await ofxParser.parseFile(file);
      setParsedData(parsed);

      const analysisResult = ofxParser.analyzeOFXData(parsed);
      setAnalysis(analysisResult);

      toast({
        title: 'Arquivo Processado!',
        description: `${file.name} contém ${analysisResult.totalTransactions} transações.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setError(errorMessage);

      toast({
        title: 'Erro no Upload',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Testador OFX</h1>
            <p className="text-muted-foreground">
              Teste o parser de arquivos OFX com dados reais
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testRealFile}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isLoading ? 'Processando...' : 'Testar Arquivo Real'}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button disabled={isLoading} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload OFX
              </Button>
            </div>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Processando arquivo OFX...</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {parsedData && !isLoading && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="account">Dados da Conta</TabsTrigger>
              <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Transações */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{analysis?.totalTransactions}</p>
                        <p className="text-sm text-muted-foreground">Transações</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Créditos */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {analysis?.credits.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Créditos</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Débitos */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {analysis?.debits.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Débitos</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Saldo */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(analysis?.netBalance || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estatísticas Detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Valores Totais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Créditos:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(analysis?.totalCredits || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Débitos:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(analysis?.totalDebits || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Média por Transação:</span>
                        <span className="font-medium">
                          {formatCurrency(analysis?.averageTransaction || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Período do Extrato</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Início: {formatDate(analysis?.dateRange.earliest)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Fim: {formatDate(analysis?.dateRange.latest)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Destinos Frequentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis?.frequentDestinations?.slice(0, 5).map((dest: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm truncate">{dest.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {dest.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transações */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transações ({analysis?.totalTransactions})</CardTitle>
                </CardHeader>
                <CardContent>
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
                      {parsedData?.transactions.map((tx, index) => (
                        <TableRow key={index}>
                          <TableCell>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dados da Conta */}
            <TabsContent value="account">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Bancárias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Banco</p>
                        <p className="font-medium">{parsedData.accountInfo.bankId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Agência</p>
                        <p className="font-medium">{parsedData.accountInfo.branchId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conta</p>
                        <p className="font-medium">{parsedData.accountInfo.accountId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo</p>
                        <p className="font-medium">{parsedData.accountInfo.accountType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Moeda</p>
                        <p className="font-medium">{parsedData.accountInfo.currency}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Extrato</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Extrato</p>
                        <Badge variant="outline">
                          {parsedData.type === 'BANK' ? 'Bancário' : 'Cartão de Crédito'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Final</p>
                        <p className="font-medium text-lg">
                          {formatCurrency(parsedData.balance.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data do Saldo</p>
                        <p className="font-medium">
                          {formatDate(parsedData.balance.date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Dados Brutos */}
            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Brutos do OFX</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Headers</h3>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                        {JSON.stringify(parsedData.headers, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Conteúdo Estruturado</h3>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(parsedData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}