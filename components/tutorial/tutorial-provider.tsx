'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { TutorialOverlay } from './tutorial-overlay';
import { TutorialReminder } from './tutorial-reminder';
import { useTutorial } from '@/hooks/use-tutorial';
import { useAuth } from '@/hooks/useAuth';
import type { UseTutorialReturn, TutorialProviderProps } from '@/lib/types/tutorial';
import { TUTORIAL_STORAGE_KEY, TUTORIAL_START_DELAY, TUTORIAL_STEPS } from '@/lib/constants/tutorial-steps';

// Rotas onde o tutorial NÃO deve aparecer
const EXCLUDED_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

// Context
const TutorialContext = createContext<UseTutorialReturn | null>(null);

/**
 * Provider do sistema de tutorial
 * Gerencia estado global e renderiza overlay/reminder
 */
export function TutorialProvider({ children, autoStart = true }: TutorialProviderProps) {
  const tutorial = useTutorial();
  const pathname = usePathname();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasCheckedFirstAccess, setHasCheckedFirstAccess] = useState(false);

  // Verificar se estamos em uma rota excluída (login, signup, etc)
  const isExcludedRoute = EXCLUDED_ROUTES.some(route => pathname?.startsWith(route));

  // Verificar primeiro acesso e iniciar tutorial automaticamente
  useEffect(() => {
    // Não iniciar se: ainda carregando, já verificou, não logado, ou rota excluída
    if (tutorial.isLoading || authLoading || hasCheckedFirstAccess || !isLoggedIn || isExcludedRoute) {
      if (!tutorial.isLoading && !authLoading) {
        setIsReady(true);
      }
      return;
    }

    const checkFirstAccess = async () => {
      // Verificar se já existe estado salvo
      const existingState = localStorage.getItem(TUTORIAL_STORAGE_KEY);

      if (!existingState && autoStart) {
        // Primeiro acesso - iniciar tutorial após delay
        setTimeout(() => {
          tutorial.startTutorial();
        }, TUTORIAL_START_DELAY);
      }

      setHasCheckedFirstAccess(true);
      setIsReady(true);
    };

    checkFirstAccess();
  }, [tutorial.isLoading, authLoading, hasCheckedFirstAccess, autoStart, tutorial, isLoggedIn, isExcludedRoute]);

  // Handlers
  const handleNext = useCallback(() => {
    tutorial.completeCurrentStep();
  }, [tutorial]);

  const handleSkip = useCallback(() => {
    tutorial.skipCurrentStep();
  }, [tutorial]);

  const handleClose = useCallback(() => {
    tutorial.skipTutorial();
  }, [tutorial]);

  const handleComplete = useCallback(() => {
    tutorial.completeCurrentStep();
  }, [tutorial]);

  const handleResume = useCallback(() => {
    tutorial.resumeTutorial();
  }, [tutorial]);

  const handleDismissReminder = useCallback(() => {
    tutorial.dismissReminder();
  }, [tutorial]);

  // Calcular steps restantes
  const remainingSteps = useMemo(() => {
    if (!tutorial.state) return TUTORIAL_STEPS.length;
    return Object.values(tutorial.state.stepsStatus).filter(s => s === 'pending').length;
  }, [tutorial.state]);

  return (
    <TutorialContext.Provider value={tutorial}>
      {children}

      {/* Overlay do tutorial (quando ativo e logado) */}
      {isReady && tutorial.isActive && tutorial.currentStep && isLoggedIn && !isExcludedRoute && (
        <TutorialOverlay
          step={tutorial.currentStep}
          currentIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          stepsStatus={tutorial.state?.stepsStatus ?? {
            'settings-theme': 'pending',
            'create-company': 'pending',
            'create-account': 'pending',
            'review-categories': 'pending',
            'first-upload': 'pending',
          }}
          onNext={handleNext}
          onSkip={handleSkip}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}

      {/* Reminder (quando pulou mas não dispensou e está logado) */}
      {isReady && tutorial.shouldShowReminder && isLoggedIn && !isExcludedRoute && (
        <TutorialReminder
          remainingSteps={remainingSteps}
          onContinue={handleResume}
          onDismiss={handleDismissReminder}
        />
      )}
    </TutorialContext.Provider>
  );
}

/**
 * Hook para acessar o contexto do tutorial
 */
export function useTutorialContext(): UseTutorialReturn {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext deve ser usado dentro de TutorialProvider');
  }
  return context;
}
