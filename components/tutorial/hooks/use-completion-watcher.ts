'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { TutorialStep } from '@/lib/types/tutorial';
import { COMPLETION_POLL_INTERVAL } from '@/lib/constants/tutorial-steps';

interface UseCompletionWatcherOptions {
  enabled: boolean;
  onComplete: () => void;
  pollInterval?: number;
}

/**
 * Hook para observar a conclusão de um step do tutorial
 * Suporta verificação via API (polling), localStorage e eventos customizados
 */
export function useCompletionWatcher(
  step: TutorialStep | null,
  options: UseCompletionWatcherOptions
) {
  const { enabled, onComplete, pollInterval = COMPLETION_POLL_INTERVAL } = options;
  const hasCompletedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset quando mudar de step
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [step?.id]);

  // Função para verificar conclusão via API
  const checkApiCompletion = useCallback(async () => {
    if (!step || step.completionCheck.type !== 'api' || !step.completionCheck.endpoint) {
      return false;
    }

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(step.completionCheck.endpoint, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return step.completionCheck.condition(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      console.warn('[Tutorial] Erro ao verificar conclusão via API:', error);
      return false;
    }
  }, [step]);

  // Função para verificar conclusão via localStorage
  const checkLocalStorageCompletion = useCallback(() => {
    if (!step || step.completionCheck.type !== 'localStorage' || !step.completionCheck.key) {
      return false;
    }

    try {
      const value = localStorage.getItem(step.completionCheck.key);
      return step.completionCheck.condition(value);
    } catch (error) {
      console.warn('[Tutorial] Erro ao verificar localStorage:', error);
      return false;
    }
  }, [step]);

  // Polling para verificação via API
  useEffect(() => {
    if (!enabled || !step || step.completionCheck.type !== 'api') {
      return;
    }

    // Verificar imediatamente
    checkApiCompletion().then(isComplete => {
      if (isComplete && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    });

    // Setup polling
    const intervalId = setInterval(async () => {
      if (hasCompletedRef.current) {
        return;
      }

      const isComplete = await checkApiCompletion();
      if (isComplete && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [enabled, step, checkApiCompletion, onComplete, pollInterval]);

  // Listener para localStorage
  useEffect(() => {
    if (!enabled || !step || step.completionCheck.type !== 'localStorage') {
      return;
    }

    // Verificar imediatamente
    if (checkLocalStorageCompletion() && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
      return;
    }

    // Listener para mudanças no localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === step.completionCheck.key && !hasCompletedRef.current) {
        if (checkLocalStorageCompletion()) {
          hasCompletedRef.current = true;
          onComplete();
        }
      }
    };

    // Polling como fallback (storage event não dispara na mesma aba)
    const intervalId = setInterval(() => {
      if (hasCompletedRef.current) {
        return;
      }

      if (checkLocalStorageCompletion()) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }, 500);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, step, checkLocalStorageCompletion, onComplete]);

  // Listener para eventos customizados
  useEffect(() => {
    if (!enabled || !step || step.completionCheck.type !== 'event' || !step.completionCheck.eventName) {
      return;
    }

    const handleEvent = () => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    };

    document.addEventListener(step.completionCheck.eventName, handleEvent);

    return () => {
      document.removeEventListener(step.completionCheck.eventName, handleEvent);
    };
  }, [enabled, step, onComplete]);

  return {
    isWatching: enabled && step !== null,
  };
}

/**
 * Função utilitária para disparar evento de conclusão do tutorial
 */
export function dispatchTutorialEvent(eventName: string) {
  document.dispatchEvent(new CustomEvent(eventName));
}
