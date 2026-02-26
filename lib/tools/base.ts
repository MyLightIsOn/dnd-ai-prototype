// lib/tools/base.ts

export interface ToolResult {
  success: boolean;
  output: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface Tool {
  id: string;
  name: string;
  category: 'search' | 'code' | 'http' | 'data';
  execute(input: string, config: unknown): Promise<ToolResult>;
}
