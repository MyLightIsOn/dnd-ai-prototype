export interface ChunkerData {
  name: string;
  strategy: 'fixed' | 'semantic';
  chunkSize: number;
  overlap: number;
  chunks?: string[];
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}
