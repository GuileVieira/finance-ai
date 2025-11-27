/**
 * Tipos e interfaces do sistema de tutorial/onboarding
 */

// IDs dos steps do tutorial
export type TutorialStepId =
  | 'settings-theme'
  | 'create-company'
  | 'create-account'
  | 'review-categories'
  | 'first-upload';

// Posições possíveis do tooltip
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

// Status de um step individual
export type StepStatus = 'pending' | 'completed' | 'skipped';

// Status geral do tutorial
export type TutorialStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

// Tipo de verificação de conclusão
export type CompletionCheckType = 'api' | 'localStorage' | 'event';

// Configuração de verificação de conclusão
export interface CompletionCheck {
  type: CompletionCheckType;
  endpoint?: string;
  key?: string;
  eventName?: string;
  condition: (data: unknown) => boolean;
}

// Configuração de um step do tutorial
export interface TutorialStep {
  id: TutorialStepId;
  order: number;
  title: string;
  description: string;
  route: string;
  targetSelector: string;
  tooltipPosition: TooltipPosition;
  completionCheck: CompletionCheck;
  canSkip: boolean;
}

// Estado do tutorial persistido no localStorage
export interface TutorialState {
  version: number;
  status: TutorialStatus;
  currentStepIndex: number;
  stepsStatus: Record<TutorialStepId, StepStatus>;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  reminderDismissed: boolean;
}

// Ações disponíveis no hook useTutorial
export interface TutorialActions {
  // Iniciar tutorial
  startTutorial: () => void;

  // Navegação
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: TutorialStepId) => void;

  // Completar step atual
  completeCurrentStep: () => void;

  // Pular
  skipCurrentStep: () => void;
  skipTutorial: () => void;

  // Reminder
  dismissReminder: () => void;
  resumeTutorial: () => void;

  // Reset
  resetTutorial: () => void;
}

// Retorno do hook useTutorial
export interface UseTutorialReturn extends TutorialActions {
  // Estado
  state: TutorialState | null;
  isLoading: boolean;

  // Computed
  isActive: boolean;
  isComplete: boolean;
  wasSkipped: boolean;
  shouldShowReminder: boolean;
  currentStep: TutorialStep | null;
  currentStepIndex: number;
  totalSteps: number;
  completedStepsCount: number;
  progressPercentage: number;

  // Utils
  isStepCompleted: (stepId: TutorialStepId) => boolean;
  getStepStatus: (stepId: TutorialStepId) => StepStatus;
}

// Props do TutorialProvider
export interface TutorialProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
}

// Props do TutorialOverlay
export interface TutorialOverlayProps {
  step: TutorialStep;
  targetRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  currentIndex: number;
  totalSteps: number;
  stepsStatus: Record<TutorialStepId, StepStatus>;
}

// Props do TutorialSpotlight
export interface TutorialSpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
}

// Props do TutorialTooltip
export interface TutorialTooltipProps {
  step: TutorialStep;
  targetRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  currentIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  stepsStatus: Record<TutorialStepId, StepStatus>;
}

// Props do TutorialProgress
export interface TutorialProgressProps {
  currentIndex: number;
  totalSteps: number;
  stepsStatus: Record<TutorialStepId, StepStatus>;
  stepIds: TutorialStepId[];
}

// Props do TutorialReminder
export interface TutorialReminderProps {
  remainingSteps: number;
  onContinue: () => void;
  onDismiss: () => void;
}

// Resultado da verificação de dados existentes
export interface ExistingDataCheck {
  hasCompany: boolean;
  hasAccount: boolean;
  hasCategories: boolean;
  hasUpload: boolean;
}
