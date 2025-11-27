'use client';

import { cn } from '@/lib/utils';
import type { TutorialProgressProps } from '@/lib/types/tutorial';
import { Check } from 'lucide-react';

/**
 * Componente de indicador de progresso do tutorial
 * Mostra dots para cada step, com estados diferentes para completo/atual/pendente
 */
export function TutorialProgress({
  currentIndex,
  totalSteps,
  stepsStatus,
  stepIds,
}: TutorialProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepId = stepIds[index];
        const status = stepsStatus[stepId];
        const isCurrent = index === currentIndex;
        const isCompleted = status === 'completed';
        const isSkipped = status === 'skipped';

        return (
          <div
            key={stepId}
            className={cn(
              'transition-all duration-300 flex items-center justify-center',
              // Tamanho
              isCurrent ? 'w-8 h-3' : 'w-3 h-3',
              // Formato
              'rounded-full',
              // Cores
              isCompleted && 'bg-primary',
              isSkipped && 'bg-muted-foreground/50',
              isCurrent && !isCompleted && 'bg-primary',
              !isCurrent && !isCompleted && !isSkipped && 'bg-muted'
            )}
            title={`Passo ${index + 1}`}
          >
            {isCompleted && !isCurrent && (
              <Check className="w-2 h-2 text-primary-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
