'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote } from 'lucide-react';

interface BalanceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  onSave: (accountId: string, balance: string) => Promise<void>;
}

export function BalanceInputDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  onSave,
}: BalanceInputDialogProps) {
  const [balance, setBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!balance.trim()) return;

    setIsSaving(true);
    try {
      await onSave(accountId, balance.replace(',', '.'));
      onOpenChange(false);
      setBalance('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    setBalance('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Saldo Inicial da Conta
          </DialogTitle>
          <DialogDescription>
            A conta <strong>{accountName}</strong> foi criada automaticamente.
            Informe o saldo inicial para que os valores batam corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opening-balance">Saldo de abertura (R$)</Label>
            <Input
              id="opening-balance"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 1500.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && balance.trim()) {
                  handleSave();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Informe o saldo da conta no momento anterior ao primeiro lançamento do extrato.
              Use valor negativo para saldo devedor.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
            Pular (saldo = R$ 0,00)
          </Button>
          <Button onClick={handleSave} disabled={!balance.trim() || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Saldo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
