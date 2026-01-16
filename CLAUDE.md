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

Note: There is no test suite currently configured.

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

The system has 4 node types (see `components/nodes/index.tsx`):

- **Agent**: Executes LLM prompts with a specified model
- **Tool**: Makes HTTP calls or executes functions (currently simulated)
- **Result**: Terminal node that displays final workflow output
- **Prompt**: Input node providing initial text/instructions

Each node type has its own data structure in `types/`:
- `types/agent.ts` - AgentData (name, model, prompt)
- `types/tool.ts` - ToolData (name, kind, config)
- `types/output.ts` - OutputData (name, preview)
- `types/prompt.ts` - PromptData (name, text)

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
  page.tsx         # Main application container with state

components/
  viewport/        # React Flow canvas (drag-and-drop, connections)
  nodes/           # Node renderers (AgentNode, ToolNode, etc.)
  palette/         # Left sidebar with draggable node templates
  properties/      # Right sidebar for editing selected node
  console/         # Bottom panel showing execution logs
  header.tsx       # Top toolbar (Run, Clear, Import/Export, Sample)
  ui/              # shadcn/ui components (button, input, textarea)

lib/
  run.ts           # DAG execution engine
  topoSort.ts      # Topological sort + cycle detection
  exportJSON.ts    # Download workflow as JSON
  importJSON.ts    # Load workflow from JSON file
  createSampleGraph.ts  # Generate example workflow
  addSample.ts     # Helper to add sample to state
  utils.ts         # Tailwind utility functions

types/
  index.ts         # Type exports
  graph.ts         # NodeData, TypedNode, Id types
  agent.ts, tool.ts, output.ts, prompt.ts  # Node-specific types
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

## Key Implementation Details

### Adding a New Node Type

1. Define data interface in `types/your-type.ts`
2. Export from `types/index.ts` and add to `NodeData` union in `types/graph.ts`
3. Create node component in `components/nodes/index.tsx` using `NodeChrome` wrapper
4. Add to `nodeTypes` export in same file
5. Add palette item in `components/palette/index.tsx`
6. Update `lib/run.ts` execution logic to handle new type

### Execution Flow Walkthrough

When user clicks "Run":
1. `run()` in `app/page.tsx:61-63` calls `runLib()` from `lib/run.ts`
2. Logs are cleared, topological sort validates no cycles
3. For each node in topological order:
   - Collect outputs from all incoming edges
   - Execute node logic (currently mocked with random strings)
   - Store output in `nodeOutputs` map
   - Append to logs array via `setLogs`
   - 200ms delay for visual feedback
4. "Done" message logged

### React Flow Integration

The app uses `@xyflow/react` (v12.x) for the visual canvas:
- `ReactFlowProvider` wraps entire app in `app/page.tsx`
- `useReactFlow` hook in ViewPort provides `screenToFlowPosition` for drop handling
- Node positions are absolute coordinates, managed by React Flow
- Edges automatically route between node handles (top = source, bottom = target)

## Technology Stack

- **Framework**: Next.js 15.5.2 (App Router, Turbopack)
- **UI Library**: React 19.1.0
- **Canvas**: React Flow (@xyflow/react 12.8.6)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Icons**: lucide-react
- **Language**: TypeScript 5 (strict mode)
- **Package Manager**: pnpm

## Development Notes

- All components use `"use client"` directive (client-side rendering)
- Turbopack is enabled for dev and build (faster than Webpack)
- No backend - all execution happens client-side
- No environment variables or API keys required for mock mode
- Workflow state is ephemeral (not persisted to localStorage/database)
