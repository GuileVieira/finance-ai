'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type {
  TutorialState,
  TutorialStepId,
  StepStatus,
  UseTutorialReturn,
} from '@/lib/types/tutorial';
import {
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_VERSION,
  TUTORIAL_STEPS,
  TUTORIAL_STEP_IDS,
  createInitialTutorialState,
  getStepByIndex,
  isFirstStep,
} from '@/lib/constants/tutorial-steps';

/**
 * Carregar estado do localStorage (fallback para quando não está autenticado)
 */
function loadStateFromLocalStorage(): TutorialState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as TutorialState;

    // Verificar versão para migração futura
    if (state.version !== TUTORIAL_VERSION) {
      return null;
    }

    return state;
  } catch (error) {
    console.warn('[Tutorial] Erro ao carregar estado do localStorage:', error);
    return null;
  }
}

/**
 * Salvar estado no localStorage (fallback)
 */
function saveStateToLocalStorage(state: TutorialState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[Tutorial] Erro ao salvar estado no localStorage:', error);
  }
}

/**
 * Buscar estado do tutorial da API
 */
async function fetchTutorialState(): Promise<TutorialState | null> {
  try {
    const response = await fetch('/api/tutorial');
    if (!response.ok) {
      console.warn('[Tutorial] Erro ao buscar estado da API:', response.status);
      return null;
    }
    const data = await response.json();
    return data.data?.tutorialState ?? null;
  } catch (error) {
    console.warn('[Tutorial] Erro ao buscar estado da API:', error);
    return null;
  }
}

/**
 * Salvar estado do tutorial na API
 */
async function saveTutorialState(state: TutorialState): Promise<boolean> {
  try {
    const response = await fetch('/api/tutorial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorialState: state }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[Tutorial] Erro ao salvar estado na API:', error);
    return false;
  }
}

/**
 * Hook principal do sistema de tutorial
 */
export function useTutorial(): UseTutorialReturn {
  const [state, setState] = useState<TutorialState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedStateRef = useRef<string>('');

  // Carregar estado inicial
  useEffect(() => {
    async function loadState() {
      setIsLoading(true);

      if (isAuthenticated) {
        // Tentar carregar da API primeiro
        const apiState = await fetchTutorialState();
        if (apiState) {
          setState(apiState);
          lastSavedStateRef.current = JSON.stringify(apiState);
          setIsLoading(false);
          return;
        }

        // Se não tem estado na API, verificar localStorage e migrar
        const localState = loadStateFromLocalStorage();
        if (localState) {
          // Migrar localStorage para API
          const saved = await saveTutorialState(localState);
          if (saved) {
            // Limpar localStorage após migração
            localStorage.removeItem(TUTORIAL_STORAGE_KEY);
          }
          setState(localState);
          lastSavedStateRef.current = JSON.stringify(localState);
          setIsLoading(false);
          return;
        }
      } else {
        // Não autenticado, usar localStorage
        const localState = loadStateFromLocalStorage();
        if (localState) {
          setState(localState);
          lastSavedStateRef.current = JSON.stringify(localState);
        }
      }

      setIsLoading(false);
    }

    loadState();
  }, [isAuthenticated]);

  // Persistir mudanças com debounce
  useEffect(() => {
    if (!state || isLoading) return;

    const currentStateStr = JSON.stringify(state);

    // Não salvar se o estado não mudou
    if (currentStateStr === lastSavedStateRef.current) return;

    // Cancelar timeout anterior se existir
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce de 500ms para evitar muitas chamadas
    saveTimeoutRef.current = setTimeout(async () => {
      if (isAuthenticated) {
        const saved = await saveTutorialState(state);
        if (saved) {
          lastSavedStateRef.current = currentStateStr;
        }
      } else {
        saveStateToLocalStorage(state);
        lastSavedStateRef.current = currentStateStr;
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isLoading, isAuthenticated]);

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

    // Criar estado inicial
    const newState = createInitialTutorialState();
    newState.status = 'in_progress';
    newState.startedAt = new Date().toISOString();

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

  const resetTutorial = useCallback(async () => {
    // Limpar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      localStorage.removeItem('tutorial-categories-viewed');
    }

    // Limpar no banco (salvar estado null)
    if (isAuthenticated) {
      await saveTutorialState(createInitialTutorialState());
    }

    setState(null);
    lastSavedStateRef.current = '';
  }, [isAuthenticated]);

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
