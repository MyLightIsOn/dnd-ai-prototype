export type OutputData = {
  name?: string;
  preview?: string;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
};
