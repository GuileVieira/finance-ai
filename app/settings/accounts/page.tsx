'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountForm } from '@/components/accounts/account-form';
import { mockAccounts, accountTypes, getAccountTypeLabel, formatCurrency } from '@/lib/mock-accounts';
import { BankAccount, BankAccountFormData } from '@/lib/types/accounts';
import { supportedBanks } from '@/lib/types/accounts';
import { Plus, Edit, Trash2, Search, Filter, Eye, ArrowLeft, CreditCard, Sync, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SettingsAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>(mockAccounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const { toast } = useToast();

  // Filtrar contas
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.account_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || account.account_type === filterType;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && account.active) ||
                         (filterStatus === 'inactive' && !account.active);
    const matchesBank = filterBank === 'all' || account.bank_code === filterBank;

    return matchesSearch && matchesType && matchesStatus && matchesBank;
  });

  // Criar nova conta
  const handleCreateAccount = (data: BankAccountFormData) => {
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      company_id: '1',
      name: data.name,
      bank_name: data.bank_name,
      bank_code: data.bank_code,
      agency_number: data.agency_number,
      account_number: data.account_number,
      account_type: data.account_type,
      opening_balance: data.opening_balance,
      current_balance: data.opening_balance,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: data.active ?? true
    };

    setAccounts(prev => [...prev, newAccount]);
    setIsCreateDialogOpen(false);

    toast({
      title: 'Conta Criada',
      description: `${newAccount.name} foi adicionada com sucesso!`,
    });
  };

  // Editar conta
  const handleEditAccount = (data: BankAccountFormData) => {
    if (!editingAccount) return;

    setAccounts(prev => prev.map(acc =>
      acc.id === editingAccount.id
        ? { ...acc, ...data, updated_at: new Date().toISOString() }
        : acc
    ));

    setEditingAccount(null);

    toast({
      title: 'Conta Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
  };

  // Excluir conta
  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    setAccounts(prev => prev.filter(acc => acc.id !== accountId));

    toast({
      title: 'Conta Excluída',
      description: `${account.name} foi removida com sucesso!`,
    });
  };

  // Toggle status ativo/inativo
  const handleToggleActive = (accountId: string) => {
    setAccounts(prev => prev.map(acc =>
      acc.id === accountId
        ? { ...acc, active: !acc.active, updated_at: new Date().toISOString() }
        : acc
    ));
  };

  // Sincronizar conta
  const handleSyncAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    // Simular sincronização
    setAccounts(prev => prev.map(acc =>
      acc.id === accountId
        ? {
            ...acc,
            last_sync_at: new Date().toISOString(),
            // Simular pequena variação no saldo
            current_balance: acc.current_balance + (Math.random() - 0.5) * 1000
          }
        : acc
    ));

    toast({
      title: 'Sincronização Concluída',
      description: `${account.name} foi sincronizada com sucesso!`,
    });
  };

  // Calcular estatísticas
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.active ? acc.current_balance : 0), 0);
  const activeAccounts = accounts.filter(acc => acc.active).length;
  const totalTransactions = Math.floor(Math.random() * 1000) + 500; // Mock
  const lastSyncDate = accounts
    .filter(acc => acc.last_sync_at)
    .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0]?.last_sync_at;

  const getBankInfo = (bankCode: string) => {
    return supportedBanks.find(bank => bank.code === bankCode);
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
            <h1 className="text-2xl font-bold">Contas Bancárias</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas bancárias e sincronize extratos
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
              </DialogHeader>
              <AccountForm
                onSave={handleCreateAccount}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                  <p className="text-sm text-muted-foreground">Saldo Total</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{activeAccounts}</p>
                  <p className="text-sm text-muted-foreground">Contas Ativas</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
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
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">
                    {lastSyncDate
                      ? new Date(lastSyncDate).toLocaleDateString('pt-BR')
                      : 'Nunca'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Última Sincronização</p>
                </div>
                <Sync className="h-8 w-8 text-orange-500" />
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
                    placeholder="Buscar contas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {supportedBanks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contas */}
        <Card>
          <CardHeader>
            <CardTitle>
              Contas ({filteredAccounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma conta encontrada.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agência/Conta</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Sincronização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const bankInfo = getBankInfo(account.bank_code);
                    return (
                      <TableRow key={account.id} className={!account.active ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Criada em {new Date(account.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: bankInfo?.color || '#6B7280' }}
                            />
                            <div>
                              <p className="font-medium">{account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Código: {account.bank_code}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {getAccountTypeLabel(account.account_type)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-mono">
                            {account.agency_number && <div>Ag: {account.agency_number}</div>}
                            <div>CC: {account.account_number}</div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div>
                            <p className="font-bold text-lg">
                              {formatCurrency(account.current_balance)}
                            </p>
                            {account.current_balance !== account.opening_balance && (
                              <p className={`text-xs ${
                                account.current_balance > account.opening_balance
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {account.current_balance > account.opening_balance ? '+' : ''}
                                {formatCurrency(account.current_balance - account.opening_balance)}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={account.active ? 'default' : 'secondary'}>
                            {account.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {account.last_sync_at ? (
                              <>
                                <p>{new Date(account.last_sync_at).toLocaleDateString('pt-BR')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(account.last_sync_at).toLocaleTimeString('pt-BR')}
                                </p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">Nunca</p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncAccount(account.id)}
                              disabled={!account.active}
                            >
                              <Sync className="h-4 w-4" />
                            </Button>

                            <Link href={`/settings/accounts/${account.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            <Dialog open={editingAccount?.id === account.id} onOpenChange={(open) => !open && setEditingAccount(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingAccount(account)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Editar Conta</DialogTitle>
                                </DialogHeader>
                                {editingAccount && (
                                  <AccountForm
                                    initialData={editingAccount}
                                    onSave={handleEditAccount}
                                    onCancel={() => setEditingAccount(null)}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(account.id)}
                            >
                              {account.active ? 'Desativar' : 'Ativar'}
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir ${account.name}?`)) {
                                  handleDeleteAccount(account.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </LayoutWrapper>
  );
}