# Phase 3: Tool Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add four working tool types to the Tool node — Brave Web Search, WebContainers code execution, HTTP requests, and mock database — each with a properties panel and real execution logic.

**Architecture:** Expand the existing `ToolData` type to support four `kind` values with per-kind config shapes. A new tool registry (`lib/tools/`) mirrors the provider registry pattern. Execution in `lib/execution/parallel-runner.ts` dispatches to the registry. The Brave API key stays server-side behind a Next.js API route.

**Tech Stack:** Next.js App Router (API routes), `@webcontainer/api`, Brave Search REST API, native `fetch` for HTTP tool.

**Working directory:** `.worktrees/phase-3-tools`

---

### Task 1: Expand ToolData types

**Files:**
- Modify: `types/tool.ts`

**Step 1: Replace the file contents**

```typescript
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
```

**Step 2: Verify types compile**

```bash
cd .worktrees/phase-3-tools && pnpm typecheck 2>&1 | head -30
```

Expected: errors only about existing usages of old `config.endpoint` — note these, they will be fixed in Task 11.

**Step 3: Commit**

```bash
git add types/tool.ts
git commit -m "feat: expand ToolData with four tool kind configs"
```

---

### Task 2: Tool registry base

**Files:**
- Create: `lib/tools/base.ts`
- Create: `lib/tools/registry.ts`

**Step 1: Create base interface**

```typescript
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
```

**Step 2: Create registry**

```typescript
// lib/tools/registry.ts

import type { Tool } from './base';

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  registry.set(tool.id, tool);
}

export function getTool(id: string): Tool | undefined {
  return registry.get(id);
}

export function getAllTools(): Tool[] {
  return Array.from(registry.values());
}
```

**Step 3: Verify**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add lib/tools/base.ts lib/tools/registry.ts
git commit -m "feat: add tool registry base"
```

---

### Task 3: Install WebContainer + add COOP/COEP headers

**Files:**
- Modify: `package.json` (via pnpm install)
- Modify: `next.config.ts`

**Step 1: Install the package**

```bash
pnpm add @webcontainer/api
```

**Step 2: Add COOP/COEP headers to next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Step 3: Verify dev server still starts**

```bash
pnpm dev &
sleep 5
curl -s -I http://localhost:3000 | grep -E "cross-origin|Cross-Origin"
kill %1
```

Expected: headers `cross-origin-embedder-policy: require-corp` and `cross-origin-opener-policy: same-origin` present.

**Step 4: Commit**

```bash
git add next.config.ts pnpm-lock.yaml package.json
git commit -m "feat: install @webcontainer/api and add COOP/COEP headers"
```

---

### Task 4: Brave Search API route (server-side)

**Files:**
- Create: `app/api/search/route.ts`

**Step 1: Create the route**

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "BRAVE_API_KEY not configured" }, { status: 500 });
  }

  let body: { query: string; maxResults?: number; includeDomains?: string; excludeDomains?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query, maxResults = 5 } = body;
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(maxResults, 1), 10)),
  });

  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Brave API error ${response.status}: ${text}` }, { status: response.status });
    }

    const data = await response.json();
    const results = (data?.web?.results ?? []).map((r: { title: string; url: string; description?: string; page_age?: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? "",
      publishedDate: r.page_age,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add app/api/search/route.ts
git commit -m "feat: add Brave Search server-side API route"
```

---

### Task 5: Web Search tool implementation

**Files:**
- Create: `lib/tools/web-search/brave.ts`

**Step 1: Create the tool**

```typescript
// lib/tools/web-search/brave.ts
import type { Tool, ToolResult } from "../base";
import type { WebSearchConfig } from "@/types/tool";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

function formatResults(results: SearchResult[]): string {
  if (results.length === 0) return "No results found.";
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}${r.publishedDate ? `\n   Published: ${r.publishedDate}` : ""}`)
    .join("\n\n");
}

export const braveSearchTool: Tool = {
  id: "web-search",
  name: "Web Search",
  category: "search",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as WebSearchConfig;
    const query = input.trim() || "general search";

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          maxResults: cfg.maxResults ?? 5,
          includeDomains: cfg.includeDomains,
          excludeDomains: cfg.excludeDomains,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return { success: false, output: "", error: err.error ?? `HTTP ${response.status}` };
      }

      const data = await response.json();
      const output = formatResults(data.results ?? []);

      return {
        success: true,
        output,
        metadata: { resultCount: data.results?.length ?? 0, query },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/web-search/brave.ts
git commit -m "feat: add Brave web search tool implementation"
```

---

### Task 6: HTTP tool implementation

**Files:**
- Create: `lib/tools/http/client.ts`

**Step 1: Create the tool**

```typescript
// lib/tools/http/client.ts
import type { Tool, ToolResult } from "../base";
import type { HttpConfig } from "@/types/tool";

export const httpTool: Tool = {
  id: "http",
  name: "HTTP Request",
  category: "http",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as HttpConfig;

    if (!cfg.url?.trim()) {
      return { success: false, output: "", error: "URL is required" };
    }

    // Build headers
    const headers: Record<string, string> = {};
    for (const h of cfg.headers ?? []) {
      if (h.key.trim()) headers[h.key] = h.value;
    }

    // Auth
    if (cfg.auth?.token) {
      if (cfg.auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${cfg.auth.token}`;
      } else if (cfg.auth.type === "apikey") {
        headers[cfg.auth.headerName ?? "X-API-Key"] = cfg.auth.token;
      }
    }

    // Body: use upstream input if config body is empty
    const body = cfg.body?.trim() || (["POST", "PUT"].includes(cfg.method) ? input : undefined);

    try {
      const response = await fetch(cfg.url, {
        method: cfg.method,
        headers,
        body: body ?? undefined,
      });

      const text = await response.text();
      let output: string;
      try {
        output = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        output = text;
      }

      if (!response.ok) {
        return {
          success: false,
          output,
          error: `HTTP ${response.status} ${response.statusText}`,
          metadata: { status: response.status },
        };
      }

      return {
        success: true,
        output,
        metadata: { status: response.status, contentType: response.headers.get("content-type") },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/http/client.ts
git commit -m "feat: add HTTP request tool implementation"
```

---

### Task 7: WebContainers code execution tool

**Files:**
- Create: `lib/tools/code-exec/webcontainer.ts`

**Step 1: Create the tool**

```typescript
// lib/tools/code-exec/webcontainer.ts
import type { Tool, ToolResult } from "../base";
import type { CodeExecConfig } from "@/types/tool";

// Singleton instance - WebContainer can only be booted once per page
let wcInstance: import("@webcontainer/api").WebContainer | null = null;
let bootPromise: Promise<import("@webcontainer/api").WebContainer> | null = null;

async function getWebContainer() {
  if (wcInstance) return wcInstance;
  if (bootPromise) return bootPromise;

  const { WebContainer } = await import("@webcontainer/api");
  bootPromise = WebContainer.boot();
  wcInstance = await bootPromise;
  return wcInstance;
}

export const codeExecTool: Tool = {
  id: "code-exec",
  name: "Code Execution",
  category: "code",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as CodeExecConfig;

    // Use config code, fallback to upstream input if empty
    const code = cfg.code?.trim() || input.trim();
    if (!code) {
      return { success: false, output: "", error: "No code to execute" };
    }

    const timeoutMs = (cfg.timeout ?? 10) * 1000;

    try {
      const wc = await getWebContainer();

      // Write the code file
      await wc.mount({ "index.js": { file: { contents: code } } });

      // Run it
      const process = await wc.spawn("node", ["index.js"]);

      let stdout = "";
      let stderr = "";

      process.output.pipeTo(
        new WritableStream({
          write(data) { stdout += data; },
        })
      );

      // Race against timeout
      const exitCode = await Promise.race([
        process.exit,
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${cfg.timeout ?? 10}s`)), timeoutMs)
        ),
      ]);

      if (exitCode !== 0) {
        return {
          success: false,
          output: stdout,
          error: stderr || `Process exited with code ${exitCode}`,
          metadata: { exitCode, stderr },
        };
      }

      return {
        success: true,
        output: stdout || "(no output)",
        metadata: { exitCode: 0 },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/code-exec/webcontainer.ts
git commit -m "feat: add WebContainers code execution tool"
```

---

### Task 8: Database mock tool

**Files:**
- Create: `lib/tools/database/mock.ts`

**Step 1: Create the tool**

```typescript
// lib/tools/database/mock.ts
import type { Tool, ToolResult } from "../base";
import type { DatabaseConfig } from "@/types/tool";

// Generate plausible mock rows based on query keywords
function mockRows(query: string): Record<string, string | number>[] {
  const q = query.toLowerCase();

  if (q.includes("user")) {
    return [
      { id: 1, name: "Alice Johnson", email: "alice@example.com", created_at: "2024-01-15" },
      { id: 2, name: "Bob Smith", email: "bob@example.com", created_at: "2024-02-20" },
      { id: 3, name: "Carol White", email: "carol@example.com", created_at: "2024-03-10" },
    ];
  }

  if (q.includes("order") || q.includes("product")) {
    return [
      { id: 101, product: "Widget A", quantity: 5, total: 49.95, status: "shipped" },
      { id: 102, product: "Widget B", quantity: 2, total: 29.99, status: "pending" },
      { id: 103, product: "Gadget X", quantity: 1, total: 199.00, status: "delivered" },
    ];
  }

  return [
    { id: 1, value: "row_1", timestamp: "2024-01-01T00:00:00Z" },
    { id: 2, value: "row_2", timestamp: "2024-01-02T00:00:00Z" },
  ];
}

function toMarkdownTable(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "(no results)";
  const cols = Object.keys(rows[0]);
  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map(r => `| ${cols.map(c => String(r[c])).join(" | ")} |`).join("\n");
  return [header, sep, body].join("\n");
}

export const databaseMockTool: Tool = {
  id: "database",
  name: "Database Query",
  category: "data",

  async execute(_input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as DatabaseConfig;
    const query = cfg.query?.trim();

    if (!query) {
      return { success: false, output: "", error: "No SQL query provided" };
    }

    // Simulate a small delay
    await new Promise(r => setTimeout(r, 300));

    const rows = mockRows(query);
    const table = toMarkdownTable(rows);
    const output = `[MOCK DATA — ${rows.length} rows]\n\n${table}`;

    return {
      success: true,
      output,
      metadata: { rowCount: rows.length, mock: true },
    };
  },
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/database/mock.ts
git commit -m "feat: add database mock tool"
```

---

### Task 9: Register all tools

**Files:**
- Create: `lib/tools/index.ts`

**Step 1: Create the registry initializer**

```typescript
// lib/tools/index.ts
import { registerTool } from "./registry";
import { braveSearchTool } from "./web-search/brave";
import { httpTool } from "./http/client";
import { codeExecTool } from "./code-exec/webcontainer";
import { databaseMockTool } from "./database/mock";

export { getTool, getAllTools } from "./registry";

// Register all built-in tools
registerTool(braveSearchTool);
registerTool(httpTool);
registerTool(codeExecTool);
registerTool(databaseMockTool);
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/index.ts
git commit -m "feat: register all built-in tools"
```

---

### Task 10: Default configs helper

**Files:**
- Create: `lib/tools/defaults.ts`

This is used by the properties panel when changing tool kind to reset config to valid defaults.

**Step 1: Create the file**

```typescript
// lib/tools/defaults.ts
import type { ToolKind, ToolConfig, WebSearchConfig, CodeExecConfig, HttpConfig, DatabaseConfig } from "@/types/tool";

export function defaultConfig(kind: ToolKind): ToolConfig {
  switch (kind) {
    case "web-search":
      return { maxResults: 5 } as WebSearchConfig;
    case "code-exec":
      return { code: "console.log('Hello from WebContainers!');", timeout: 10 } as CodeExecConfig;
    case "http":
      return { method: "GET", url: "", headers: [] } as HttpConfig;
    case "database":
      return { connectionString: "", query: "SELECT * FROM users LIMIT 10;" } as DatabaseConfig;
  }
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add lib/tools/defaults.ts
git commit -m "feat: add defaultConfig helper for tool kinds"
```

---

### Task 11: Web Search properties panel

**Files:**
- Create: `components/properties/tool-properties/web-search-properties.tsx`

**Step 1: Create the component**

```tsx
// components/properties/tool-properties/web-search-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import type { WebSearchConfig } from "@/types/tool";

export function WebSearchProperties({
  config,
  onChange,
  lastResult,
}: {
  config: WebSearchConfig;
  onChange: (patch: Partial<WebSearchConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Max Results (1–10)</label>
        <Input
          type="number"
          min={1}
          max={10}
          value={config.maxResults ?? 5}
          onChange={(e) => onChange({ maxResults: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)) })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Include Domains (optional, comma-separated)</label>
        <Input
          placeholder="example.com, docs.python.org"
          value={config.includeDomains ?? ""}
          onChange={(e) => onChange({ includeDomains: e.target.value || undefined })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Exclude Domains (optional, comma-separated)</label>
        <Input
          placeholder="reddit.com, twitter.com"
          value={config.excludeDomains ?? ""}
          onChange={(e) => onChange({ excludeDomains: e.target.value || undefined })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Result Preview</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/properties/tool-properties/web-search-properties.tsx
git commit -m "feat: add web search properties panel"
```

---

### Task 12: HTTP properties panel

**Files:**
- Create: `components/properties/tool-properties/http-properties.tsx`

**Step 1: Create the component**

```tsx
// components/properties/tool-properties/http-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { HttpConfig } from "@/types/tool";

export function HttpProperties({
  config,
  onChange,
  lastResult,
}: {
  config: HttpConfig;
  onChange: (patch: Partial<HttpConfig>) => void;
  lastResult?: string;
}) {
  const headers = config.headers ?? [];

  function setHeader(index: number, field: "key" | "value", val: string) {
    const updated = headers.map((h, i) => (i === index ? { ...h, [field]: val } : h));
    onChange({ headers: updated });
  }

  function addHeader() {
    onChange({ headers: [...headers, { key: "", value: "" }] });
  }

  function removeHeader(index: number) {
    onChange({ headers: headers.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Method</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={config.method ?? "GET"}
          onChange={(e) => onChange({ method: e.target.value as HttpConfig["method"] })}
        >
          {(["GET", "POST", "PUT", "DELETE"] as const).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">URL</label>
        <Input
          placeholder="https://api.example.com/endpoint"
          value={config.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600">Headers</label>
          <button
            type="button"
            onClick={addHeader}
            className="text-[10px] text-blue-600 hover:text-blue-800"
          >
            + Add
          </button>
        </div>
        {headers.map((h, i) => (
          <div key={i} className="flex gap-1 items-center">
            <Input
              placeholder="Key"
              value={h.key}
              onChange={(e) => setHeader(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={h.value}
              onChange={(e) => setHeader(i, "value", e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeHeader(i)}
              className="text-gray-400 hover:text-red-500 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Auth</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={config.auth?.type ?? "none"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "none") onChange({ auth: undefined });
            else onChange({ auth: { type: v as "bearer" | "apikey", token: config.auth?.token ?? "" } });
          }}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="apikey">API Key Header</option>
        </select>

        {config.auth && (
          <Input
            placeholder={config.auth.type === "bearer" ? "Token" : "API Key value"}
            value={config.auth.token ?? ""}
            onChange={(e) => onChange({ auth: { ...config.auth!, token: e.target.value } })}
          />
        )}
        {config.auth?.type === "apikey" && (
          <Input
            placeholder="Header name (default: X-API-Key)"
            value={config.auth.headerName ?? ""}
            onChange={(e) =>
              onChange({ auth: { ...config.auth!, headerName: e.target.value || undefined } })
            }
          />
        )}
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Body (optional — upstream input used if empty)</label>
        <Textarea
          rows={4}
          placeholder='{"key": "value"}'
          value={config.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value || undefined })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Response</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/properties/tool-properties/http-properties.tsx
git commit -m "feat: add HTTP tool properties panel"
```

---

### Task 13: Code execution properties panel

**Files:**
- Create: `components/properties/tool-properties/code-exec-properties.tsx`

**Step 1: Create the component**

```tsx
// components/properties/tool-properties/code-exec-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CodeExecConfig } from "@/types/tool";

export function CodeExecProperties({
  config,
  onChange,
  lastResult,
}: {
  config: CodeExecConfig;
  onChange: (patch: Partial<CodeExecConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
        Runs JavaScript in a WebContainer (in-browser Node.js). First run may take a few seconds to boot.
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Code (JavaScript)</label>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          placeholder="console.log('Hello from WebContainers!');"
          value={config.code ?? ""}
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Timeout (seconds)</label>
        <Input
          type="number"
          min={1}
          max={60}
          value={config.timeout ?? 10}
          onChange={(e) =>
            onChange({ timeout: Math.min(60, Math.max(1, parseInt(e.target.value) || 10)) })
          }
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Output</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/properties/tool-properties/code-exec-properties.tsx
git commit -m "feat: add code execution properties panel"
```

---

### Task 14: Database properties panel

**Files:**
- Create: `components/properties/tool-properties/database-properties.tsx`

**Step 1: Create the component**

```tsx
// components/properties/tool-properties/database-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DatabaseConfig } from "@/types/tool";

export function DatabaseProperties({
  config,
  onChange,
  lastResult,
}: {
  config: DatabaseConfig;
  onChange: (patch: Partial<DatabaseConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-[11px] text-yellow-800 flex items-center gap-2">
        <span className="font-bold">MOCK</span>
        <span>Returns simulated data. No real database connection.</span>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Connection String (display only)</label>
        <Input
          placeholder="postgresql://user:password@host/db"
          value={config.connectionString ?? ""}
          onChange={(e) => onChange({ connectionString: e.target.value })}
          className="text-gray-400"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">SQL Query</label>
        <Textarea
          rows={5}
          className="font-mono text-xs"
          placeholder="SELECT * FROM users LIMIT 10;"
          value={config.query ?? ""}
          onChange={(e) => onChange({ query: e.target.value })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Result</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/properties/tool-properties/database-properties.tsx
git commit -m "feat: add database mock properties panel"
```

---

### Task 15: Tool properties router

**Files:**
- Create: `components/properties/tool-properties/index.tsx`

This component renders a kind selector dropdown at top, then delegates to the per-kind panel.

**Step 1: Create the component**

```tsx
// components/properties/tool-properties/index.tsx
"use client";
import React from "react";
import type { ToolData, ToolKind, WebSearchConfig, CodeExecConfig, HttpConfig, DatabaseConfig } from "@/types/tool";
import { defaultConfig } from "@/lib/tools/defaults";
import { WebSearchProperties } from "./web-search-properties";
import { HttpProperties } from "./http-properties";
import { CodeExecProperties } from "./code-exec-properties";
import { DatabaseProperties } from "./database-properties";

const KIND_LABELS: Record<ToolKind, string> = {
  "web-search": "🔍 Web Search",
  "code-exec": "⚡ Code Execution",
  "http": "🌐 HTTP Request",
  "database": "🗄️ Database",
};

export function ToolProperties({
  data,
  onChange,
}: {
  data: ToolData;
  onChange: (patch: Partial<ToolData>) => void;
}) {
  const kind = data.kind ?? "web-search";

  function handleKindChange(newKind: ToolKind) {
    onChange({ kind: newKind, config: defaultConfig(newKind) });
  }

  function handleConfigChange(patch: Partial<ToolData["config"]>) {
    onChange({ config: { ...(data.config ?? defaultConfig(kind)), ...patch } as ToolData["config"] });
  }

  return (
    <div className="space-y-3">
      {/* Kind selector */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Tool Type</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={kind}
          onChange={(e) => handleKindChange(e.target.value as ToolKind)}
        >
          {(Object.entries(KIND_LABELS) as [ToolKind, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Per-kind panel */}
      {kind === "web-search" && (
        <WebSearchProperties
          config={(data.config ?? defaultConfig("web-search")) as WebSearchConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "code-exec" && (
        <CodeExecProperties
          config={(data.config ?? defaultConfig("code-exec")) as CodeExecConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "http" && (
        <HttpProperties
          config={(data.config ?? defaultConfig("http")) as HttpConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "database" && (
        <DatabaseProperties
          config={(data.config ?? defaultConfig("database")) as DatabaseConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
    </div>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/properties/tool-properties/
git commit -m "feat: add tool properties router with kind selector"
```

---

### Task 16: Wire ToolProperties into main properties panel

**Files:**
- Modify: `components/properties/index.tsx`

Replace the existing inline `{type === "tool" && ...}` block with the new `ToolProperties` component.

**Step 1: Add import at top of file (after existing imports)**

```typescript
import { ToolProperties } from "./tool-properties";
```

**Step 2: Replace the tool section (lines ~61-85)**

Find this block:
```tsx
      {type === "tool" && (
        <>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Kind</label>
            <Input
              value={(data as ToolData).kind || "http"}
              onChange={(e) => onChange({ kind: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Endpoint</label>
            <Input
              value={(data as ToolData).config?.endpoint || ""}
              onChange={(e) =>
                onChange({
                  config: {
                    ...((data as ToolData).config || {}),
                    endpoint: e.target.value,
                  },
                })
              }
            />
          </div>
        </>
      )}
```

Replace with:
```tsx
      {type === "tool" && (
        <ToolProperties
          data={data as ToolData}
          onChange={onChange}
        />
      )}
```

**Step 3: Remove unused `Input` import if it's now only used elsewhere** — check if Input is still used in other parts of the file first. If it is, leave it alone.

**Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add components/properties/index.tsx
git commit -m "feat: wire ToolProperties into main properties panel"
```

---

### Task 17: Update ToolNode visual on canvas

**Files:**
- Modify: `components/nodes/index.tsx` (ToolNode component, lines 166–184)

Show the tool kind as a more useful subtitle and show the first relevant config value.

**Step 1: Replace the ToolNode component**

Find and replace the `ToolNode` component:

```tsx
const KIND_SUBTITLES: Record<string, string> = {
  "web-search": "Web Search",
  "code-exec": "Code Execution",
  "http": "HTTP Request",
  "database": "Database (Mock)",
};

export const ToolNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as ToolData;
  const kind = d.kind ?? "web-search";
  const subtitle = KIND_SUBTITLES[kind] ?? kind;

  // Show a brief config summary
  let detail = "No config";
  const cfg = d.config as Record<string, unknown> | undefined;
  if (cfg) {
    if (kind === "web-search" && (cfg as { maxResults?: number }).maxResults) {
      detail = `${(cfg as { maxResults: number }).maxResults} results`;
    } else if (kind === "http" && (cfg as { url?: string }).url) {
      const url = (cfg as { url: string }).url;
      detail = url.length > 30 ? url.slice(0, 30) + "…" : url;
    } else if (kind === "code-exec" && (cfg as { code?: string }).code) {
      detail = "JS code ready";
    } else if (kind === "database" && (cfg as { query?: string }).query) {
      detail = "SQL query set";
    }
  }

  return (
    <NodeChrome
      title={d.name || "Tool"}
      subtitle={subtitle}
      color="bg-orange-600"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700">{detail}</div>
    </NodeChrome>
  );
};
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/nodes/index.tsx
git commit -m "feat: update ToolNode canvas display for new tool kinds"
```

---

### Task 18: Update palette default for Tool

**Files:**
- Modify: `components/palette/index.tsx`

Change the palette tool item default from `kind: "http"` to `kind: "web-search"` with proper default config.

**Step 1: Replace the Tool PaletteItem in palette**

Find:
```tsx
      <PaletteItem
        type="tool"
        label="Tool"
        meta={{
          name: "Tool",
          kind: "http",
          config: { endpoint: "https://api.example.com" },
        }}
      />
```

Replace with:
```tsx
      <PaletteItem
        type="tool"
        label="Tool"
        meta={{
          name: "Tool",
          kind: "web-search",
          config: { maxResults: 5 },
        }}
      />
```

**Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add components/palette/index.tsx
git commit -m "feat: update palette tool default to web-search"
```

---

### Task 19: Wire tool execution into parallel-runner

**Files:**
- Modify: `lib/execution/parallel-runner.ts`

Replace the current mock tool execution block with registry-based dispatch.

**Step 1: Add import at the top of parallel-runner.ts** (after existing imports)

```typescript
import "@/lib/tools/index"; // register all tools (side-effect import)
import { getTool } from "@/lib/tools/registry";
```

**Step 2: Replace the tool execution block**

Find (around line 277):
```typescript
    } else if (node.type === "tool") {
      // Tool execution
      const toolData = node.data as ToolData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);
      const endpoint = toolData?.config?.endpoint || "(no endpoint)";

      const logText = `🔧 ${toolData.name || "Tool"} [${toolData.kind || "tool"}]\nGET ${endpoint}\nBody: ${dependencyOutputs
        .join("\n")
        .slice(0, 120)}`;

      output = logText;
      setLogs((logs) => logs.concat(logText));
```

Replace with:
```typescript
    } else if (node.type === "tool") {
      const toolData = node.data as ToolData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);
      const input = dependencyOutputs.join("\n");
      const kind = toolData.kind ?? "web-search";
      const tool = getTool(kind);

      setLogs((logs) =>
        logs.concat(`🔧 ${toolData.name || "Tool"} [${kind}] — running…`)
      );

      if (!tool) {
        throw new Error(`Unknown tool kind: ${kind}`);
      }

      const result = await tool.execute(input, toolData.config ?? {});

      if (!result.success) {
        throw new Error(result.error ?? "Tool execution failed");
      }

      output = result.output;

      // Store result on node data for properties panel preview
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, lastResult: result.output } }
            : n
        )
      );

      setLogs((logs) => {
        const updated = [...logs];
        updated[updated.length - 1] =
          `🔧 ${toolData.name || "Tool"} [${kind}]\n${result.output.slice(0, 200)}${result.output.length > 200 ? "…" : ""}`;
        return updated;
      });
```

**Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```

Fix any type errors. Common issue: `ToolData` import may need updating since `config` type changed from `{ endpoint?: string }` to the union type. The `as ToolData` cast handles this at runtime; TypeScript may flag the `getTool(kind)` call if `kind` is `string | undefined` — add a fallback: `const kind = (toolData.kind ?? "web-search") as string`.

**Step 4: Commit**

```bash
git add lib/execution/parallel-runner.ts
git commit -m "feat: wire tool registry execution into parallel-runner"
```

---

### Task 20: Add web search sample workflow

**Files:**
- Modify: `lib/createSampleGraph.ts` (or check if there's a samples directory)

Check first:
```bash
ls lib/createSampleGraph.ts lib/addSample.ts 2>/dev/null
cat lib/createSampleGraph.ts | head -20
```

Add a new exported sample function that creates a `Prompt → Web Search → Agent → Result` workflow.

**Step 1: Read `lib/createSampleGraph.ts`** to understand the pattern, then add a `createWebSearchSample` function at the bottom:

```typescript
export function createWebSearchSample(): { nodes: TypedNode[]; edges: Edge[] } {
  const promptId = "ws-prompt" as Id;
  const searchId = "ws-search" as Id;
  const agentId = "ws-agent" as Id;
  const resultId = "ws-result" as Id;

  const nodes: TypedNode[] = [
    {
      id: promptId,
      type: "prompt",
      position: { x: 100, y: 100 },
      data: {
        name: "Search Topic",
        text: "latest advances in quantum computing 2025",
      },
    },
    {
      id: searchId,
      type: "tool",
      position: { x: 100, y: 250 },
      data: {
        name: "Web Search",
        kind: "web-search",
        config: { maxResults: 5 } as WebSearchConfig,
      },
    },
    {
      id: agentId,
      type: "agent",
      position: { x: 100, y: 400 },
      data: {
        name: "Summarizer",
        model: "openai/gpt-4o-mini",
        mode: "live",
        streaming: true,
        prompt: "Summarize the following search results into a concise 3-paragraph report:\n\n{{input}}",
      },
    },
    {
      id: resultId,
      type: "result",
      position: { x: 100, y: 580 },
      data: { name: "Research Report" },
    },
  ];

  const edges: Edge[] = [
    { id: "ws-e1", source: promptId, target: searchId, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "ws-e2", source: searchId, target: agentId, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "ws-e3", source: agentId, target: resultId, markerEnd: { type: MarkerType.ArrowClosed } },
  ];

  return { nodes, edges };
}
```

Import `WebSearchConfig` at the top of the file.

**Step 2: Check how samples are exposed** — look at `lib/addSample.ts` and the header component to see if there's a samples menu. If there is, add the new sample there. If not, just export it — it can be used later.

**Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```

**Step 4: Commit**

```bash
git add lib/createSampleGraph.ts
git commit -m "feat: add web search sample workflow"
```

---

### Task 21: Final typecheck and lint

**Step 1: Full typecheck**

```bash
pnpm typecheck
```

Fix any remaining errors before proceeding.

**Step 2: Lint**

```bash
pnpm lint
```

Fix any lint errors.

**Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve typecheck and lint errors for Phase 3"
```

---

### Task 22: Manual smoke test

Start the dev server and verify:

```bash
pnpm dev
```

**Checklist:**
1. App loads without console errors
2. Drag a Tool node onto canvas → kind defaults to "Web Search"
3. Properties panel shows "Tool Type" dropdown with 4 options
4. Switch to HTTP → URL/method fields appear
5. Switch to Code Exec → code editor textarea appears with amber notice
6. Switch to Database → SQL textarea + MOCK badge appear
7. Run a workflow with a Prompt → Web Search tool
   - Console shows "🔧 [web-search] — running…" then results
8. ToolNode on canvas shows "Web Search" subtitle after selection

**Step 4: Update CLAUDE.md** to reflect Phase 3 completion status — add Phase 3 to the completed phases section.

---

## Execution Notes

- All tool files go in `.worktrees/phase-3-tools/`
- The WebContainer instance is a browser singleton — it survives page navigation but not full reload
- The Brave API key must be in `.env` as `BRAVE_API_KEY` (not `NEXT_PUBLIC_`) — it's server-side only
- COOP/COEP headers break some third-party scripts; if needed, restrict to specific routes
- The `lastResult` field on ToolData persists after execution so the properties panel shows a preview even after workflow completes
