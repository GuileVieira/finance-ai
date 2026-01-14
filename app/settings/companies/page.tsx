'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyForm } from '@/components/companies/company-form';
import { Company, CompanyFormData } from '@/lib/types/companies';
import { getIndustryLabel, getRevenueRangeLabel, formatCNPJ, revenueRanges } from '@/lib/types/companies';
import { Plus, Edit, Trash2, Search, Filter, Eye, ArrowLeft, Building2, TrendingUp, DollarSign, MapPin, Mail, Phone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Tipo para resposta da API (camelCase)
interface CompanyApiResponse {
  id: string;
  name: string;
  cnpj: string;
  corporateName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  logoUrl: string | null;
  industry: string | null;
  monthlyRevenueRange: string | number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  calculatedRevenue?: number;
}

// Converter de camelCase (API) para snake_case (frontend)
function mapApiToFrontend(apiCompany: CompanyApiResponse): Company {
  return {
    id: apiCompany.id,
    name: apiCompany.name,
    cnpj: apiCompany.cnpj,
    corporate_name: apiCompany.corporateName || apiCompany.name,
    phone: apiCompany.phone || undefined,
    email: apiCompany.email || undefined,
    address: apiCompany.address || undefined,
    city: apiCompany.city || undefined,
    state: apiCompany.state || undefined,
    zip_code: apiCompany.zipCode || undefined,
    logo_url: apiCompany.logoUrl || undefined,
    industry: apiCompany.industry || undefined,
    monthly_revenue_range: apiCompany.monthlyRevenueRange ? Number(apiCompany.monthlyRevenueRange) : undefined,
    created_at: apiCompany.createdAt,
    updated_at: apiCompany.updatedAt,
    active: apiCompany.active,
    created_by: 'system',
    calculated_revenue: apiCompany.calculatedRevenue,
  };
}

// Converter de snake_case (frontend) para camelCase (API)
function mapFrontendToApi(formData: CompanyFormData) {
  return {
    name: formData.name,
    cnpj: formData.cnpj.replace(/\D/g, ''),
    corporateName: formData.corporate_name,
    phone: formData.phone,
    email: formData.email,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.zip_code,
    logoUrl: formData.logo_url,
    industry: formData.industry,
    monthlyRevenueRange: formData.monthly_revenue_range,
    active: formData.active ?? true,
  };
}

export default function SettingsCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { toast } = useToast();

  // Buscar empresas da API
  useEffect(() => {
    async function fetchCompanies() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/companies');
        const result = await response.json();
        if (result.success && result.data?.companies) {
          const mappedCompanies = result.data.companies.map(mapApiToFrontend);
          setCompanies(mappedCompanies);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as empresas.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchCompanies();
  }, [toast]);

  // Filtrar empresas
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.corporate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm.replace(/\D/g, '')) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = filterIndustry === 'all' || company.industry === filterIndustry;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && company.active) ||
      (filterStatus === 'inactive' && !company.active);
    const matchesState = filterState === 'all' || company.state === filterState;

    return matchesSearch && matchesIndustry && matchesStatus && matchesState;
  });

  // Criar nova empresa
  const handleCreateCompany = async (data: CompanyFormData) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFrontendToApi(data)),
      });

      const result = await response.json();

      if (result.success && result.data?.company) {
        const newCompany = mapApiToFrontend(result.data.company);
        setCompanies(prev => [...prev, newCompany]);
        setIsCreateDialogOpen(false);

        toast({
          title: 'Empresa Criada',
          description: `${newCompany.name} foi adicionada com sucesso!`,
        });
      } else {
        throw new Error(result.error || 'Erro ao criar empresa');
      }
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a empresa.',
        variant: 'destructive',
      });
    }
  };

  // Editar empresa
  const handleEditCompany = async (data: CompanyFormData) => {
    if (!editingCompany) return;

    try {
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFrontendToApi(data)),
      });

      const result = await response.json();

      if (result.success && result.data?.company) {
        const updatedCompany = mapApiToFrontend(result.data.company);
        setCompanies(prev => prev.map(comp =>
          comp.id === editingCompany.id ? updatedCompany : comp
        ));
        setEditingCompany(null);

        toast({
          title: 'Empresa Atualizada',
          description: 'As alterações foram salvas com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro ao atualizar empresa');
      }
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a empresa.',
        variant: 'destructive',
      });
    }
  };

  // Excluir empresa (soft delete via API)
  const handleDeleteCompany = async (companyId: string) => {
    const company = companies.find(comp => comp.id === companyId);
    if (!company) return;

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar lista local - a API faz soft delete (desativa)
        setCompanies(prev => prev.map(comp =>
          comp.id === companyId ? { ...comp, active: false } : comp
        ));

        toast({
          title: 'Empresa Desativada',
          description: `${company.name} foi desativada com sucesso!`,
        });
      } else {
        throw new Error(result.error || 'Erro ao desativar empresa');
      }
    } catch (error) {
      console.error('Erro ao desativar empresa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível desativar a empresa.',
        variant: 'destructive',
      });
    }
  };

  // Toggle status ativo/inativo
  const handleToggleActive = async (companyId: string) => {
    const company = companies.find(comp => comp.id === companyId);
    if (!company) return;

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !company.active }),
      });

      const result = await response.json();

      if (result.success) {
        setCompanies(prev => prev.map(comp =>
          comp.id === companyId
            ? { ...comp, active: !comp.active, updated_at: new Date().toISOString() }
            : comp
        ));
      } else {
        throw new Error(result.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da empresa.',
        variant: 'destructive',
      });
    }
  };

  // Calcular estatísticas
  const totalRevenue = companies
    .filter(comp => comp.active)
    .reduce((sum, comp) => sum + (comp.calculated_revenue || 0), 0);

  const activeCompanies = companies.filter(comp => comp.active).length;
  const totalStates = new Set(companies.map(comp => comp.state)).size;
  const totalIndustries = new Set(companies.map(comp => comp.industry)).size;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
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
            <h1 className="text-2xl font-bold">Empresas</h1>
            <p className="text-muted-foreground">
              Gerencie as empresas e configure multitenancy
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-tutorial="new-company-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Empresa</DialogTitle>
              </DialogHeader>
              <CompanyForm
                onSave={handleCreateCompany}
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
                  <p className="text-2xl font-bold">{activeCompanies}</p>
                  <p className="text-sm text-muted-foreground">Empresas Ativas</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalStates}</p>
                  <p className="text-sm text-muted-foreground">Estados</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalIndustries}</p>
                  <p className="text-sm text-muted-foreground">Segmentos</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
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
                  <Label htmlFor="search-companies" className="sr-only">
                    Buscar empresas
                  </Label>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-companies"
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    aria-describedby="search-companies-hint"
                  />
                  <span id="search-companies-hint" className="sr-only">Digite para filtrar empresas por nome, CNPJ ou email</span>
                </div>
              </div>

              <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os segmentos</SelectItem>
                  <SelectItem value="technology">Tecnologia</SelectItem>
                  <SelectItem value="retail">Varejo</SelectItem>
                  <SelectItem value="services">Serviços</SelectItem>
                  <SelectItem value="manufacturing">Indústria</SelectItem>
                  <SelectItem value="construction">Construção</SelectItem>
                  <SelectItem value="consulting">Consultoria</SelectItem>
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

              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                  <SelectItem value="DF">Distrito Federal</SelectItem>
                  <SelectItem value="PR">Paraná</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Empresas */}
        <Card>
          <CardHeader>
            <CardTitle>
              Empresas ({filteredCompanies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Carregando empresas...</span>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma empresa encontrada.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id} className={!company.active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCNPJ(company.cnpj)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {company.corporate_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {getIndustryLabel(company.industry || '')}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {company.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{company.email}</span>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {company.city && <p>{company.city}</p>}
                          {company.state && (
                            <p className="text-muted-foreground">{company.state}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="text-sm">
                          <p className="font-medium">
                            {company.calculated_revenue
                              ? formatCurrency(company.calculated_revenue)
                              : 'R$ 0,00'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Meta: {company.monthly_revenue_range
                              ? getRevenueRangeLabel(
                                revenueRanges.find(r => r.max === company.monthly_revenue_range)?.value || ''
                              )
                              : 'Não informado'
                            }
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={company.active ? 'default' : 'secondary'}>
                          {company.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/settings/companies/${company.id}`}>
                            <Button variant="outline" size="sm" aria-label={`Visualizar detalhes da empresa ${company.name}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Dialog open={editingCompany?.id === company.id} onOpenChange={(open) => !open && setEditingCompany(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCompany(company)}
                                aria-label={`Editar empresa ${company.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Editar Empresa</DialogTitle>
                              </DialogHeader>
                              {editingCompany && (
                                <CompanyForm
                                  initialData={editingCompany}
                                  onSave={handleEditCompany}
                                  onCancel={() => setEditingCompany(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(company.id)}
                          >
                            {company.active ? 'Desativar' : 'Ativar'}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                aria-label={`Excluir empresa ${company.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a empresa &quot;{company.name}&quot;?
                                  Esta ação desativará a empresa e não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCompany(company.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}