export { default as QuickStartWizard } from './QuickStartWizard';
export type { QuickStartConfig } from './QuickStartWizard';

// Re-export from common for consistency
export { JustInTimePrompt, useJustInTimePrompt, hasPromptBeenShown } from '../common/JustInTimePrompts';
export type { PromptType } from '../common/JustInTimePrompts';
