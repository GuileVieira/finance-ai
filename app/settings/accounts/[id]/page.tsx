'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccountForm } from '@/components/accounts/account-form';
import { mockAccounts, getAccountTypeLabel, formatCurrency } from '@/lib/mock-accounts';
import { BankAccount, BankAccountFormData, supportedBanks } from '@/lib/types/accounts';
import { ArrowLeft, Edit, Download, Calendar, CreditCard, TrendingUp, TrendingDown, DollarSign, Activity, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock transactions para a conta
const generateMockTransactions = (accountId: string) => {
  const transactions = [];
  const account = mockAccounts.find(acc => acc.id === accountId);

  if (!account) return [];

  // Gerar transações mock dos últimos 30 dias
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 2);

    const isCredit = Math.random() > 0.4;
    const amount = Math.floor(Math.random() * 5000) + 100;

    transactions.push({
      id: `tx-${accountId}-${i}`,
      description: isCredit
        ? `Recebimento Cliente ${i + 1}`
        : `Pagamento Fornecedor ${i + 1}`,
      amount,
      type: isCredit ? 'credit' : 'debit',
      date: date.toISOString().split('T')[0],
      category: isCredit ? 'Vendas' : 'Custos',
      balance_after: account.current_balance + (Math.random() - 0.5) * 10000,
      status: 'completed'
    });
  }

  return transactions;
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const foundAccount = mockAccounts.find(acc => acc.id === accountId);
    if (foundAccount) {
      setAccount(foundAccount);
      setTransactions(generateMockTransactions(accountId));
    } else {
      router.push('/settings/accounts');
    }
  }, [accountId, router]);

  if (!account) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <p>Carregando...</p>
        </div>
      </LayoutWrapper>
    );
  }

  // Calcular estatísticas
  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredits - totalDebits;
  const transactionCount = transactions.length;

  const handleUpdateAccount = (updatedAccount: BankAccountFormData) => {
    setAccount({
      ...account,
      ...updatedAccount,
      updated_at: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
    toast({
      title: 'Conta Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);

    // Simular sincronização
    await new Promise(resolve => setTimeout(resolve, 2000));

    setAccount({
      ...account,
      last_sync_at: new Date().toISOString(),
      // Simular pequena variação no saldo
      current_balance: account.current_balance + (Math.random() - 0.5) * 2000
    });

    setIsSyncing(false);
    toast({
      title: 'Sincronização Concluída',
      description: 'A conta foi sincronizada com sucesso!',
    });
  };

  const handleExport = () => {
    toast({
      title: 'Exportação Iniciada',
      description: 'O extrato está sendo gerado...',
    });
  };

  const getBankInfo = (bankCode: string) => {
    return supportedBanks.find(bank => bank.code === bankCode);
  };

  const bankInfo = getBankInfo(account.bank_code);

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings/accounts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: bankInfo?.color || '#6B7280' }}
              />
              <div>
                <h1 className="text-2xl font-bold">{account.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{account.bank_name}</span>
                  <Badge variant="outline">
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                  <Badge variant={account.active ? 'default' : 'secondary'}>
                    {account.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing || !account.active}
            >
              <Sync className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Conta</DialogTitle>
                </DialogHeader>
                <AccountForm
                  initialData={account}
                  onSave={handleUpdateAccount}
                  onCancel={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Banco</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: bankInfo?.color || '#6B7280' }}
                  />
                  <p className="font-medium">{account.bank_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Agência</p>
                <p className="font-medium">{account.agency_number || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Número da Conta</p>
                <p className="font-medium font-mono">{account.account_number}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="mt-1">
                  {getAccountTypeLabel(account.account_type)}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={account.active ? 'default' : 'secondary'} className="mt-1">
                  {account.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Saldo e Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Saldo e Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(account.current_balance)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-lg font-medium">
                  {formatCurrency(account.opening_balance)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Variação</p>
                <div className="flex items-center gap-2">
                  {account.current_balance > account.opening_balance ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <p className={`font-medium ${
                    account.current_balance > account.opening_balance
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {account.current_balance > account.opening_balance ? '+' : ''}
                    {formatCurrency(account.current_balance - account.opening_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status e Sincronização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status e Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-medium">
                  {new Date(account.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="font-medium">
                  {new Date(account.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Última Sincronização</p>
                <p className="font-medium">
                  {account.last_sync_at
                    ? new Date(account.last_sync_at).toLocaleDateString('pt-BR') + ' ' +
                      new Date(account.last_sync_at).toLocaleTimeString('pt-BR')
                    : 'Nunca sincronizada'
                  }
                </p>
              </div>

              {!account.last_sync_at && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Conta nunca sincronizada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo de Transações */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{transactionCount}</p>
                  <p className="text-sm text-muted-foreground">Transações</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalCredits)}
                  </p>
                  <p className="text-sm text-muted-foreground">Entradas</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalDebits)}
                  </p>
                  <p className="text-sm text-muted-foreground">Saídas</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${
                    netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(netBalance)}
                  </p>
                  <p className="text-sm text-muted-foreground">Saldo no Período</p>
                </div>
                <DollarSign className={`h-8 w-8 ${
                  netBalance >= 0 ? 'text-green-500' : 'text-red-500'
                }`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Transações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma transação encontrada.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions
                    .slice(0, 10)
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(transaction.balance_after)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>

            {transactions.length > 10 && (
              <div className="text-center mt-4">
                <Button variant="outline">
                  Ver Todas as Transações
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}