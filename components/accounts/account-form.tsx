'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BankAccountFormData, BankAccount, supportedBanks } from '@/lib/types/accounts';
import { accountSchema, AccountSchema } from '@/lib/schemas/accounts';
import { accountTypes } from '@/lib/mock-accounts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface AccountFormProps {
  initialData?: Partial<BankAccount>;
  companies?: { id: string; name: string }[];
  onSave: (data: BankAccountFormData) => void;
  onCancel: () => void;
}

export function AccountForm({ initialData, companies = [], onSave, onCancel }: AccountFormProps) {
  const { companyId: activeCompanyId } = useAuth();

  const form = useForm<AccountSchema>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      company_id: initialData?.company_id || activeCompanyId || (companies.length > 0 ? companies[0].id : ''),
      name: initialData?.name || '',
      bank_name: initialData?.bank_name || '',
      bank_code: initialData?.bank_code || '',
      agency_number: initialData?.agency_number || '',
      account_number: initialData?.account_number || '',
      account_type: initialData?.account_type || 'checking',
      opening_balance: initialData?.opening_balance || 0,
      active: initialData?.active ?? true
    }
  });

  const { watch, setValue, control, handleSubmit } = form;
  const selectedBankCode = watch('bank_code');
  const selectedOpeningBalance = watch('opening_balance');

  // Atualizar nome do banco quando o código muda
  useEffect(() => {
    if (selectedBankCode) {
      const bank = supportedBanks.find(b => b.code === selectedBankCode);
      if (bank) {
        setValue('bank_name', bank.name);
      }
    }
  }, [selectedBankCode, setValue]);

  // Formatação de moeda para input
  const formatCurrencyInput = (value: string) => {
    const numValue = value.replace(/\D/g, '');
    const number = parseInt(numValue || '0') / 100;
    return number;
  };

  const getCurrencyDisplay = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Custom handler para input de moeda
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: number) => void) => {
    const value = e.target.value;
    const number = formatCurrencyInput(value);
    onChange(number);
  };

  // Submit handler
  const onSubmit = (data: AccountSchema) => {
    onSave(data as BankAccountFormData);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Empresa */}
            <FormField
              control={control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome da Conta */}
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta Principal - Empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Conta */}
            <FormField
              control={control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de conta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Saldo Inicial */}
            <FormField
              control={control}
              name="opening_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Inicial *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R$ 0,00"
                      value={getCurrencyDisplay(field.value)}
                      onChange={(e) => handleCurrencyChange(e, field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dados Bancários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Bancários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Banco */}
            <FormField
              control={control}
              name="bank_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {supportedBanks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: bank.color }} />
                            <div>
                              <div className="font-medium">{bank.name}</div>
                              <div className="text-xs text-muted-foreground">Código: {bank.code}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Agência */}
            <FormField
              control={control}
              name="agency_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1234-5" {...field} />
                  </FormControl>
                  <FormDescription>Deixe em branco para contas digitais</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número da Conta */}
            <FormField
              control={control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Conta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 12345-6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Conta ativa
                    </FormLabel>
                    <FormDescription>
                      Contas inativas não aparecerão nos relatórios e não sincronizarão automaticamente
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Resumo (Opcional, mas mantido para paridade visual com versão anterior) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empresa:</span>
                <span className="font-medium">
                  {companies.find(c => c.id === watch('company_id'))?.name || 'Não selecionada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium">{watch('name') || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banco:</span>
                <span className="font-medium">{watch('bank_name') || 'Não selecionado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Inicial:</span>
                <span className="font-medium">{getCurrencyDisplay(selectedOpeningBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData?.id ? 'Salvar Alterações' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </Form>
  );
}