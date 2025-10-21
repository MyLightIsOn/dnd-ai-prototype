export type ToolData = {
  name?: string;
  kind?: string;
  config?: { endpoint?: string };
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
};
