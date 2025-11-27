import type { TutorialStep, TutorialState, TutorialStepId } from '@/lib/types/tutorial';

/**
 * Chave do localStorage para persistência do estado do tutorial
 */
export const TUTORIAL_STORAGE_KEY = 'financeai-tutorial-state';

/**
 * Versão do schema do estado (para migrações futuras)
 */
export const TUTORIAL_VERSION = 1;

/**
 * Intervalo de polling para verificação de conclusão (em ms)
 */
export const COMPLETION_POLL_INTERVAL = 2000;

/**
 * Delay antes de iniciar o tutorial após primeiro acesso (em ms)
 */
export const TUTORIAL_START_DELAY = 1000;

/**
 * Delay após conclusão de ação antes de avançar (em ms)
 */
export const AUTO_ADVANCE_DELAY = 1500;

/**
 * Configuração dos 5 steps do tutorial
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'settings-theme',
    order: 1,
    title: 'Personalize o Sistema',
    description: 'Clique no ícone de sol/lua para alternar entre tema claro e escuro. Escolha o que mais combina com você!',
    route: '/dashboard',
    targetSelector: '[data-tutorial="theme-toggle"]',
    tooltipPosition: 'bottom',
    completionCheck: {
      type: 'event',
      eventName: 'tutorial:theme-changed',
      condition: () => true,
    },
    canSkip: true,
  },
  {
    id: 'create-company',
    order: 2,
    title: 'Cadastre sua Empresa',
    description: 'Toda transação financeira pertence a uma empresa. Clique no botão para criar sua primeira empresa.',
    route: '/settings/companies',
    targetSelector: '[data-tutorial="new-company-btn"]',
    tooltipPosition: 'bottom',
    completionCheck: {
      type: 'api',
      endpoint: '/api/companies',
      condition: (data: unknown) => {
        const response = data as { success?: boolean; data?: { total?: number } };
        return Boolean(response?.success && response?.data?.total && response.data.total > 0);
      },
    },
    canSkip: false,
  },
  {
    id: 'create-account',
    order: 3,
    title: 'Adicione uma Conta Bancária',
    description: 'Cadastre a conta bancária de onde virão seus extratos OFX. Isso permitirá importar suas transações.',
    route: '/settings/accounts',
    targetSelector: '[data-tutorial="new-account-btn"]',
    tooltipPosition: 'bottom',
    completionCheck: {
      type: 'api',
      endpoint: '/api/accounts',
      condition: (data: unknown) => {
        const response = data as { success?: boolean; data?: { total?: number } };
        return Boolean(response?.success && response?.data?.total && response.data.total > 0);
      },
    },
    canSkip: false,
  },
  {
    id: 'review-categories',
    order: 4,
    title: 'Conheça as Categorias',
    description: 'O sistema já vem com categorias pré-configuradas para classificar suas transações. Explore e personalize se necessário!',
    route: '/settings/categories',
    targetSelector: '[data-tutorial="categories-list"]',
    tooltipPosition: 'top',
    completionCheck: {
      type: 'localStorage',
      key: 'tutorial-categories-viewed',
      condition: (data: unknown) => data === 'true',
    },
    canSkip: true,
  },
  {
    id: 'first-upload',
    order: 5,
    title: 'Importe seu Primeiro Extrato',
    description: 'Arraste um arquivo OFX do seu banco para a área indicada. O sistema vai processar e categorizar automaticamente!',
    route: '/upload',
    targetSelector: '[data-tutorial="upload-dropzone"]',
    tooltipPosition: 'top',
    completionCheck: {
      type: 'api',
      endpoint: '/api/uploads',
      condition: (data: unknown) => {
        const response = data as { success?: boolean; data?: { stats?: { total?: number } } };
        return Boolean(response?.success && response?.data?.stats?.total && response.data.stats.total > 0);
      },
    },
    canSkip: true,
  },
];

/**
 * IDs dos steps na ordem correta
 */
export const TUTORIAL_STEP_IDS: TutorialStepId[] = TUTORIAL_STEPS.map(step => step.id);

/**
 * Criar estado inicial do tutorial
 */
export function createInitialTutorialState(): TutorialState {
  return {
    version: TUTORIAL_VERSION,
    status: 'not_started',
    currentStepIndex: 0,
    stepsStatus: {
      'settings-theme': 'pending',
      'create-company': 'pending',
      'create-account': 'pending',
      'review-categories': 'pending',
      'first-upload': 'pending',
    },
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    reminderDismissed: false,
  };
}

/**
 * Obter step por ID
 */
export function getStepById(stepId: TutorialStepId): TutorialStep | undefined {
  return TUTORIAL_STEPS.find(step => step.id === stepId);
}

/**
 * Obter step por índice
 */
export function getStepByIndex(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}

/**
 * Obter índice do step por ID
 */
export function getStepIndex(stepId: TutorialStepId): number {
  return TUTORIAL_STEPS.findIndex(step => step.id === stepId);
}

/**
 * Verificar se é o primeiro step
 */
export function isFirstStep(index: number): boolean {
  return index === 0;
}

/**
 * Verificar se é o último step
 */
export function isLastStep(index: number): boolean {
  return index === TUTORIAL_STEPS.length - 1;
}
