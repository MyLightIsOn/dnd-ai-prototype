export type DocumentData = {
  name?: string;
  fileName?: string;
  fileType?: 'pdf' | 'txt' | 'md' | 'code';
  content?: string;
  size?: number; // bytes
  uploadedAt?: string;
  metadata?: Record<string, any>;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
};
