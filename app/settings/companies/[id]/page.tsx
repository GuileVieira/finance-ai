'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CompanyForm } from '@/components/companies/company-form';
import { mockCompanies } from '@/lib/mock-companies';
import { Company, CompanyFormData } from '@/lib/types/companies';
import { getIndustryLabel, getRevenueRangeLabel, formatCNPJ } from '@/lib/types/companies';
import { ArrowLeft, Edit, Building2, Mail, Phone, MapPin, Calendar, TrendingUp, DollarSign, Users, FileText, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock dados relacionados à empresa
const generateCompanyStats = (companyId: string) => {
  return {
    totalAccounts: Math.floor(Math.random() * 5) + 1,
    totalTransactions: Math.floor(Math.random() * 1000) + 500,
    totalCategories: Math.floor(Math.random() * 20) + 10,
    totalUsers: Math.floor(Math.random() * 10) + 1,
    monthlyTransactions: Math.floor(Math.random() * 100) + 50,
    totalBalance: Math.floor(Math.random() * 500000) + 100000,
    lastTransaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  };
};

const generateRelatedAccounts = (companyId: string) => {
  const accounts = [];
  const bankNames = ['Banco do Brasil', 'Itaú', 'Bradesco', 'NuBank'];

  for (let i = 0; i < 3; i++) {
    accounts.push({
      id: `acc-${companyId}-${i}`,
      name: `Conta ${i + 1}`,
      bank_name: bankNames[i],
      account_type: i === 0 ? 'checking' : i === 1 ? 'savings' : 'investment',
      balance: Math.floor(Math.random() * 100000) + 10000,
      last_sync: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    });
  }

  return accounts;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const foundCompany = mockCompanies.find(comp => comp.id === companyId);
    if (foundCompany) {
      setCompany(foundCompany);
      setStats(generateCompanyStats(companyId));
      setAccounts(generateRelatedAccounts(companyId));
    } else {
      router.push('/settings/companies');
    }
  }, [companyId, router]);

  if (!company || !stats) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <p>Carregando...</p>
        </div>
      </LayoutWrapper>
    );
  }

  const handleUpdateCompany = (updatedCompany: CompanyFormData) => {
    setCompany({
      ...company,
      ...updatedCompany,
      updated_at: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
    toast({
      title: 'Empresa Atualizada',
      description: 'As alterações foram salvas com sucesso!',
    });
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
                    {getIndustryLabel(company.industry)}
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
                  {getIndustryLabel(company.industry)}
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
                        {account.bank_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {account.account_type === 'checking' ? 'Corrente' :
                           account.account_type === 'savings' ? 'Poupança' : 'Investimento'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell>
                        {formatDate(account.last_sync.toISOString())}
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
                  {formatDate(stats.lastTransaction.toISOString())}
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