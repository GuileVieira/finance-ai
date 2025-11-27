'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import type { TutorialReminderProps } from '@/lib/types/tutorial';

/**
 * Banner de lembrete para usuários que pularam o tutorial
 * Fixo no canto inferior direito
 */
export function TutorialReminder({
  remainingSteps,
  onContinue,
  onDismiss,
}: TutorialReminderProps) {
  return (
    <Alert className="fixed bottom-4 right-4 w-auto max-w-md z-50 shadow-lg border-primary/20 bg-background">
      <Info className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span>Continue a configuração</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm text-muted-foreground mb-3">
          {remainingSteps === 1
            ? 'Falta apenas 1 passo para completar a configuração inicial.'
            : `Faltam ${remainingSteps} passos para completar a configuração inicial.`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Depois
          </Button>
          <Button size="sm" onClick={onContinue}>
            Continuar Tutorial
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
