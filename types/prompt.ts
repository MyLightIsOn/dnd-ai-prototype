export type PromptData = {
  name?: string;
  text?: string;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
};
