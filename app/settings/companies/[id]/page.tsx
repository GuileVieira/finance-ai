'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CompanyForm } from '@/components/companies/company-form';
import { Company, CompanyFormData } from '@/lib/types/companies';
import { getIndustryLabel, formatCNPJ } from '@/lib/types/companies';
import { ArrowLeft, Edit, Building2, Mail, Phone, MapPin, Calendar, TrendingUp, DollarSign, Users, FileText, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface CompanyStats {
  totalAccounts: number;
  totalTransactions: number;
  totalCategories: number;
  totalUsers: number;
  monthlyTransactions: number;
  totalBalance: number;
  lastTransaction: Date | null;
}

interface AccountData {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  openingBalance: number;
  lastSyncAt: string | null;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Buscar dados da empresa da API
  const fetchCompanyData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}`);
      const result = await response.json();

      if (!result.success) {
        toast({
          title: 'Erro',
          description: result.error || 'Empresa não encontrada',
          variant: 'destructive',
        });
        router.push('/settings/companies');
        return;
      }

      // Mapear dados da empresa
      const companyData = result.data.company;
      setCompany({
        id: companyData.id,
        name: companyData.name,
        corporate_name: companyData.corporateName || companyData.name,
        cnpj: companyData.cnpj,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        city: companyData.city,
        state: companyData.state,
        zip_code: companyData.zipCode,
        industry: companyData.industry || 'other',
        monthly_revenue_range: companyData.monthlyRevenueRange,
        active: companyData.active,
        logo_url: companyData.logoUrl,
        created_at: companyData.createdAt,
        updated_at: companyData.updatedAt,
        created_by: companyData.createdBy || '',
      });

      // Mapear contas
      const mappedAccounts: AccountData[] = result.data.accounts.map((acc: Record<string, unknown>) => ({
        id: acc.id as string,
        name: acc.name as string,
        bankName: acc.bankName as string || 'Banco',
        accountType: acc.accountType as string || 'checking',
        openingBalance: acc.openingBalance as number || 0,
        lastSyncAt: acc.lastSyncAt as string | null,
      }));
      setAccounts(mappedAccounts);

      // Calcular estatísticas baseado nos dados reais
      setStats({
        totalAccounts: mappedAccounts.length,
        totalTransactions: 0, // TODO: buscar da API de transações se necessário
        totalCategories: 0,
        totalUsers: 1,
        monthlyTransactions: 0,
        totalBalance: mappedAccounts.reduce((sum, acc) => sum + acc.openingBalance, 0),
        lastTransaction: null,
      });

    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da empresa',
        variant: 'destructive',
      });
      router.push('/settings/companies');
    } finally {
      setLoading(false);
    }
  }, [companyId, router, toast]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando...</span>
        </div>
      </LayoutWrapper>
    );
  }

  if (!company || !stats) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <p>Empresa não encontrada</p>
        </div>
      </LayoutWrapper>
    );
  }

  const handleUpdateCompany = async (updatedData: CompanyFormData) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedData.name,
          corporateName: updatedData.corporate_name,
          email: updatedData.email,
          phone: updatedData.phone,
          address: updatedData.address,
          city: updatedData.city,
          state: updatedData.state,
          zipCode: updatedData.zip_code,
          industry: updatedData.industry,
          active: updatedData.active,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchCompanyData(); // Recarregar dados
        setIsEditDialogOpen(false);
        toast({
          title: 'Empresa Atualizada',
          description: 'As alterações foram salvas com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro ao atualizar');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar empresa',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings/companies">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{company.corporate_name}</span>
                  <Badge variant="outline">
                    {getIndustryLabel(company.industry || 'other')}
                  </Badge>
                  <Badge variant={company.active ? 'default' : 'secondary'}>
                    {company.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Empresa</DialogTitle>
              </DialogHeader>
              <CompanyForm
                initialData={company}
                onSave={handleUpdateCompany}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium">{formatCNPJ(company.cnpj)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Segmento</p>
                <Badge variant="outline" className="mt-1">
                  {getIndustryLabel(company.industry || 'other')}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                <p className="font-medium">
                  {company.monthly_revenue_range
                    ? formatCurrency(company.monthly_revenue_range)
                    : 'Não informado'
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={company.active ? 'default' : 'secondary'} className="mt-1">
                  {company.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                <p className="font-medium">
                  {formatDate(company.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{company.email}</p>
                  </div>
                </div>
              )}

              {company.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{company.phone}</p>
                  </div>
                </div>
              )}

              {company.city && (
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{company.city}</p>
                      {company.state && (
                        <p className="text-sm text-muted-foreground">{company.state}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endereço Completo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">{company.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {company.city && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade</p>
                    <p className="font-medium">{company.city}</p>
                  </div>
                )}

                {company.state && (
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-medium">{company.state}</p>
                  </div>
                )}
              </div>

              {company.zip_code && (
                <div>
                  <p className="text-sm text-muted-foreground">CEP</p>
                  <p className="font-medium">{company.zip_code}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                  <p className="text-sm text-muted-foreground">Contas Bancárias</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  <p className="text-sm text-muted-foreground">Total Transações</p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
                  <p className="text-sm text-muted-foreground">Saldo Total</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contas Bancárias */}
        <Card>
          <CardHeader>
            <CardTitle>Contas Bancárias Vinculadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Última Sincronização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma conta bancária vinculada.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.name}
                      </TableCell>
                      <TableCell>
                        {account.bankName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {account.accountType === 'checking' ? 'Corrente' :
                           account.accountType === 'savings' ? 'Poupança' : 'Investimento'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(account.openingBalance)}
                      </TableCell>
                      <TableCell>
                        {account.lastSyncAt ? formatDate(account.lastSyncAt) : 'Nunca'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {accounts.length > 0 && (
              <div className="text-center mt-4">
                <Button variant="outline">
                  Gerenciar Todas as Contas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Última transação</span>
                </div>
                <span className="font-medium">
                  {stats.lastTransaction ? formatDate(stats.lastTransaction.toISOString()) : 'Nenhuma'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Transações este mês</span>
                </div>
                <span className="font-medium">{stats.monthlyTransactions}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Categorias configuradas</span>
                </div>
                <span className="font-medium">{stats.totalCategories}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}