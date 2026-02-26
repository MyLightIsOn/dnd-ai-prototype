# Phase 3: Tool Integration Design

**Date:** 2026-02-26
**Status:** Approved

---

## Scope

Four tool types implemented as variants of the existing `Tool` node:

| Tool | Implementation | API Key |
|------|---------------|---------|
| Web Search | Brave Search API (server-proxied) | `BRAVE_API_KEY` (env) |
| Code Execution | WebContainers (@webcontainer/api) | None |
| HTTP Request | client-side fetch | None |
| Database | Mock only | None |

**Not included:** Custom Tool Builder (deferred).

---

## Architecture

### Tool Node Expansion

The existing `Tool` node's `kind` field is expanded:

```typescript
// types/tool.ts
export type ToolKind = 'web-search' | 'code-exec' | 'http' | 'database';

export interface ToolData {
  name: string;
  kind: ToolKind;
  config: WebSearchConfig | CodeExecConfig | HttpConfig | DatabaseConfig;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
  lastResult?: string; // for properties panel preview
}
```

### Tool Registry

Mirrors the existing provider registry pattern:

```typescript
// lib/tools/base.ts
export interface Tool {
  id: string;
  name: string;
  category: 'search' | 'code' | 'http' | 'data';
  execute(input: string, config: unknown): Promise<ToolResult>;
  validate(config: unknown): { valid: boolean; error?: string };
}

export interface ToolResult {
  success: boolean;
  output: string;
  metadata?: Record<string, unknown>;
  error?: string;
}
```

```typescript
// lib/tools/registry.ts
const registry = new Map<string, Tool>();
export function registerTool(tool: Tool) { registry.set(tool.id, tool); }
export function getTool(id: string): Tool | undefined { return registry.get(id); }
```

---

## 3.1 Web Search (Brave API)

### Data Flow

```
Tool Node → app/api/search/route.ts → Brave Search API → formatted results → downstream agent
```

The API key lives server-side only. The client calls `/api/search` with query + config.

### Config

```typescript
export interface WebSearchConfig {
  maxResults: number;        // 1–10, default 5
  includeDomains?: string;   // comma-separated
  excludeDomains?: string;   // comma-separated
}
```

### Output Format

```
1. [Title](URL)
   Snippet text here.

2. [Title](URL)
   Snippet text here.
```

### Files

- `app/api/search/route.ts` — Next.js API route (server-side, uses BRAVE_API_KEY)
- `lib/tools/web-search/brave.ts` — Tool implementation + result formatter
- `components/properties/tool-properties/web-search-properties.tsx` — Config UI

---

## 3.2 Code Execution (WebContainers)

### Requirements

WebContainers require cross-origin isolation. Add to `next.config.ts`:

```typescript
headers: [{
  source: '/(.*)',
  headers: [
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ]
}]
```

### Config

```typescript
export interface CodeExecConfig {
  code: string;      // JavaScript source
  timeout: number;   // seconds, default 10
}
```

### Execution Flow

1. Lazy-init single shared WebContainer instance
2. Write `index.js` with user code
3. Run `node index.js` with timeout
4. Capture stdout → output; stderr → error state
5. Output passed as string to downstream nodes

### Files

- `lib/tools/code-exec/webcontainer.ts` — WebContainer singleton + execute logic
- `components/properties/tool-properties/code-exec-properties.tsx` — Code textarea + timeout

---

## 3.3 HTTP Tool

### Config

```typescript
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
```

### Execution

Client-side `fetch()`. Response body returned as string (JSON pretty-printed if parseable). HTTP errors (4xx/5xx) surface as `executionState: 'error'`.

### Files

- `lib/tools/http/client.ts` — fetch wrapper
- `components/properties/tool-properties/http-properties.tsx` — Method/URL/headers/body UI

---

## 3.4 Database Tool (Mock)

### Config

```typescript
export interface DatabaseConfig {
  connectionString: string; // display only, never used
  query: string;
}
```

### Mock Output

Returns a markdown table with fake data. The properties panel shows a "MOCK DATA" badge prominently. A note in the UI explains real DB support is not implemented.

### Files

- `lib/tools/database/mock.ts` — mock query executor
- `components/properties/tool-properties/database-properties.tsx` — Query textarea + mock badge

---

## Properties Panel Routing

`components/properties/tool-properties/index.tsx` routes to the correct sub-panel based on `data.kind`. The main `components/properties/index.tsx` already routes to tool properties for Tool nodes.

---

## Execution Integration (lib/run.ts)

The existing Tool case in `lib/run.ts` currently returns mock data. It will be updated to:

1. Look up the tool from registry by `data.kind`
2. Call `tool.execute(input, data.config)`
3. Handle errors with the existing retry/skip/abort flow
4. Log results with 🔧 prefix

---

## Palette Updates

The Tool palette item will remain a single entry. On drop, it defaults to `kind: 'web-search'`. The properties panel lets the user change the kind via a dropdown, which resets config to defaults for the new type.

---

## Demo Scenario

```
Prompt ("Search for X") → Web Search → Agent (Summarize results) → Result
Prompt ("Write JS that...") → Agent (Generate code) → Code Exec → Result
Prompt → HTTP Tool (fetch API) → Agent (Parse response) → Result
```
