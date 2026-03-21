// types/tool.ts

export type ToolKind = 'web-search' | 'code-exec' | 'http' | 'database';

export interface WebSearchConfig {
  maxResults: number;       // 1–10
  includeDomains?: string;  // comma-separated
  excludeDomains?: string;  // comma-separated
}

export interface CodeExecConfig {
  code: string;
  timeout: number; // seconds
}

export interface HttpConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Array<{ key: string; value: string }>;
  body?: string;
  auth?: {
    type: 'bearer' | 'apikey';
    token: string;
    headerName?: string; // for apikey type, default 'X-API-Key'
  };
}

export interface DatabaseConfig {
  connectionString: string;
  query: string;
}

export type ToolConfig = WebSearchConfig | CodeExecConfig | HttpConfig | DatabaseConfig;

export type ToolData = {
  name?: string;
  kind?: ToolKind;
  config?: ToolConfig;
  lastResult?: string; // populated after execution for properties preview
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
};
