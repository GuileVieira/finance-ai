'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, SkipForward, Check } from 'lucide-react';
import { TutorialProgress } from './tutorial-progress';
import type { TutorialTooltipProps } from '@/lib/types/tutorial';
import { TUTORIAL_STEP_IDS } from '@/lib/constants/tutorial-steps';
import { cn } from '@/lib/utils';

const TOOLTIP_OFFSET = 16;
const TOOLTIP_WIDTH = 380;

/**
 * Componente de tooltip do tutorial
 * Exibe informações do step atual com navegação
 */
export function TutorialTooltip({
  step,
  targetRect,
  onNext,
  onSkip,
  onClose,
  currentIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  stepsStatus,
}: TutorialTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calcular posição do tooltip
  const position = useMemo(() => {
    if (!targetRect) {
      // Centralizar se não houver elemento alvo
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Estimar altura do tooltip (será ajustado após render)
    const estimatedHeight = 280;

    let style: Record<string, string | number> = {};

    switch (step.tooltipPosition) {
      case 'top':
        style = {
          bottom: viewportHeight - targetRect.top + TOOLTIP_OFFSET,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;

      case 'bottom':
        style = {
          top: targetRect.bottom + TOOLTIP_OFFSET,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        break;

      case 'left':
        style = {
          top: targetRect.top + targetRect.height / 2,
          right: viewportWidth - targetRect.left + TOOLTIP_OFFSET,
          transform: 'translateY(-50%)',
        };
        break;

      case 'right':
        style = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + TOOLTIP_OFFSET,
          transform: 'translateY(-50%)',
        };
        break;

      case 'center':
      default:
        style = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }

    // Ajustar para não sair da tela
    if (typeof style.left === 'number') {
      const minLeft = 16;
      const maxLeft = viewportWidth - TOOLTIP_WIDTH - 16;
      if (style.left < minLeft) style.left = minLeft;
      if (style.left > maxLeft) style.left = maxLeft;
    }

    return style;
  }, [targetRect, step.tooltipPosition]);

  // Arrow/seta direção
  const arrowPosition = useMemo(() => {
    switch (step.tooltipPosition) {
      case 'top':
        return 'bottom';
      case 'bottom':
        return 'top';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
      default:
        return null;
    }
  }, [step.tooltipPosition]);

  // Verificar se step atual está completo
  const isCurrentStepCompleted = stepsStatus[step.id] === 'completed';

  return (
    <Card
      ref={tooltipRef}
      className={cn(
        'fixed z-[10000] shadow-2xl tutorial-tooltip-enter',
        'w-[380px] max-w-[calc(100vw-32px)]'
      )}
      style={position}
    >
      {/* Seta apontando para o elemento */}
      {arrowPosition && targetRect && (
        <div
          className={cn(
            'absolute w-4 h-4 bg-card rotate-45',
            arrowPosition === 'top' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t border-border',
            arrowPosition === 'bottom' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b border-border',
            arrowPosition === 'left' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-l border-b border-border',
            arrowPosition === 'right' && 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-r border-t border-border'
          )}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            Passo {currentIndex + 1} de {totalSteps}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-lg flex items-center gap-2">
          {step.title}
          {isCurrentStepCompleted && (
            <Check className="h-5 w-5 text-green-500" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        {/* Indicador de progresso */}
        <TutorialProgress
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          stepsStatus={stepsStatus}
          stepIds={TUTORIAL_STEP_IDS}
        />

        {/* Botões de navegação */}
        <div className="flex items-center justify-between pt-2 border-t">
          {step.canSkip ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Pular
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onNext}>
              {isLastStep ? (
                <>
                  Concluir
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : isCurrentStepCompleted ? (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
