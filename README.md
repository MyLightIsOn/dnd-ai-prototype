
---
# Multi-Agent Workflow Studio

> A visual editor for designing, running, and observing multi-agent AI workflows — entirely in the browser, no backend required.

---

<img src="docs/screenshot.png" alt="Multi-Agent Workflow Studio canvas showing connected agent nodes" width="720" />

---

## What It Is

Multi-Agent Workflow Studio is a **node-based visual programming environment** for AI orchestration. You build workflows by connecting typed nodes on a canvas — documents flow into chunkers, chunkers feed agents, agents route to other agents, and memory persists state across the graph.

The focus is on making the mechanics of agentic AI **visible and interactive**: you can watch execution propagate through the graph in real time, see tokens stream in the console as they arrive, pause at human review checkpoints, and inspect the memory state mid-run.

Everything runs client-side. No server, no database, no accounts.

---

## Technical Highlights

### DAG Execution Engine

Workflows are directed acyclic graphs. Before any run, nodes are sorted topologically (`lib/topoSort.ts`) so dependencies always execute before dependents. The engine detects cycles and rejects invalid graphs before execution begins.

Independent nodes that share no data dependency execute in parallel — the engine groups nodes by their topological "level" and fires them concurrently with `Promise.allSettled`.

### Streaming LLM Integration

Agent nodes stream tokens directly to the console using `AsyncIterableIterator<string>`. The UI accumulates tokens into the last log line in real time, with a blinking cursor (`▌`) to indicate active streaming. Each provider implements the same `completeStream()` interface, so streaming works identically across OpenAI, Anthropic, Google AI, and Ollama.

### Provider Abstraction

All LLM providers implement a common interface (`lib/providers/base.ts`):

```ts
interface LLMProvider {
  complete(prompt: string, options: CompletionOptions): Promise<string>;
  completeStream(prompt: string, options: CompletionOptions): AsyncIterableIterator<string>;
  testConnection(): Promise<boolean>;
}
```

Adding a new provider means creating one file and calling `registerProvider()`. The registry dispatches model IDs to the correct provider at runtime.

### Conditional Routing

The Router node evaluates incoming content and dispatches to one of N downstream branches. Three routing strategies are implemented:

- **Keyword match** — routes when the input contains a configured string
- **Sentiment** — classifies as positive/negative/neutral using a lightweight heuristic
- **LLM-as-Judge** — sends the input and a decision prompt to a real LLM, then parses its structured response to determine the route

### Memory System

A `MemoryManager` class (`lib/memory.ts`) provides a key-value store with two scopes: `workflow` (reset each run) and `global` (persists across runs). Memory nodes can read or write values. Agent prompts can reference memory keys via template syntax. A Memory Inspector panel shows the live state during execution.

### Human-in-the-Loop

Human Review nodes pause execution and surface a modal with the current output. Reviewers can approve, reject, or edit the content before the workflow continues. Multiple reviewers are supported with configurable approval rules (first-to-approve, unanimous, M-of-N). Every intervention is captured in an append-only `AuditLog` that can be exported as JSON.

### Error Recovery

When a node throws (rate limit, invalid key, network timeout), execution pauses and an error dialog presents three options: **Retry** the failed node, **Skip** it and continue downstream, or **Abort** the entire run. The engine resumes correctly from whichever branch the user chooses.

---

## Node Types

| Node | Purpose |
|------|---------|
| **Prompt** | Text input — the starting point of a workflow |
| **Document** | File upload (PDF, TXT, MD, code) with automatic text extraction |
| **Chunker** | Splits document content — fixed-size with overlap, or sentence-boundary semantic splitting |
| **Agent** | LLM call — configurable model, temperature, max tokens, mock/live mode, streaming |
| **Router** | Conditional branch — keyword, sentiment, or LLM-as-Judge routing |
| **Loop** | Iterates a subgraph up to a configured limit |
| **Memory** | Reads or writes a named value in workflow or global scope |
| **Human Review** | Pauses for human approval, editing, or rejection |
| **Result** | Terminal node — displays the final workflow output |

---

## Supported Providers & Models

| Provider | Models |
|----------|--------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| **Anthropic** | claude-opus-4, claude-sonnet-4, claude-haiku-4 |
| **Google AI** | gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash |
| **Ollama** | Any locally installed model (auto-discovered) |

API keys are stored in `localStorage` only — never transmitted anywhere except to the provider's own API endpoint.

---

## Architecture

```
app/
  page.tsx              # Root state (nodes, edges, logs) + execution wiring

components/
  viewport/             # React Flow canvas — drag/drop, connections, pan/zoom
  nodes/                # Visual renderers for each node type
  palette/              # Draggable node templates (left sidebar)
  properties/           # Node configuration panel (right sidebar)
  console/              # Execution log with real-time streaming display
  toolbar/              # Run / Pause / Resume / Cancel controls

lib/
  run.ts                # DAG execution engine — parallel, streaming, error recovery
  topoSort.ts           # Topological sort + cycle detection
  memory.ts             # MemoryManager — workflow and global scoping
  audit.ts              # AuditLog — append-only event capture
  providers/            # LLM adapters: openai, anthropic, google, ollama
    base.ts             # Provider interface
    registry.ts         # Runtime provider lookup
    pricing.ts          # Per-model cost calculation
  document/
    pdf-parser.ts       # PDF text extraction via pdfjs-dist
    chunker.ts          # Fixed and semantic chunking strategies
  exportJSON.ts / importJSON.ts   # Workflow serialization

types/                  # TypeScript interfaces for all node data types
```

State lives in React `useState` at the app root and flows down as props. React Flow manages viewport interactions. No external state library.

---

## Workflow Format

Workflows serialize to plain JSON and can be imported/exported from the toolbar:

```json
{
  "nodes": [
    {
      "id": "a1",
      "type": "agent",
      "position": { "x": 300, "y": 200 },
      "data": {
        "name": "Summarizer",
        "model": "claude-haiku-4",
        "mode": "live",
        "streaming": true,
        "temperature": 0.7,
        "prompt": "Summarize the following:\n\n{{input}}"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "doc1", "target": "a1" }
  ]
}
```

---

## Quickstart

```bash
git clone https://github.com/lawrencemle/multi-agent-workflow-studio.git
cd multi-agent-workflow-studio
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The canvas loads with a sample workflow.

**Mock mode works with no API keys.** To run live:

1. Click the gear icon → add your API key(s)
2. Select a node → set mode to `live`
3. Press **Run**

---

## Tech Stack

| | |
|--|--|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict) |
| **Canvas** | React Flow (@xyflow/react 12) |
| **UI** | Tailwind CSS 4 + shadcn/ui |
| **Icons** | lucide-react |
| **LLM SDKs** | openai, @anthropic-ai/sdk, @google/generative-ai |
| **PDF parsing** | pdfjs-dist |
| **Package manager** | pnpm |

---

## Project Status

| Phase | Status      |
|-------|-------------|
| Phase 1 — Multi-model providers, document processing, streaming, execution controls | ✅ Complete  |
| Phase 2A — Parallel execution, Router node, Loop node | ✅ Complete  |
| Phase 2B — LLM-as-Judge routing, JSON-field routing, loop improvements | ✅ Complete  |
| Phase 2C — Memory system, Human Review node, Audit Trail | ✅ Complete  |
| Phase 3 — Tool integrations (web search, HTTP, code execution) | ✅ Complete  |
| Phase 4 — Workflow templates, UX polish, undo/redo | In progress |

---

## License

MIT © 2025 Lawrence Moore
