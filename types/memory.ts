export interface MemoryData {
  name: string;
  scope: 'workflow' | 'global';
  /** Keys stored/retrieved by this node (for visualization). */
  keys: string[];
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}
