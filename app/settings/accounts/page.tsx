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
import { accountTypes, getAccountTypeLabel, formatCurrency } from '@/lib/mock-accounts';
import { BankAccount, BankAccountFormData, supportedBanks, getBankByCode, getBankName, getBankColor } from '@/lib/types/accounts';
import { Plus, Edit, Trash2, Search, Filter, Eye, ArrowLeft, CreditCard, RefreshCw, TrendingUp, Loader2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Tipo para resposta da API (camelCase)
interface AccountApiResponse {
  id: string;
  companyId: string;
  name: string;
  bankName: string;
  bankCode: string | null;
  agencyNumber: string | null;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'investment';
  openingBalance: number;
  currentBalance?: number; // Saldo calculado das transações
  active: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  companyCnpj?: string;
}

// Converter de camelCase (API) para snake_case (frontend)
function mapApiToFrontend(apiAccount: AccountApiResponse): BankAccount {
  const openingBalance = Number(apiAccount.openingBalance) || 0;
  // Usar currentBalance da API se disponível, senão usar openingBalance
  const currentBalance = apiAccount.currentBalance !== undefined
    ? Number(apiAccount.currentBalance)
    : openingBalance;

  return {
    id: apiAccount.id,
    company_id: apiAccount.companyId,
    name: apiAccount.name,
    bank_name: apiAccount.bankName,
    bank_code: apiAccount.bankCode || '',
    agency_number: apiAccount.agencyNumber || undefined,
    account_number: apiAccount.accountNumber,
    account_type: apiAccount.accountType.toLowerCase() as 'checking' | 'savings' | 'investment',
    opening_balance: openingBalance,
    current_balance: currentBalance,
    created_at: apiAccount.createdAt,
    updated_at: apiAccount.updatedAt,
    active: apiAccount.active,
    last_sync_at: apiAccount.lastSyncAt || undefined,
  };
}

// Converter de snake_case (frontend) para camelCase (API)
function mapFrontendToApi(formData: BankAccountFormData, defaultCompanyId: string) {
  return {
    companyId: formData.company_id || defaultCompanyId,
    name: formData.name,
    bankName: formData.bank_name,
    bankCode: formData.bank_code,
    agencyNumber: formData.agency_number,
    accountNumber: formData.account_number,
    accountType: formData.account_type,
    openingBalance: formData.opening_balance,
    active: formData.active ?? true,
  };
}

export default function SettingsAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const { toast } = useToast();

  // Buscar empresas e companyId
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await fetch('/api/companies');
        const result = await response.json();
        if (result.success && result.data?.companies) {
          // Guardar todas as empresas para o select do formulário
          setAvailableCompanies(result.data.companies.map((c: any) => ({
            id: c.id,
            name: c.name
          })));

          if (result.data.companies.length > 0) {
            setCompanyId(result.data.companies[0].id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      }
    }
    fetchCompanies();
  }, []);

  // Buscar contas da API
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/accounts');
        const result = await response.json();
        if (result.success && result.data?.accounts) {
          const mappedAccounts = result.data.accounts.map(mapApiToFrontend);
          setAccounts(mappedAccounts);
        }
      } catch (error) {
        console.error('Erro ao buscar contas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as contas.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAccounts();
  }, [toast]);

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
  const handleCreateAccount = async (data: BankAccountFormData) => {
    if (!companyId) {
      toast({
        title: 'Erro',
        description: 'Nenhuma empresa configurada. Configure uma empresa primeiro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFrontendToApi(data, companyId)),
      });

      const result = await response.json();

      if (result.success && result.data?.account) {
        const newAccount = mapApiToFrontend(result.data.account);
        setAccounts(prev => [...prev, newAccount]);
        setIsCreateDialogOpen(false);

        toast({
          title: 'Conta Criada',
          description: `${newAccount.name} foi adicionada com sucesso!`,
        });
      } else {
        throw new Error(result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a conta.',
        variant: 'destructive',
      });
    }
  };

  // Editar conta
  const handleEditAccount = async (data: BankAccountFormData) => {
    if (!editingAccount || !companyId) return;

    try {
      const response = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFrontendToApi(data, companyId)),
      });

      const result = await response.json();

      if (result.success && result.data?.account) {
        const updatedAccount = mapApiToFrontend(result.data.account);
        setAccounts(prev => prev.map(acc =>
          acc.id === editingAccount.id ? updatedAccount : acc
        ));
        setEditingAccount(null);

        toast({
          title: 'Conta Atualizada',
          description: 'As alterações foram salvas com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro ao atualizar conta');
      }
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a conta.',
        variant: 'destructive',
      });
    }
  };

  // Excluir conta (soft delete via API)
  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar lista local - a API faz soft delete (desativa)
        setAccounts(prev => prev.map(acc =>
          acc.id === accountId ? { ...acc, active: false } : acc
        ));

        toast({
          title: 'Conta Desativada',
          description: `${account.name} foi desativada com sucesso!`,
        });
      } else {
        throw new Error(result.error || 'Erro ao desativar conta');
      }
    } catch (error) {
      console.error('Erro ao desativar conta:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível desativar a conta.',
        variant: 'destructive',
      });
    }
  };

  // Toggle status ativo/inativo
  const handleToggleActive = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !account.active }),
      });

      const result = await response.json();

      if (result.success) {
        setAccounts(prev => prev.map(acc =>
          acc.id === accountId
            ? { ...acc, active: !acc.active, updated_at: new Date().toISOString() }
            : acc
        ));
      } else {
        throw new Error(result.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da conta.',
        variant: 'destructive',
      });
    }
  };

  // Sincronizar conta
  const handleSyncAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncAt: new Date().toISOString() }),
      });

      const result = await response.json();

      if (result.success) {
        setAccounts(prev => prev.map(acc =>
          acc.id === accountId
            ? { ...acc, last_sync_at: new Date().toISOString() }
            : acc
        ));

        toast({
          title: 'Sincronização Concluída',
          description: `${account.name} foi sincronizada com sucesso!`,
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar a conta.',
        variant: 'destructive',
      });
    }
  };

  // Calcular estatísticas
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.active ? acc.current_balance : 0), 0);
  const activeAccounts = accounts.filter(acc => acc.active).length;
  const lastSyncDate = accounts
    .filter(acc => acc.last_sync_at)
    .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0]?.last_sync_at;

  // Usar a função do serviço de bancos
  const getBankInfo = (bankCode: string) => {
    const bank = getBankByCode(bankCode);
    if (bank) {
      return { code: bank.code, name: bank.shortName, color: bank.color };
    }
    return { code: bankCode, name: 'Banco Não Identificado', color: '#6B7280' };
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
              <Button data-tutorial="new-account-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
              </DialogHeader>
              <AccountForm
                companies={availableCompanies}
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
                  <p className="text-2xl font-bold">{accounts.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Contas</p>
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
                <RefreshCw className="h-8 w-8 text-orange-500" />
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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Carregando contas...</span>
              </div>
            ) : filteredAccounts.length === 0 ? (
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
                              style={{ backgroundColor: bankInfo.color }}
                            />
                            <div>
                              <p className="font-medium">{bankInfo.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Código: {account.bank_code}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {getAccountTypeLabel(account.account_type.toLowerCase())}
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
                              <p className={`text-xs ${account.current_balance > account.opening_balance
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
                              <RefreshCw className="h-4 w-4" />
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
                                    companies={availableCompanies}
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