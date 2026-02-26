# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Agent Workflow Studio is a visual flowchart-based editor for designing and simulating multi-agent AI workflows. Built with Next.js, React Flow, and TypeScript, it allows users to drag-and-drop agents, tools, and outputs, connect them, and run simulations (mock or live mode).

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
There is no automated test suite currently configured. Manual testing guidance is available:
- See `TESTING_GUIDE.md` for comprehensive manual testing procedures (23 test scenarios)
- Test scenarios cover: basic execution, streaming, error handling, document processing, multi-provider support, execution controls, and error recovery
- Each test includes step-by-step instructions, expected results, and troubleshooting tips

## Architecture

### Core Execution Model

The application uses a **DAG (Directed Acyclic Graph) execution model**:

1. **Topological Sorting** (`lib/topoSort.ts`): Before execution, nodes are sorted topologically to ensure dependencies execute before dependents. The system detects cycles and prevents execution if found.

2. **Sequential Execution** (`lib/run.ts`): Nodes execute in topological order. Each node:
   - Gathers outputs from all incoming edges (dependencies)
   - Processes its logic (agent, tool, or output)
   - Stores its output for downstream nodes
   - Updates UI logs in real-time

3. **Data Flow**: Node outputs are passed via the `nodeOutputs` map, keyed by node ID. When a node executes, it receives concatenated inputs from all parent nodes.

### Node Types

The system has 6 node types (see `components/nodes/index.tsx`):

- **Prompt**: Input node providing initial text/instructions
- **Document**: File upload node (PDF, TXT, MD, code files) with automatic text extraction
- **Chunker**: Splits document content into chunks (fixed size or semantic)
- **Agent**: Executes LLM prompts with a specified model (OpenAI, Anthropic, Google AI, Ollama)
- **Tool**: Makes HTTP calls or executes functions (currently simulated)
- **Result**: Terminal node that displays final workflow output

Each node type has its own data structure in `types/`:
- `types/prompt.ts` - PromptData (name, text)
- `types/document.ts` - DocumentData (name, content, fileName, fileType, fileSize)
- `types/chunker.ts` - ChunkerData (name, strategy, chunkSize, overlap)
- `types/agent.ts` - AgentData (name, model, prompt, mode, streaming, temperature, maxTokens)
- `types/tool.ts` - ToolData (name, kind, config)
- `types/output.ts` - OutputData (name, preview)

All node types include an `executionState` field ('idle' | 'executing' | 'completed' | 'error') and optional `executionError` for error handling.

### State Management

Global state lives in `app/page.tsx` using React useState:
- `nodes`: Array of TypedNode (visual graph nodes)
- `edges`: Array of Edge (connections between nodes)
- `selectedId`: Currently selected node ID
- `logs`: Console output from workflow runs

The app uses React Flow's built-in state management for viewport interactions (pan, zoom, drag).

### Component Organization

```
app/
  layout.tsx       # Root layout with Tailwind/fonts
  page.tsx         # Main application container with state + execution control

components/
  viewport/        # React Flow canvas (drag-and-drop, connections)
  nodes/           # Node renderers (AgentNode, ToolNode, DocumentNode, ChunkerNode, etc.)
  palette/         # Left sidebar with draggable node templates
  properties/      # Right sidebar for editing selected node
  console/         # Bottom panel showing execution logs with auto-scroll
  toolbar/         # Top toolbar (Run, Pause, Resume, Cancel, Clear)
  header.tsx       # Application header with settings and export/import
  settings/        # Settings modal for API key management
  error-dialog.tsx # Error recovery dialog (Retry, Skip, Abort)
  ui/              # shadcn/ui components (button, input, textarea, dialog, etc.)

lib/
  run.ts           # DAG execution engine with parallel support, streaming, error recovery
  topoSort.ts      # Topological sort + cycle detection
  exportJSON.ts    # Download workflow as JSON
  importJSON.ts    # Load workflow from JSON file
  createSampleGraph.ts  # Generate example workflow
  addSample.ts     # Helper to add sample to state
  utils.ts         # Tailwind utility functions
  providers/       # LLM provider abstractions (OpenAI, Anthropic, Google, Ollama)
    base.ts        # Base provider interface with streaming support
    registry.ts    # Provider registration and lookup
    pricing.ts     # Cost calculation for all models
    openai.ts, anthropic.ts, google.ts, ollama.ts  # Provider implementations
  storage/
    api-keys.ts    # localStorage API key management
  document/
    pdf-parser.ts  # PDF text extraction using pdfjs-dist
    chunker.ts     # Document chunking (fixed and semantic strategies)

types/
  index.ts         # Type exports
  graph.ts         # NodeData, TypedNode, Id types
  agent.ts         # AgentData with mode, streaming, temperature, maxTokens
  tool.ts          # ToolData
  output.ts        # OutputData (ResultNode)
  prompt.ts        # PromptData
  document.ts      # DocumentData (file upload and content)
  chunker.ts       # ChunkerData (chunking strategies)
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
8. Update `lib/run.ts` execution logic to handle new type
   - Add case to main execution switch statement
   - Update node state to 'executing' before processing
   - Update node state to 'completed' or 'error' after processing
   - Handle errors with try/catch and error recovery flow

### Execution Flow Walkthrough

When user clicks "Run":
1. `run()` in `app/page.tsx` calls `runLib()` from `lib/run.ts`
2. Logs are cleared, topological sort validates no cycles
3. For each node in topological order:
   - Set node state to 'executing' (blue pulsing border)
   - Collect outputs from all incoming edges
   - Execute node logic based on type:
     - **Prompt**: Returns text directly
     - **Document**: Returns file content (PDF extraction if needed)
     - **Chunker**: Splits input into chunks using chosen strategy
     - **Agent** (Mock): Returns random string
     - **Agent** (Live): Calls real LLM provider API
       - Supports streaming (token-by-token display)
       - Tracks cost and token usage
       - Handles errors with retry/skip/abort options
     - **Tool**: Currently returns mock data
     - **Result**: Displays final output
   - Store output in `nodeOutputs` map
   - Update node state to 'completed' (green border) or 'error' (red border)
   - Append logs with color-coded prefixes (🤖 Agent, 📄 Document, etc.)
   - 200ms delay for visual feedback
4. "Done" message logged with total cost if any API calls were made

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
- **LLM SDKs**:
  - `openai` (^6.16.0) - OpenAI API client
  - `@anthropic-ai/sdk` (^0.71.2) - Anthropic API client
  - `@google/generative-ai` (^0.24.1) - Google AI client
- **Document Processing**: `pdfjs-dist` (^5.4.530) - PDF text extraction

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
- **Sequential execution**: Nodes execute one at a time (parallel planned for Phase 2A)
- **No loops**: Cannot create workflows that loop back (cycle detection prevents this)
- **No conditional routing**: All connected nodes execute (router node planned for Phase 2A)
- **Ephemeral workflows**: Workflows not saved between sessions (import/export available)
- **Client-side only**: All computation in browser, no backend API

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
2. **Anthropic** (3 models): claude-opus-4, claude-sonnet-4, claude-haiku-4
3. **Google AI** (3 models): gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
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
Multi-model LLM support, document processing, streaming, error recovery, and execution controls are fully implemented and tested. See `PHASE1_COMPLETE.md` for detailed implementation summary.

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

### Future Phases
- Phase 3: Tool integrations (web search, RAG, HTTP calls)
- Phase 4: Workflow templates and UX polish
- Phase 5: Collaboration features
- Phase 6: Testing infrastructure

See `docs/implementation-plans/ROADMAP.md` for complete roadmap.

## Development Notes

- All components use `"use client"` directive (client-side rendering)
- Turbopack is enabled for dev and build (faster than Webpack)
- No backend - all execution happens client-side
- API keys stored in localStorage (plain text, encryption planned for Phase 2)
- Mock mode available for all node types (no API keys required)
- Workflow state is ephemeral (not persisted to localStorage/database)
- Streaming uses AsyncIterableIterator for memory-efficient token processing
- Cost tracking uses token counts and pricing table (accurate as of Jan 2025)
- Execution is currently sequential (parallel execution planned for Phase 2A)
