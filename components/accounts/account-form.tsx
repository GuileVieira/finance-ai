'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BankAccountFormData, BankAccount, supportedBanks } from '@/lib/types/accounts';
import { accountTypes } from '@/lib/mock-accounts';

interface AccountFormProps {
  initialData?: Partial<BankAccount>;
  companies?: { id: string; name: string }[];
  onSave: (data: BankAccountFormData) => void;
  onCancel: () => void;
}

export function AccountForm({ initialData, companies = [], onSave, onCancel }: AccountFormProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    company_id: initialData?.company_id || (companies.length > 0 ? companies[0].id : ''),
    name: initialData?.name || '',
    bank_name: initialData?.bank_name || '',
    bank_code: initialData?.bank_code || '',
    agency_number: initialData?.agency_number || '',
    account_number: initialData?.account_number || '',
    account_type: initialData?.account_type || 'checking',
    opening_balance: initialData?.opening_balance || 0,
    active: initialData?.active ?? true
  });

  useEffect(() => {
    if (formData.bank_code) {
      const bank = supportedBanks.find(b => b.code === formData.bank_code);
      if (bank) {
        setFormData(prev => ({ ...prev, bank_name: bank.name }));
      }
    }
  }, [formData.bank_code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof BankAccountFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: string) => {
    // Remove tudo que não for número
    const numValue = value.replace(/\D/g, '');
    // Converte para número e divide por 100 (para centavos)
    const number = parseInt(numValue) / 100;
    return number;
  };

  const handleCurrencyChange = (value: string) => {
    const number = formatCurrency(value);
    handleInputChange('opening_balance', number);
  };

  const getCurrencyDisplay = () => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(formData.opening_balance);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company_id">Empresa *</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => handleInputChange('company_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome da Conta */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Conta Principal - Empresa"
              required
            />
          </div>

          {/* Tipo de Conta */}
          <div className="space-y-2">
            <Label htmlFor="account_type">Tipo de Conta *</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value: 'checking' | 'savings' | 'investment') =>
                handleInputChange('account_type', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de conta" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Saldo Inicial */}
          <div className="space-y-2">
            <Label htmlFor="opening_balance">Saldo Inicial *</Label>
            <Input
              id="opening_balance"
              type="text"
              value={getCurrencyDisplay()}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              placeholder="R$ 0,00"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Bancários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Banco */}
          <div className="space-y-2">
            <Label htmlFor="bank_code">Banco *</Label>
            <Select
              value={formData.bank_code}
              onValueChange={(value) => handleInputChange('bank_code', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {supportedBanks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: bank.color }}
                      />
                      <div>
                        <div className="font-medium">{bank.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Código: {bank.code}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agência */}
          <div className="space-y-2">
            <Label htmlFor="agency_number">Agência</Label>
            <Input
              id="agency_number"
              value={formData.agency_number || ''}
              onChange={(e) => handleInputChange('agency_number', e.target.value)}
              placeholder="Ex: 1234-5"
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para contas digitais
            </p>
          </div>

          {/* Número da Conta */}
          <div className="space-y-2">
            <Label htmlFor="account_number">Número da Conta *</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) => handleInputChange('account_number', e.target.value)}
              placeholder="Ex: 12345-6"
              required
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
            <Label htmlFor="active">Conta ativa</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Contas inativas não aparecerão nos relatórios e não sincronizarão automaticamente
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
              <span className="text-muted-foreground">Empresa:</span>
              <span className="font-medium">
                {companies.find(c => c.id === formData.company_id)?.name || 'Não selecionada'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{formData.name || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Banco:</span>
              <span className="font-medium">{formData.bank_name || 'Não selecionado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge variant="outline">
                {accountTypes.find(t => t.value === formData.account_type)?.label || 'Não selecionado'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo Inicial:</span>
              <span className="font-medium">{getCurrencyDisplay()}</span>
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
          {initialData?.id ? 'Salvar Alterações' : 'Criar Conta'}
        </Button>
      </div>
    </form>
  );
}