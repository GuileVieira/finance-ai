// Componentes principais
export { TutorialProvider, useTutorialContext } from './tutorial-provider';
export { TutorialOverlay } from './tutorial-overlay';
export { TutorialSpotlight } from './tutorial-spotlight';
export { TutorialTooltip } from './tutorial-tooltip';
export { TutorialProgress } from './tutorial-progress';
export { TutorialReminder } from './tutorial-reminder';

// Hooks
export { useElementPosition, useScrollToElement } from './hooks/use-element-position';
export { useCompletionWatcher, dispatchTutorialEvent } from './hooks/use-completion-watcher';

// Re-export do hook principal
export { useTutorial } from '@/hooks/use-tutorial';

// Re-export de tipos
export type {
  TutorialStep,
  TutorialState,
  TutorialStepId,
  StepStatus,
  TutorialStatus,
  TooltipPosition,
  UseTutorialReturn,
} from '@/lib/types/tutorial';

// Re-export de constantes
export {
  TUTORIAL_STEPS,
  TUTORIAL_STEP_IDS,
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_VERSION,
} from '@/lib/constants/tutorial-steps';
