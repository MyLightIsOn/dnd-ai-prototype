export type AgentData = {
  prompt: string;
  name?: string;
  model?: string; // Format: "provider/model-id" e.g. "openai/gpt-4o"
  preview?: string;
  mode?: 'mock' | 'live'; // Default to 'mock'
  streaming?: boolean; // Default to false
  temperature?: number;
  maxTokens?: number;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
  memoryRead?: string[];
  memoryWrite?: string;
};
