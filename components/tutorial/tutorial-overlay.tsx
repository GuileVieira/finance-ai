'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { TutorialSpotlight } from './tutorial-spotlight';
import { TutorialTooltip } from './tutorial-tooltip';
import { useElementPosition, useScrollToElement } from './hooks/use-element-position';
import type { TutorialStep, TutorialStepId, StepStatus } from '@/lib/types/tutorial';
import { isFirstStep, isLastStep } from '@/lib/constants/tutorial-steps';

interface TutorialOverlayProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  stepsStatus: Record<TutorialStepId, StepStatus>;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/**
 * Componente principal do overlay do tutorial
 * Combina spotlight + tooltip e gerencia navegação
 */
export function TutorialOverlay({
  step,
  currentIndex,
  totalSteps,
  stepsStatus,
  onNext,
  onSkip,
  onClose,
}: TutorialOverlayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollToElement = useScrollToElement();

  // Obter posição do elemento alvo
  const targetRect = useElementPosition(step.targetSelector);

  // Verificar se estamos na rota correta
  const isOnCorrectRoute = pathname === step.route;

  // Navegar para rota correta se necessário
  useEffect(() => {
    if (!isOnCorrectRoute) {
      router.push(step.route);
    }
  }, [isOnCorrectRoute, step.route, router]);

  // Scroll para o elemento quando mudar de step (apenas se não for posição center)
  useEffect(() => {
    if (targetRect && step.tooltipPosition !== 'center') {
      // Pequeno delay para animação suave
      const timeoutId = setTimeout(() => {
        scrollToElement(step.targetSelector);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [step.id, targetRect, scrollToElement, step.targetSelector, step.tooltipPosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onClose]);

  // Renderizar via portal para garantir que fique acima de tudo
  if (typeof window === 'undefined') {
    return null;
  }

  // Se tooltip é centralizado, não mostrar spotlight (permite scroll livre)
  const showSpotlight = step.tooltipPosition !== 'center';

  return createPortal(
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      {/* Spotlight/Overlay escuro - apenas se não for centralizado */}
      {showSpotlight && <TutorialSpotlight targetRect={targetRect} />}

      {/* Tooltip com informações do step */}
      <TutorialTooltip
        step={step}
        targetRect={showSpotlight ? targetRect : null}
        onNext={onNext}
        onSkip={onSkip}
        onClose={onClose}
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        isFirstStep={isFirstStep(currentIndex)}
        isLastStep={isLastStep(currentIndex)}
        stepsStatus={stepsStatus}
      />
    </div>,
    document.body
  );
}
