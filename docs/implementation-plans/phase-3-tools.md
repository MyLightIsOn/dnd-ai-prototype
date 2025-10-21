# Phase 3 Implementation Plan: Tool Integration & Extensibility

**Status:** Planned
**Priority:** MEDIUM
**Dependencies:** Phase 1 (Provider system)
**Estimated Duration:** 2 weeks

---

## Overview

Phase 3 connects workflows to external data sources and execution environments. Real tools transform theoretical workflows into practical automations.

---

## 3.1 Web Search Tool

### Architecture

```typescript
// types/tools/web-search.ts
export interface WebSearchConfig {
  provider: 'tavily' | 'serpapi' | 'google-search';
  apiKey: string;
  maxResults: number;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
  dateRange?: 'day' | 'week' | 'month' | 'year';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  content?: string; // If full-text extraction enabled
  publishedDate?: string;
}
```

### Tasks

#### Task 3.1.1: Tavily Integration
- [ ] Install `tavily` or use fetch API
- [ ] Implement search method
- [ ] Result formatting
- [ ] Error handling

**Complexity:** Low
**Files:** `lib/tools/web-search/tavily.ts`

---

#### Task 3.1.2: Web Search Tool Node
- [ ] Create tool node for web search
- [ ] Configuration UI (max results, domains)
- [ ] Result preview in properties
- [ ] Format results for agent consumption

**Complexity:** Low
**Files:** `components/nodes/tools/web-search-node.tsx`

---

#### Task 3.1.3: Result Formatting
- [ ] Convert results to text for agents
- [ ] Structured output option (JSON)
- [ ] Result ranking/filtering
- [ ] Citation tracking

**Complexity:** Low
**Files:** `lib/tools/web-search/formatter.ts`

---

## 3.2 Code Execution Tool

### Architecture

```typescript
// types/tools/code-exec.ts
export interface CodeExecConfig {
  language: 'python' | 'javascript' | 'typescript';
  timeout: number; // seconds
  sandbox: 'e2b' | 'modal' | 'local'; // local = vm2 (unsafe)
  packages?: string[]; // pip install / npm install
}

export interface CodeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  error?: string;
}
```

### Tasks

#### Task 3.2.1: E2B Sandbox Integration
- [ ] Install `@e2b/sdk`
- [ ] Create sandbox instance
- [ ] Execute code
- [ ] Capture output

**Decision Point:** E2B vs Modal vs WebContainers
- E2B: Full cloud sandboxes, pay-per-use
- Modal: Serverless functions, Python-focused
- WebContainers: In-browser Node.js (StackBlitz)

**Complexity:** Medium
**Files:** `lib/tools/code-exec/e2b.ts`

---

#### Task 3.2.2: Code Editor UI
- [ ] Monaco editor integration (or CodeMirror)
- [ ] Syntax highlighting
- [ ] Run button with progress
- [ ] Output display

**Complexity:** Medium
**Files:** `components/nodes/tools/code-exec-node.tsx`

---

#### Task 3.2.3: Package Management
- [ ] Define package requirements
- [ ] Install packages in sandbox
- [ ] Cache sandbox environments
- [ ] Show installation progress

**Complexity:** High
**Files:** `lib/tools/code-exec/package-manager.ts`

---

## 3.3 Database & API Tools

### Architecture

```typescript
// types/tools/database.ts
export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'supabase';
  connectionString: string;
  query: string;
  readOnly: boolean; // Safety: only SELECT allowed
}

// types/tools/http.ts
export interface HttpConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: {
    type: 'bearer' | 'apikey' | 'basic';
    credentials: string;
  };
}
```

### Tasks

#### Task 3.3.1: Database Tool
- [ ] Postgres client integration
- [ ] Supabase client integration
- [ ] Query validation (prevent DROP, DELETE)
- [ ] Result formatting

**Complexity:** Medium
**Files:** `lib/tools/database/postgres.ts`, `components/nodes/tools/database-node.tsx`

---

#### Task 3.3.2: HTTP API Tool
- [ ] Generic HTTP client
- [ ] Auth header injection
- [ ] Request/response formatting
- [ ] Error handling (404, 500, etc.)

**Complexity:** Low
**Files:** `lib/tools/http/client.ts`, `components/nodes/tools/http-node.tsx`

---

#### Task 3.3.3: OAuth Support (Stretch)
- [ ] OAuth2 flow
- [ ] Token storage
- [ ] Token refresh
- [ ] Provider presets (Google, GitHub, etc.)

**Complexity:** Very High
**Skip for MVP**

---

## 3.4 Custom Tool Builder

### Architecture

```typescript
// types/tools/custom.ts
export interface CustomToolData {
  name: string;
  description: string;
  code: string; // JavaScript function as string
  inputSchema?: any; // JSON schema
  outputSchema?: any;
}

// User writes:
async function customTool(input: string): Promise<string> {
  // Custom logic here
  const response = await fetch('...');
  return response.json();
}
```

### Tasks

#### Task 3.4.1: Function Editor
- [ ] Code editor for tool function
- [ ] Function template
- [ ] TypeScript type checking (optional)
- [ ] Test button (run with sample input)

**Complexity:** Medium
**Files:** `components/nodes/tools/custom-tool-node.tsx`

---

#### Task 3.4.2: Secure Execution
- [ ] Sandbox user code (vm2 or similar)
- [ ] Whitelist allowed APIs (fetch, crypto, etc.)
- [ ] Timeout protection
- [ ] Memory limits

**Security Consideration:** User code is dangerous. Must sandbox properly.

**Complexity:** High
**Files:** `lib/tools/custom/executor.ts`

---

#### Task 3.4.3: Tool Library
- [ ] Save custom tools to localStorage
- [ ] Tool browser/selector
- [ ] Import/export tool JSON
- [ ] Tool sharing (Phase 5)

**Complexity:** Low
**Files:** `lib/tools/custom/library.ts`, `components/tool-library/index.tsx`

---

## Tool Registry Pattern

### Unified Tool Interface

```typescript
// lib/tools/base.ts
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'search' | 'code' | 'data' | 'http' | 'custom';

  execute(input: string, config: any): Promise<ToolResult>;
  validate(config: any): ValidationResult;
}

export interface ToolResult {
  success: boolean;
  output: string;
  metadata?: Record<string, any>;
  error?: string;
}

// Registry
export const toolRegistry = new Map<string, Tool>();

export function registerTool(tool: Tool) {
  toolRegistry.set(tool.id, tool);
}

export function getTool(id: string): Tool | undefined {
  return toolRegistry.get(id);
}
```

### Tasks

#### Task 3.4.4: Tool Registry Implementation
- [ ] Define base tool interface
- [ ] Create registry
- [ ] Register all built-in tools
- [ ] Tool discovery in palette

**Complexity:** Medium
**Files:** `lib/tools/base.ts`, `lib/tools/registry.ts`

---

## Testing Strategy

### Web Search
- [ ] Mock API responses
- [ ] Real API calls (integration test)
- [ ] Error scenarios (invalid key, rate limits)
- [ ] Result formatting

### Code Execution
- [ ] Simple scripts (Python, JS)
- [ ] Error handling (syntax errors, timeouts)
- [ ] Package installation
- [ ] Security (prevent file system access)

### Database
- [ ] Query validation (prevent unsafe queries)
- [ ] Connection handling
- [ ] Result set formatting
- [ ] Error handling

### Custom Tools
- [ ] Sandboxing (prevent malicious code)
- [ ] Timeout enforcement
- [ ] API access controls

---

## Success Criteria

### Demo Scenario 1: Research Assistant
```
Topic Prompt → Web Search (Tavily) →
  Extract URLs → Agent (Summarize) → Result
```

### Demo Scenario 2: Code Generator & Test
```
Task Prompt → Agent (Generate Python) →
  Code Exec (Run tests) → Router →
    [Pass] → Success
    [Fail] → Agent (Fix code) → Loop
```

### Demo Scenario 3: Data Pipeline
```
Database Query → Agent (Analyze) →
  HTTP POST (Send to webhook) → Result
```

---

## Security Considerations

- [ ] All user API keys stored encrypted
- [ ] Code execution in isolated sandboxes
- [ ] Database queries validated (read-only)
- [ ] HTTP requests validated (no localhost access)
- [ ] Custom tools sandboxed (no file system access)
- [ ] Rate limiting on expensive operations

---

## Documentation

- [ ] Tool configuration guide for each type
- [ ] Security best practices
- [ ] Example workflows using tools
- [ ] Custom tool development guide
- [ ] API key management guide
