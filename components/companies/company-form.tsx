'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyFormData, Company, industries, revenueRanges, validateCNPJ, formatCNPJ, formatCEP } from '@/lib/types/companies';
import { states } from '@/lib/mock-companies';

interface CompanyFormProps {
  initialData?: Partial<Company>;
  onSave: (data: CompanyFormData) => void;
  onCancel: () => void;
}

export function CompanyForm({ initialData, onSave, onCancel }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: initialData?.name || '',
    cnpj: initialData?.cnpj || '',
    corporate_name: initialData?.corporate_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip_code: initialData?.zip_code || '',
    logo_url: initialData?.logo_url || '',
    industry: initialData?.industry || '',
    monthly_revenue_range: initialData?.monthly_revenue_range || 0,
    active: initialData?.active ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formulário
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    }

    if (!formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!formData.corporate_name.trim()) {
      newErrors.corporate_name = 'Razão social é obrigatória';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(formData);
  };

  const handleInputChange = (field: keyof CompanyFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    handleInputChange('cnpj', formatted);
  };

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    handleInputChange('zip_code', formatted);
  };

  const handlePhoneChange = (value: string) => {
    // Formatar telefone (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 11) {
      const formatted = phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
      handleInputChange('phone', formatted);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome Fantasia */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome Fantasia *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Tech Solutions Ltda"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Razão Social */}
          <div className="space-y-2">
            <Label htmlFor="corporate_name">Razão Social *</Label>
            <Input
              id="corporate_name"
              value={formData.corporate_name}
              onChange={(e) => handleInputChange('corporate_name', e.target.value)}
              placeholder="Ex: Tech Solutions Desenvolvimento de Software Ltda"
              className={errors.corporate_name ? 'border-red-500' : ''}
            />
            {errors.corporate_name && (
              <p className="text-sm text-red-500">{errors.corporate_name}</p>
            )}
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => handleCNPJChange(e.target.value)}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={errors.cnpj ? 'border-red-500' : ''}
            />
            {errors.cnpj && (
              <p className="text-sm text-red-500">{errors.cnpj}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Digite apenas os números do CNPJ
            </p>
          </div>

          {/* Segmento */}
          <div className="space-y-2">
            <Label htmlFor="industry">Segmento de Atuação</Label>
            <Select
              value={formData.industry}
              onValueChange={(value) => handleInputChange('industry', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o segmento" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    <div>
                      <div className="font-medium">{industry.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {industry.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Faturamento Mensal */}
          <div className="space-y-2">
            <Label htmlFor="monthly_revenue_range">Faturamento Mensal</Label>
            <Select
              value={formData.monthly_revenue_range?.toString()}
              onValueChange={(value) => {
                const range = revenueRanges.find(r => r.value === value);
                handleInputChange('monthly_revenue_range', range?.max || 0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a faixa de faturamento" />
              </SelectTrigger>
              <SelectContent>
                {revenueRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações de Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="contato@empresa.com.br"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code || ''}
                onChange={(e) => handleCEPChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="São Paulo"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange('state', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logo_url">URL da Logo (Opcional)</Label>
            <Input
              id="logo_url"
              value={formData.logo_url || ''}
              onChange={(e) => handleInputChange('logo_url', e.target.value)}
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => handleInputChange('active', checked)}
            />
            <Label htmlFor="active">Empresa ativa</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Empresas inativas não aparecerão nos relatórios e análises
          </p>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome Fantasia:</span>
              <span className="font-medium">{formData.name || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Razão Social:</span>
              <span className="font-medium">{formData.corporate_name || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CNPJ:</span>
              <span className="font-medium">{formData.cnpj || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segmento:</span>
              <Badge variant="outline">
                {industries.find(i => i.value === formData.industry)?.label || 'Não selecionado'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faturamento:</span>
              <Badge variant="outline">
                {revenueRanges.find(r => r.max === formData.monthly_revenue_range)?.label || 'Não informado'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={formData.active ? 'default' : 'secondary'}>
                {formData.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {initialData?.id ? 'Salvar Alterações' : 'Criar Empresa'}
        </Button>
      </div>
    </form>
  );
}