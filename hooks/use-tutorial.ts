'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type {
  TutorialState,
  TutorialStepId,
  StepStatus,
  UseTutorialReturn,
  ExistingDataCheck,
} from '@/lib/types/tutorial';
import {
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_VERSION,
  TUTORIAL_STEPS,
  TUTORIAL_STEP_IDS,
  createInitialTutorialState,
  getStepByIndex,
  isFirstStep,
  isLastStep,
} from '@/lib/constants/tutorial-steps';

/**
 * Carregar estado do localStorage
 */
function loadState(): TutorialState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as TutorialState;

    // Verificar versão para migração futura
    if (state.version !== TUTORIAL_VERSION) {
      // Por enquanto, resetar se versão diferente
      return null;
    }

    return state;
  } catch (error) {
    console.warn('[Tutorial] Erro ao carregar estado:', error);
    return null;
  }
}

/**
 * Salvar estado no localStorage
 */
function saveState(state: TutorialState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[Tutorial] Erro ao salvar estado:', error);
  }
}

/**
 * Verificar dados existentes no sistema
 */
async function checkExistingData(): Promise<ExistingDataCheck> {
  const result: ExistingDataCheck = {
    hasCompany: false,
    hasAccount: false,
    hasCategories: false,
    hasUpload: false,
  };

  try {
    // Verificar empresas
    const companiesRes = await fetch('/api/companies');
    if (companiesRes.ok) {
      const data = await companiesRes.json();
      result.hasCompany = data?.data?.total > 0;
    }

    // Verificar contas
    const accountsRes = await fetch('/api/accounts');
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      result.hasAccount = data?.data?.total > 0;
    }

    // Verificar uploads
    const uploadsRes = await fetch('/api/uploads');
    if (uploadsRes.ok) {
      const data = await uploadsRes.json();
      result.hasUpload = data?.data?.stats?.total > 0;
    }

    // Categorias sempre existem (pré-configuradas)
    result.hasCategories = true;
  } catch (error) {
    console.warn('[Tutorial] Erro ao verificar dados existentes:', error);
  }

  return result;
}

/**
 * Hook principal do sistema de tutorial
 */
export function useTutorial(): UseTutorialReturn {
  const [state, setState] = useState<TutorialState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Carregar estado inicial
  useEffect(() => {
    const loadedState = loadState();
    setState(loadedState);
    setIsLoading(false);
  }, []);

  // Persistir mudanças
  useEffect(() => {
    if (state && !isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  // Computed values
  const isActive = useMemo(() => {
    if (!state) return false;
    return state.status === 'in_progress';
  }, [state]);

  const isComplete = useMemo(() => {
    return state?.status === 'completed';
  }, [state]);

  const wasSkipped = useMemo(() => {
    return state?.status === 'skipped';
  }, [state]);

  const shouldShowReminder = useMemo(() => {
    return wasSkipped && !state?.reminderDismissed;
  }, [wasSkipped, state?.reminderDismissed]);

  const currentStepIndex = useMemo(() => {
    return state?.currentStepIndex ?? 0;
  }, [state?.currentStepIndex]);

  const currentStep = useMemo(() => {
    if (!isActive) return null;
    return getStepByIndex(currentStepIndex) ?? null;
  }, [isActive, currentStepIndex]);

  const totalSteps = TUTORIAL_STEPS.length;

  const completedStepsCount = useMemo(() => {
    if (!state) return 0;
    return Object.values(state.stepsStatus).filter(s => s === 'completed').length;
  }, [state]);

  const progressPercentage = useMemo(() => {
    return Math.round((completedStepsCount / totalSteps) * 100);
  }, [completedStepsCount, totalSteps]);

  // Utils
  const isStepCompleted = useCallback(
    (stepId: TutorialStepId): boolean => {
      return state?.stepsStatus[stepId] === 'completed';
    },
    [state]
  );

  const getStepStatus = useCallback(
    (stepId: TutorialStepId): StepStatus => {
      return state?.stepsStatus[stepId] ?? 'pending';
    },
    [state]
  );

  // Actions
  const startTutorial = useCallback(async () => {
    setIsLoading(true);

    // Verificar dados existentes
    const existingData = await checkExistingData();

    // Criar estado inicial
    const newState = createInitialTutorialState();
    newState.status = 'in_progress';
    newState.startedAt = new Date().toISOString();

    // Marcar steps já concluídos baseado em dados existentes
    if (existingData.hasCompany) {
      newState.stepsStatus['create-company'] = 'completed';
    }
    if (existingData.hasAccount) {
      newState.stepsStatus['create-account'] = 'completed';
    }
    if (existingData.hasUpload) {
      newState.stepsStatus['first-upload'] = 'completed';
    }

    setState(newState);
    setIsLoading(false);

    // Navegar para a rota do primeiro step
    const firstStep = getStepByIndex(0);
    if (firstStep && pathname !== firstStep.route) {
      router.push(firstStep.route);
    }
  }, [pathname, router]);

  const nextStep = useCallback(() => {
    if (!state || !isActive) return;

    const nextIndex = state.currentStepIndex + 1;

    if (nextIndex >= TUTORIAL_STEPS.length) {
      // Tutorial completo
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          completedAt: new Date().toISOString(),
        };
      });
      return;
    }

    // Avançar para próximo step
    const nextStepConfig = getStepByIndex(nextIndex);
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });

    // Navegar se necessário
    if (nextStepConfig && pathname !== nextStepConfig.route) {
      router.push(nextStepConfig.route);
    }
  }, [state, isActive, pathname, router]);

  const previousStep = useCallback(() => {
    if (!state || !isActive || isFirstStep(state.currentStepIndex)) return;

    const prevIndex = state.currentStepIndex - 1;
    const prevStepConfig = getStepByIndex(prevIndex);

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStepIndex: prevIndex,
      };
    });

    // Navegar se necessário
    if (prevStepConfig && pathname !== prevStepConfig.route) {
      router.push(prevStepConfig.route);
    }
  }, [state, isActive, pathname, router]);

  const goToStep = useCallback(
    (stepId: TutorialStepId) => {
      if (!state || !isActive) return;

      const stepIndex = TUTORIAL_STEP_IDS.indexOf(stepId);
      if (stepIndex === -1) return;

      const stepConfig = getStepByIndex(stepIndex);

      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentStepIndex: stepIndex,
        };
      });

      // Navegar se necessário
      if (stepConfig && pathname !== stepConfig.route) {
        router.push(stepConfig.route);
      }
    },
    [state, isActive, pathname, router]
  );

  const completeCurrentStep = useCallback(() => {
    if (!state || !isActive) return;

    const currentStepId = TUTORIAL_STEP_IDS[state.currentStepIndex];

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stepsStatus: {
          ...prev.stepsStatus,
          [currentStepId]: 'completed',
        },
      };
    });

    // Avançar automaticamente
    nextStep();
  }, [state, isActive, nextStep]);

  const skipCurrentStep = useCallback(() => {
    if (!state || !isActive) return;

    const currentStepId = TUTORIAL_STEP_IDS[state.currentStepIndex];
    const currentStepConfig = getStepByIndex(state.currentStepIndex);

    // Só pode pular steps que permitem
    if (!currentStepConfig?.canSkip) return;

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stepsStatus: {
          ...prev.stepsStatus,
          [currentStepId]: 'skipped',
        },
      };
    });

    // Avançar para próximo
    nextStep();
  }, [state, isActive, nextStep]);

  const skipTutorial = useCallback(() => {
    setState(prev => {
      if (!prev) return createInitialTutorialState();
      return {
        ...prev,
        status: 'skipped',
        skippedAt: new Date().toISOString(),
      };
    });
  }, []);

  const dismissReminder = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        reminderDismissed: true,
      };
    });
  }, []);

  const resumeTutorial = useCallback(() => {
    if (!state) return;

    // Encontrar primeiro step não completo
    let resumeIndex = 0;
    for (let i = 0; i < TUTORIAL_STEP_IDS.length; i++) {
      const stepId = TUTORIAL_STEP_IDS[i];
      if (state.stepsStatus[stepId] !== 'completed') {
        resumeIndex = i;
        break;
      }
    }

    const resumeStep = getStepByIndex(resumeIndex);

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'in_progress',
        skippedAt: null,
        reminderDismissed: false,
        currentStepIndex: resumeIndex,
      };
    });

    // Navegar para o step
    if (resumeStep && pathname !== resumeStep.route) {
      router.push(resumeStep.route);
    }
  }, [state, pathname, router]);

  const resetTutorial = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      localStorage.removeItem('tutorial-categories-viewed');
    }
    setState(null);
  }, []);

  return {
    // Estado
    state,
    isLoading,

    // Computed
    isActive,
    isComplete,
    wasSkipped,
    shouldShowReminder,
    currentStep,
    currentStepIndex,
    totalSteps,
    completedStepsCount,
    progressPercentage,

    // Actions
    startTutorial,
    nextStep,
    previousStep,
    goToStep,
    completeCurrentStep,
    skipCurrentStep,
    skipTutorial,
    dismissReminder,
    resumeTutorial,
    resetTutorial,

    // Utils
    isStepCompleted,
    getStepStatus,
  };
}
