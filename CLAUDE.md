# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

inference-sandbox is a visual, node-based editor for designing, executing, and evaluating multi-agent AI workflows. Built with Next.js, React Flow, and TypeScript.

Previously named `dnd-ai-prototype`. See `docs/superpowers/specs/` for design specs.

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev             # Start development server with Turbopack (localhost:3000)
pnpm build           # Build for production with Turbopack
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm typecheck       # Run TypeScript type checking
```

### Testing

```bash
pnpm test          # run unit tests (Vitest)
pnpm test:watch    # watch mode
pnpm typecheck     # TypeScript type check
```

Unit tests live in `tests/`. Manual test scenarios are in `docs/TESTING_GUIDE.md`.

## Architecture

### Core Execution Model

The application uses a **DAG (Directed Acyclic Graph) execution model**:

1. **Topological Sorting** (`lib/topoSort.ts`): Before execution, nodes are sorted topologically to ensure dependencies execute before dependents. The system detects cycles and prevents execution if found.

2. **Parallel Execution** (`lib/execution/parallel-runner.ts`): Nodes are grouped into levels by `lib/execution/levels.ts`. All nodes within the same level execute concurrently; levels execute in sequence. Each node:
   - Gathers outputs from all incoming edges (dependencies)
   - Processes its logic (agent, tool, router, loop, etc.)
   - Stores its output for downstream nodes
   - Updates UI logs in real-time

3. **Data Flow**: Node outputs are passed via the `nodeOutputs` map, keyed by node ID. When a node executes, it receives concatenated inputs from all parent nodes.

### Node Types

The system has 10 node types (see `components/nodes/index.tsx`):

- **Prompt**: Input node providing initial text/instructions
- **Document**: File upload node (PDF, TXT, MD, code files) with automatic text extraction
- **Chunker**: Splits document content into chunks (fixed size or semantic)
- **Agent**: Executes LLM prompts with a specified model (OpenAI, Anthropic, Google AI, Ollama)
- **Tool**: Executes real integrations — Web Search (Brave API), HTTP requests, JavaScript code (WebContainers), mock Database queries
- **Router**: Conditional branching — keyword, sentiment, LLM-as-Judge, or JSON-field strategies
- **Loop**: Iterates a workflow section up to N times; supports keyword or LLM-judge break conditions
- **Memory**: Reads/writes named keys in workflow-scoped or global memory (`MemoryManager`)
- **Human Review**: Pauses execution for manual approval — single or multi-reviewer, approve/reject or edit-and-approve modes
- **Result**: Terminal node that displays final workflow output

Each node type has its own data structure in `types/`:
- `types/prompt.ts` - PromptData (name, text)
- `types/document.ts` - DocumentData (name, content, fileName, fileType, fileSize)
- `types/chunker.ts` - ChunkerData (name, strategy, chunkSize, overlap)
- `types/agent.ts` - AgentData (name, model, prompt, mode, streaming, temperature, maxTokens)
- `types/tool.ts` - ToolData (name, kind, config)
- `types/router.ts` - RouterData (name, strategy, routes, executionState)
- `types/loop.ts` - LoopData (name, maxIterations, breakCondition, executionState)
- `types/memory.ts` - MemoryData (name, scope, keys)
- `types/human-review.ts` - HumanReviewData (name, instructions, mode, multiReview settings)
- `types/output.ts` - OutputData (name, preview)
- `types/run.ts` - StoredRun, StoredRunOutput (run history persistence)
- `types/annotation.ts` - Annotation (thumbs, rating, notes, runId, provider)
- `types/run-metrics.ts` - NodeMetric, ProviderMetrics, RunStats (observability)

All node types include an `executionState` field ('idle' | 'executing' | 'completed' | 'error') and optional `executionError` for error handling.

### State Management

Global state is managed by a **Zustand store** at `lib/store/workflow-store.ts` (`useWorkflowStore`). Key slices:
- `nodes` / `edges`: Workflow graph
- `executionStatus` / `executionControl`: Run lifecycle ref
- `logs`: Console output
- `compareMode` / `compareProviders` / `compareLogs`: Compare mode state
- `runStats` / `statsOpen`: Observability panel
- `workflowName`: Editable name displayed in the header
- `currentError`: Error dialog state
- `settingsOpen`: Settings modal visibility

Components read from the store with selectors; `app/page.tsx` calls store actions directly for execution control. The app also uses React Flow's built-in state management for viewport interactions (pan, zoom, drag).

### Component Organization

```
app/
  layout.tsx            # Root layout with nav bar (Editor | History | Templates)
  page.tsx              # Main editor — wires store to execution and UI
  history/page.tsx      # Run history page (StatsBar, TrendCharts, RunTable, RunDetailDrawer)
  templates/page.tsx    # Template gallery (built-in + user-saved templates)
  api/runs/             # Run CRUD + stats + export/import API routes
  api/templates/        # Template CRUD API routes

components/
  viewport/             # React Flow canvas (drag-and-drop, connections)
  nodes/                # All 10 node renderers, NodeChrome wrapper
  palette/              # Left sidebar with draggable node templates
  properties/           # Right sidebar for editing selected node (per-type panels)
  console/              # Execution log panel with auto-scroll
  compare-console/      # N-column compare log panel with word/sentence diff overlay
  toolbar/              # Top toolbar + CompareControls
  header.tsx            # Workflow name input + Toolbar
  settings/             # API key management modal
  error-dialog.tsx      # Error recovery dialog (Retry, Skip, Abort)
  observability-panel/  # Collapsible stats panel (per-node latency, tokens, cost)
  annotation/           # Rating bar (👍/👎, stars, notes) + CSV export
  templates/            # TemplateCard, SaveTemplateModal
  ui/                   # shadcn/ui components

lib/
  execution/
    parallel-runner.ts  # DAG execution engine — levels, pause/resume/cancel, metrics
    levels.ts           # Groups nodes into parallel execution levels
    compare-runner.ts   # N-provider parallel compare runs
    route-evaluator.ts  # Router strategy evaluation (keyword, sentiment, LLM-judge, JSON)
    loop-evaluator.ts   # Loop break condition evaluation
  providers/            # LLM provider abstractions (OpenAI, Anthropic, Google, Ollama)
  tools/                # Tool dispatch (web-search, http, code-exec, database)
  db/                   # SQLite via better-sqlite3 (runs-repo, templates-repo, getDb/migrate)
  store/
    workflow-store.ts   # Zustand store (primary app state)
  diff/
    word-diff.ts        # LCS-based word-level diff
    sentence-diff.ts    # LCS-based sentence-level diff
  document/             # PDF parsing and chunking
  templates/
    built-in.ts         # BUILT_IN_TEMPLATES static array (11 entries)
  storage/              # API key management (localStorage)
  memory/               # MemoryManager class
  audit/                # AuditLog class
  supabase/             # Optional Supabase client
  topoSort.ts           # Topological sort + cycle detection
  exportJSON.ts         # Workflow download
  importJSON.ts         # Workflow file import
  parseWorkflow.ts      # Pure workflow JSON parsing (testable)
```

### JSON Flow Format

Workflows are saved/loaded as JSON with this structure:
```json
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "agent" | "tool" | "result" | "prompt",
      "position": { "x": 100, "y": 100 },
      "data": { /* type-specific fields */ }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "node-id",
      "target": "node-id",
      "markerEnd": { "type": "arrowclosed" }
    }
  ]
}
```

### Drag-and-Drop Flow

1. User drags PaletteItem from left sidebar (`components/palette-item/`)
2. Palette item encodes node type + metadata in `dataTransfer`
3. ViewPort's `onDrop` handler (`components/viewport/index.tsx:62-94`):
   - Converts screen coordinates to flow position
   - Generates unique ID
   - Creates new node with default data
   - Adds to nodes array

### Path Aliases

`@/*` resolves to the root directory (configured in `tsconfig.json`).

## Important Implementation Patterns

### Streaming Response Handling
When implementing streaming LLM calls:
1. Use `AsyncIterableIterator<string>` for the stream
2. Accumulate tokens in a buffer for complete response storage
3. Update logs incrementally with `setLogs(logs => [...logs.slice(0, -1), updatedLine])`
4. Add streaming cursor (`▌`) to show active streaming
5. Check `executionControl.current` for cancellation during streaming
6. Handle errors by catching and showing error dialog

### Console Auto-Scroll Behavior
The console (`components/console/index.tsx`) implements smart auto-scrolling:
- Auto-scrolls during streaming to show latest output
- Detects manual user scrolling and disables auto-scroll
- Re-enables auto-scroll when user scrolls to bottom
- Uses `scrollHeight - scrollTop - clientHeight < 10` threshold

### Error Recovery Flow
1. When node execution throws error, set `executionState: 'error'` and `executionError: message`
2. Call `setCurrentError({ nodeId, nodeName, message })` to show error dialog
3. Set `executionControl.current = 'paused'` to halt execution
4. Wait for user action via `errorRecoveryAction.current`
5. Handle action:
   - **retry**: Reset node to 'idle', re-execute from same node
   - **skip**: Leave node in 'error', continue to next node
   - **abort**: Reset all nodes, exit execution loop

### State Update Batching
When updating node states during execution:
```typescript
setNodes(nodes => nodes.map(n =>
  n.id === nodeId
    ? { ...n, data: { ...n.data, executionState: 'executing' } }
    : n
));
```
Always use functional updates for React state to ensure latest state is used.

## Key Implementation Details

### Adding a New Node Type

1. Define data interface in `types/your-type.ts`
   - Include `executionState?: 'idle' | 'executing' | 'completed' | 'error'`
   - Include `executionError?: string` for error messages
2. Export from `types/index.ts` and add to `NodeData` union in `types/graph.ts`
3. Create node component in `components/nodes/index.tsx` using `NodeChrome` wrapper
   - Pass `executionState` to NodeChrome for visual state display
4. Add to `nodeTypes` export in same file
5. Create properties panel in `components/properties/your-type-properties.tsx`
6. Add to properties router in `components/properties/index.tsx`
7. Add palette item in `components/palette/index.tsx` with appropriate icon
8. Update `lib/execution/parallel-runner.ts` execution logic to handle new type
   - Add case to the main node dispatch switch
   - Update node state to 'executing' before processing
   - Update node state to 'completed' or 'error' after processing
   - Handle errors with try/catch and error recovery flow

### Execution Flow Walkthrough

When user clicks "Run":
1. `run()` in `app/page.tsx` invokes `runParallel()` from `lib/execution/parallel-runner.ts` (via the Zustand store's `run` action)
2. Logs are cleared, topological sort validates no cycles, nodes grouped into parallel levels
3. For each level (concurrent within a level, sequential across levels):
   - Set node state to 'executing' (blue pulsing border)
   - Collect outputs from all incoming edges
   - Execute node logic based on type:
     - **Prompt**: Returns text directly
     - **Document**: Returns file content (PDF extraction if needed)
     - **Chunker**: Splits input into chunks using chosen strategy
     - **Agent** (Mock): Returns random string
     - **Agent** (Live): Calls real LLM provider API — streaming, cost tracking, error recovery
     - **Tool**: Dispatches to real integration (web-search, http, code-exec, database)
     - **Router**: Evaluates routes, executes only the matching branch
     - **Loop**: Runs the loop body up to maxIterations, checking break condition each pass
     - **Memory**: Reads or writes named keys via `MemoryManager`
     - **Human Review**: Pauses execution, waits for reviewer decision in the UI
     - **Result**: Displays final output
   - Store output in `nodeOutputs` map
   - Update node state to 'completed' (green border) or 'error' (red border)
   - Append logs with color-coded prefixes (🤖 Agent, 📄 Document, 🔀 Router, etc.)
4. Run auto-saved to SQLite history; "Done" logged with total cost

**Execution Controls:**
- **Pause**: Sets status to 'paused', completes current node, waits for resume
- **Resume**: Changes status back to 'running', continues with next node
- **Cancel**: Sets status to 'cancelled', resets all nodes to 'idle', stops execution

**Error Recovery:**
- On error: Pause execution, show error dialog with node name and message
- **Retry**: Re-execute the failed node after user fixes the issue
- **Skip**: Continue to next nodes, leave failed node in error state
- **Abort**: Cancel entire workflow, reset all nodes to idle

### React Flow Integration

The app uses `@xyflow/react` (v12.x) for the visual canvas:
- `ReactFlowProvider` wraps entire app in `app/page.tsx`
- `useReactFlow` hook in ViewPort provides `screenToFlowPosition` for drop handling
- Node positions are absolute coordinates, managed by React Flow
- Edges automatically route between node handles (top = source, bottom = target)

## Technology Stack

- **Framework**: Next.js 16.1.4 (App Router, Turbopack)
- **UI Library**: React 19.1.0
- **Canvas**: React Flow (@xyflow/react 12.8.6)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Icons**: lucide-react
- **Language**: TypeScript 5 (strict mode)
- **Package Manager**: pnpm
- **State Management**: Zustand
- **Database**: better-sqlite3 (local SQLite — run history, templates)
- **Charts**: recharts (run history trend charts)
- **LLM SDKs**:
  - `openai` (^6.16.0) - OpenAI API client
  - `@anthropic-ai/sdk` (^0.71.2) - Anthropic API client
  - `@google/generative-ai` (^0.24.1) - Google AI client
- **Document Processing**: `pdfjs-dist` (^5.4.530) - PDF text extraction
- **Code Execution**: WebContainers API (in-browser Node.js sandbox)

## Common Issues & Troubleshooting

### API Key Issues
- **Invalid key error**: Verify key is correct in Settings, test connection before running
- **Rate limit exceeded**: Wait 60 seconds, or upgrade API plan
- **Keys not persisting**: Check localStorage is enabled (not incognito mode)

### Execution Issues
- **Nodes won't execute**: Verify nodes are connected with visible arrows
- **Cycle detected error**: Remove circular connections between nodes
- **Long execution time**: Large documents or complex prompts take longer; consider chunking
- **High costs**: Switch to cheaper models (gpt-4o-mini, claude-haiku-4) or use mock mode

### Document Issues
- **PDF extraction fails**: Some PDFs have image-only text; try OCR or different file
- **Upload fails**: Check file size is under 10MB
- **Empty preview**: File may be corrupt or encoded differently

### Streaming Issues
- **No streaming visible**: Verify "Streaming" checkbox is enabled in agent properties
- **Streaming cuts off**: May have hit max tokens limit; increase in properties

### Visual Issues
- **Nodes not connecting**: Drag from top handle (source) to bottom handle (target)
- **Console not scrolling**: Auto-scroll disabled; scroll to bottom to re-enable
- **Execution states not updating**: Refresh page; this is a rare React state sync issue

## Known Limitations

### Current Architecture
- **Ephemeral canvas**: Workflow nodes/edges are not persisted between sessions — use Export JSON or Save as Template to preserve work
- **Run history is local**: SQLite DB lives on the server process; not shared across instances or deployments
- **No user authentication**: Anyone with browser access can use stored keys and see run history

### Security & Storage
- **Plain text API keys**: Keys stored unencrypted in localStorage
- **No user authentication**: Anyone with browser access can use stored keys
- **Audit trail is session-scoped**: The AuditLog captures events for the current session only; it is not persisted across page reloads (export to JSON before closing the tab to retain history)

### Provider Limitations
- **Ollama**: Requires local installation, models must be pulled manually
- **Context windows**: Very large documents may exceed model limits (varies by model)
- **Streaming**: Not all models support streaming (depends on provider implementation)

## Provider System

The application supports multiple LLM providers through a unified abstraction layer:

### Provider Architecture
- **Base Interface** (`lib/providers/base.ts`): Defines common methods for all providers
  - `complete()`: Non-streaming completion
  - `completeStream()`: Streaming completion (returns AsyncIterableIterator)
  - `testConnection()`: Validates API key
- **Registry** (`lib/providers/registry.ts`): Centralized provider lookup by ID
- **Pricing** (`lib/providers/pricing.ts`): Cost calculation for all models

### Supported Providers
1. **OpenAI** (4 models): gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
2. **Anthropic** (3 models): claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
3. **Google AI** (3 models): gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash
4. **Ollama** (local models): Dynamic model discovery, no API key required

### Agent Execution Modes
- **Mock Mode**: Returns random strings, no API calls, free
- **Live Mode**: Calls actual LLM APIs, supports streaming, tracks costs

### Adding a New Provider
1. Create provider class implementing `LLMProvider` interface in `lib/providers/your-provider.ts`
2. Implement `complete()`, `completeStream()`, and `testConnection()` methods
3. Add pricing info to `lib/providers/pricing.ts`
4. Register in `lib/providers/index.ts` with `registerProvider()`
5. Add to model selector in agent properties UI

## Document Processing

### Document Node
- Supports file types: PDF, TXT, MD, JS, TS, PY, JSON, etc.
- **PDF Extraction**: Uses `pdfjs-dist` to extract text from PDFs (multi-page support)
- File size limit: 10MB (configurable)
- Content preview in properties panel (first 1000 characters)
- Passes full text content to downstream nodes

### Chunker Node
- **Fixed Strategy**: Splits text into chunks of fixed character size with overlap
- **Semantic Strategy**: Splits at sentence boundaries while respecting max chunk size
- Configurable parameters: chunk size (100-2000 chars), overlap (0-500 chars)
- Output format: Chunks separated by `---CHUNK---` delimiter
- Visual indicator shows chunk count on canvas

## Execution State Management

All nodes track execution state for visual feedback:
- **idle** (gray border): Node hasn't executed yet
- **executing** (blue pulsing border): Node is currently running
- **completed** (green border): Node finished successfully
- **error** (red border): Node failed with error

State updates trigger React Flow re-renders for smooth visual transitions.

## Current Project Status

### Phase 1 - Complete ✅
Multi-model LLM support, document processing, streaming, error recovery, and execution controls are fully implemented and tested.

Key features:
- 4 LLM providers (OpenAI, Anthropic, Google AI, Ollama)
- 14 models supported
- Document upload with PDF extraction
- Document chunking (fixed and semantic)
- Streaming token display
- Cost tracking
- Execution controls (pause, resume, cancel)
- Error recovery (retry, skip, abort)
- Visual execution state indicators

### Phase 2A - Complete ✅
Core orchestration features. Key features:
- Parallel execution (independent nodes execute concurrently)
- Router node (conditional branching based on keywords, sentiment, or LLM-as-Judge)
- JSON-field routing support

### Phase 2B - Complete ✅
Advanced router and loop features. Key features:
- LLM-as-Judge routing (agent-evaluated conditional branching)
- JSON-field routing (route based on structured output fields)
- Loop / iteration node support

### Phase 2C - Complete ✅
Memory, human oversight, and audit trail. Key features:
- **Memory system**: `MemoryManager` class with global and workflow-scoped namespaces; Memory node type for read/write operations; Memory Inspector panel in the properties sidebar; Memory visualization overlay on the canvas
- **Human Review node**: Single and multi-reviewer support; approval rules (1-of-N, all-must-approve, M-of-N); edit-and-approve mode allowing reviewers to modify content before passing it downstream
- **Audit Trail**: `AuditLog` class capturing every node execution event; Audit viewer UI with filtering and search; JSON export of the full audit log

### Phase 3 (Run History) - Complete ✅
SQLite-backed run history and observability. Key features:
- **Run auto-save**: Every completed run saved to local SQLite DB
- **History page** (`/history`): StatsBar, TrendCharts (recharts), RunTable with search/filter/pagination, RunDetailDrawer
- **Run export/import**: JSON round-trip for sharing runs
- **ObservabilityPanel**: Per-node timing, token counts, cost per provider (shown via Stats toolbar button)
- **AnnotationBar**: 👍/👎, 1–5 stars, freetext notes — persisted to localStorage, CSV export

### Phase 4 (Templates) - Complete ✅
Workflow template system. Key features:
- **Templates page** (`/templates`): Gallery of 11 built-in templates + user-saved templates
- **Save as Template**: Toolbar button saves current workflow to SQLite with name and description
- **TemplateCard**: Node-type badges, load and delete actions
- **Confirmation dialog**: Warns before replacing a non-empty canvas
- **Fresh IDs on load**: Node/edge IDs regenerated on each load to prevent collisions

### Future Phases
- **Phase 5**: Collaboration — shareable run URLs, multi-user annotations, Supabase-backed persistence
- **Phase 6**: E2E testing infrastructure (Playwright) — deferred until product stabilised

## Development Notes

- Most components use `"use client"` directive; library modules (lib/) are server-safe
- Turbopack is enabled for dev and build (faster than Webpack)
- API keys stored in localStorage (plain text — authentication planned for Phase 5)
- Mock mode available for all agent nodes (no API keys required)
- Workflow canvas is ephemeral — use Export JSON or Save as Template to persist
- Run history and templates persist to SQLite via better-sqlite3 (server-side, Next.js API routes)
- Streaming uses AsyncIterableIterator for memory-efficient token processing
- Cost tracking uses token counts and pricing table (`lib/providers/pricing.ts`)
- Independent nodes at the same DAG level execute in parallel (`Promise.allSettled` per level)
- Compare mode runs the same workflow against N providers concurrently (`runCompare` in `lib/execution/compare-runner.ts`)
