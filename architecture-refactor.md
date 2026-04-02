# Architecture Refactor Plan

Prepare inference-sandbox for open-source release by improving modularity, testability, and contributor experience.

## Context

The project has shipped through Phase 2 of the open-source roadmap (Compare Mode, Shadow Test, Qualitative Annotation, Run Observability). The feature set is solid, but the internal architecture has four structural problems that make the codebase difficult for contributors to navigate and extend:

1. **God file** — `lib/execution/parallel-runner.ts` is 1,132 lines with a single `executeNode` function containing 13 if/else branches (one per node type), each mixing business logic with React state mutations.
2. **Monolithic state** — `app/page.tsx` holds 8 `useState` calls, 3 `useRef`s, and all callback handlers. Props drill through 3+ component levels.
3. **React coupling** — The execution engine imports React and takes `setNodes`/`setLogs`/`setEdges` as parameters, making it untestable without a browser/DOM.
4. **No plugin system** — Adding a new node type requires changing 6-7 files across types, components, palette, properties, and the execution runner.

Test coverage is ~15-20%, concentrated in utilities. The core execution engine (parallel-runner) has zero tests.

## Goals

- Execution engine testable without React or a browser
- Adding a new node type requires 1 file + 1 import line
- State management via a dedicated store, no prop drilling
- Test coverage on the execution path rises to ~60-70%
- Each phase leaves the app fully functional (no big-bang rewrite)

## Patterns to preserve

These existing patterns are well-designed and should be mirrored in the refactor:

- **Tool registry** (`lib/tools/registry.ts`) — `registerTool()` / `getTool()` with side-effect imports in `index.ts`
- **Provider registry** (`lib/providers/registry.ts`) — same Map-based pattern
- **Type safety** — discriminated unions for `NodeData` in `types/graph.ts`
- **DAG execution logic** — topoSort, level grouping, route evaluation, loop handling

---

## Phase 0: Foundation — Event Emitter & Executor Interface

**Goal:** Introduce the event-based communication layer and executor interface. No existing files change. Zero behavior change.

### New files

#### `lib/execution/events.ts`

A typed, synchronous event emitter (no Node.js dependency):

```typescript
export type ExecutionEvent =
  | { type: 'node:start'; nodeId: string }
  | { type: 'node:complete'; nodeId: string; output: string }
  | { type: 'node:error'; nodeId: string; error: string }
  | { type: 'log:append'; message: string }
  | { type: 'log:update'; index: number; message: string }
  | { type: 'node:data'; nodeId: string; patch: Record<string, unknown> }
  | { type: 'edge:style'; updates: Array<{ edgeId: string; style: object; animated: boolean }> }
  | { type: 'execution:start'; levelCount: number }
  | { type: 'execution:done' }
  | { type: 'execution:cancelled' }
  | { type: 'execution:paused' }
  | { type: 'execution:resumed' }
  | { type: 'execution:error'; message: string }
  | { type: 'review:request'; nodeId: string; request: ReviewRequest }
  | { type: 'error-recovery:request'; nodeId: string; nodeName: string; message: string };

export class ExecutionEventEmitter {
  private listeners = new Map<string, Set<(event: ExecutionEvent) => void>>();

  on(type: string, handler: (event: ExecutionEvent) => void): () => void { ... }
  emit(event: ExecutionEvent): void { ... }
  removeAllListeners(): void { ... }
}
```

The `on()` method returns an unsubscribe function. Event types use discriminated unions for type safety, matching the project's existing TypeScript patterns.

#### `lib/execution/node-executor.ts`

The executor interface and registry, mirroring `lib/tools/registry.ts`:

```typescript
export interface NodeExecutionInput {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  inputs: string[];  // outputs from upstream nodes
  context: ExecutorContext;
}

export interface ExecutorContext {
  workflowMemory: MemoryManager;
  auditLog: AuditLog;
  emitter: ExecutionEventEmitter;
  executionControl: { current: ExecutionStatus };
  loopIterations: Record<string, number>;
  loopExited: Record<string, boolean>;
  options?: RunOptions;
}

export interface NodeExecutionResult {
  output: string;
  dataPatch?: Record<string, unknown>;  // updates to apply to node data
}

export interface NodeExecutor {
  type: string;  // matches node.type in the graph
  execute(input: NodeExecutionInput): Promise<NodeExecutionResult>;
}

const executors = new Map<string, NodeExecutor>();
export function registerNodeExecutor(executor: NodeExecutor): void { ... }
export function getNodeExecutor(type: string): NodeExecutor | undefined { ... }
```

Key design decisions:
- `dataPatch` replaces direct `setNodes()` calls. Each executor returns what to update, rather than mutating React state.
- `emitter` replaces `setLogs`. Executors emit `log:append` / `log:update` events.
- `executionControl` is a plain `{ current: ExecutionStatus }` object — identical shape to a React ref but no React dependency. Tests can pass `{ current: 'running' }` directly.

### Tests

- `tests/lib/execution/events.test.ts` — subscribe, emit, unsubscribe, removeAllListeners
- `tests/lib/execution/node-executor.test.ts` — register, get, unknown type returns undefined

### Verification

`pnpm test && pnpm typecheck` — app unchanged.

---

## Phase 1: Extract Per-Node-Type Executors

**Goal:** Move each if/else branch from `executeNode` (parallel-runner.ts lines 167-686) into a standalone executor file. No existing files change yet — executors exist alongside the old code.

### New files

One executor per node type (10 files):

```
lib/execution/executors/
  prompt-executor.ts
  document-executor.ts
  agent-executor.ts        # largest — handles mock/live, streaming/non-streaming, memory read/write
  tool-executor.ts
  chunker-executor.ts
  router-executor.ts       # delegates to existing route-evaluator.ts
  loop-executor.ts         # receives loopIterations/loopExited via ExecutorContext
  memory-executor.ts
  human-review-executor.ts
  result-executor.ts
  index.ts                 # side-effect imports to register all executors
```

Each file follows the same pattern:

```typescript
// lib/execution/executors/prompt-executor.ts
import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { PromptData } from '@/types/prompt';

const promptExecutor: NodeExecutor = {
  type: 'prompt',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as PromptData;
    const text = data.text || '';
    const name = data.name || 'Prompt';

    input.context.emitter.emit({
      type: 'log:append',
      message: `💬 ${name}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`
    });

    return { output: text };
  }
};

registerNodeExecutor(promptExecutor);
```

The `index.ts` mirrors the `lib/tools/index.ts` pattern — side-effect imports that trigger registration:

```typescript
import './prompt-executor';
import './document-executor';
import './agent-executor';
// ... etc
```

### Tests

9 test files, one per executor (human-review tested via integration in Phase 4):

```
tests/lib/execution/executors/
  prompt-executor.test.ts
  document-executor.test.ts
  agent-executor.test.ts      # mock mode + live mode with mocked provider
  tool-executor.test.ts
  chunker-executor.test.ts
  router-executor.test.ts
  loop-executor.test.ts
  memory-executor.test.ts
  result-executor.test.ts
```

Each test creates a mock `ExecutionEventEmitter`, feeds inputs, and asserts on the returned `NodeExecutionResult` and emitted events. No React, no DOM.

### Verification

`pnpm test && pnpm typecheck` — all new tests pass, app unchanged.

---

## Phase 2: Wire Executors into parallel-runner.ts

**Goal:** Replace the 13-branch `executeNode` function with registry dispatch. Create an event bridge that translates emitted events back into React state calls. Behavior-preserving swap.

### New file

#### `lib/execution/event-bridge.ts`

Subscribes to an `ExecutionEventEmitter` and translates events into React state setter calls:

```typescript
export function createReactBridge(
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setCurrentError: React.Dispatch<...> | undefined,
  setReviewRequest: React.Dispatch<...> | undefined,
  emitter: ExecutionEventEmitter
): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(emitter.on('log:append', (e) => {
    setLogs(logs => logs.concat(e.message));
  }));

  unsubs.push(emitter.on('log:update', (e) => {
    setLogs(logs => {
      const updated = [...logs];
      updated[e.index] = e.message;
      return updated;
    });
  }));

  unsubs.push(emitter.on('node:data', (e) => {
    setNodes(nodes => nodes.map(n =>
      n.id === e.nodeId ? { ...n, data: { ...n.data, ...e.patch } } : n
    ));
  }));

  // ... edge:style, error-recovery:request, review:request handlers

  return () => unsubs.forEach(fn => fn());  // cleanup
}
```

This is the critical seam: execution emits events, the bridge translates to React state. In tests, skip the bridge and assert directly on emitted events.

### Modified file

#### `lib/execution/parallel-runner.ts`

Replace `executeNode` (lines 167-686) with:

```typescript
import '@/lib/execution/executors/index';  // register all executors
import { getNodeExecutor } from './node-executor';

async function executeNode(nodeId: Id, context: NodeExecutionContext): Promise<string> {
  const node = context.nodesById[nodeId];

  // Emit start event (bridge translates to setNodes executionState: 'executing')
  context.emitter.emit({ type: 'node:start', nodeId });

  try {
    const executor = getNodeExecutor(node.type!);
    if (!executor) throw new Error(`No executor for node type: ${node.type}`);

    const inputs = context.incomingEdgesByNode[nodeId]
      .map(depId => context.nodeOutputs[depId])
      .filter(Boolean);

    const result = await executor.execute({
      nodeId,
      nodeType: node.type!,
      nodeData: node.data as Record<string, unknown>,
      inputs,
      context: { /* map NodeExecutionContext to ExecutorContext */ }
    });

    if (result.dataPatch) {
      context.emitter.emit({ type: 'node:data', nodeId, patch: result.dataPatch });
    }

    context.emitter.emit({ type: 'node:complete', nodeId, output: result.output });
    return result.output;
  } catch (error) {
    context.emitter.emit({ type: 'node:error', nodeId, error: String(error) });
    throw error;
  }
}
```

The `runParallel` function signature remains unchanged in this phase — it still accepts `setNodes`/`setLogs`/etc. Internally it creates an `ExecutionEventEmitter`, sets up the bridge, and passes the emitter through the context.

### Tests

- `tests/lib/execution/event-bridge.test.ts` — mock setters, emit events, verify correct setter calls

### Verification

Run each sample workflow manually. Confirm logs, node execution states (blue/green/red borders), and edge animations match pre-refactor behavior exactly. `pnpm test && pnpm typecheck` pass.

---

## Phase 3: Zustand Store

**Goal:** Move all state from `app/page.tsx` into a Zustand store. Eliminate prop drilling. This phase can overlap with Phases 1-2 since it touches different files.

### New dependency

```bash
pnpm add zustand
```

### New files

#### `lib/store/workflow-store.ts`

```typescript
import { create } from 'zustand';

interface WorkflowState {
  // Graph
  nodes: TypedNode[];
  edges: Edge[];
  selectedId: string | null;

  // Execution
  executionStatus: ExecutionStatus;
  logs: string[];
  currentError: { nodeId: string; nodeName: string; message: string } | null;

  // Compare mode
  compareMode: boolean;
  compareProviders: CompareProvider[];
  compareLogs: string[][];

  // Settings
  settingsOpen: boolean;

  // Execution control (replaces useRef)
  executionControl: { current: ExecutionStatus };
  errorRecoveryAction: { current: 'retry' | 'skip' | 'abort' | null };

  // Actions
  setNodes: (updater: TypedNode[] | ((prev: TypedNode[]) => TypedNode[])) => void;
  setEdges: (updater: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setSelectedId: (id: string | null) => void;
  setLogs: (updater: string[] | ((prev: string[]) => string[])) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setCurrentError: (error: { nodeId: string; nodeName: string; message: string } | null) => void;
  updateNodeData: (nodeId: string, patch: Partial<NodeData>) => void;
  clearAll: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // ... initial state and actions
}));
```

Key design: `setNodes` and `setEdges` accept the same `(prev) => next` updater function pattern already used throughout the codebase. This means `parallel-runner.ts` and `compare-runner.ts` can accept store actions without signature changes during the transition.

Refs (`executionControlRef`, `errorRecoveryActionRef`) become plain mutable objects on the store. Since they were already mutable ref objects, this is a direct replacement.

#### `lib/store/selectors.ts`

```typescript
export const useSelectedNode = () =>
  useWorkflowStore(s => s.nodes.find(n => n.id === s.selectedId));

export const useExecutionStatus = () =>
  useWorkflowStore(s => s.executionStatus);
```

### Migration approach (incremental, one component at a time)

1. Create the store with all state and actions
2. In `app/page.tsx`, keep existing `useState` but sync with store (dual-write)
3. Migrate children one at a time:
   - `components/console/index.tsx` — replace `logs`/`onClear` props with `useWorkflowStore`
   - `components/properties/index.tsx` — replace `selected`/`onChange` props with store hooks
   - `components/header.tsx` — replace callback props with store actions
   - `components/viewport/index.tsx` — replace `nodes`/`edges`/`setNodes`/`setEdges` props
4. Once all children use the store, remove `useState` from `page.tsx`

### Modified files

| File | Change |
|------|--------|
| `app/page.tsx` | Remove 8 useState, 3 useRef, all callback handlers. Becomes ~80 lines (layout + store init) |
| `components/header.tsx` | Replace props with `useWorkflowStore()` |
| `components/viewport/index.tsx` | Replace props with store hooks |
| `components/properties/index.tsx` | Replace `selected`/`onChange` with store hooks |
| `components/console/index.tsx` | Replace `logs`/`onClear` with store hooks |

### Tests

- `tests/lib/store/workflow-store.test.ts` — test actions: setNodes, clearAll, updateNodeData, setExecutionStatus

### Verification

All interactions work: drag-drop, properties editing, execution, pause/resume/cancel, compare mode, error recovery. `pnpm test && pnpm typecheck` pass.

---

## Phase 4: Decouple `runParallel` from React

**Goal:** Change `runParallel` to accept an `ExecutionEventEmitter` + control objects instead of React setters. This is the key testability unlock.

### Modified files

#### `lib/execution/parallel-runner.ts`

New signature — 4 parameters instead of 11:

```typescript
export interface ExecutionEngine {
  emitter: ExecutionEventEmitter;
  control: { current: ExecutionStatus };
  errorRecovery: { current: 'retry' | 'skip' | 'abort' | null };
  reviewDecision: { current: ReviewDecisionResult | null };
}

export async function runParallel(
  nodes: TypedNode[],
  edges: Edge[],
  engine: ExecutionEngine,
  options?: RunOptions,
): Promise<{ memory: MemoryManager; auditLog: AuditLog }>
```

All `setNodes`/`setLogs`/`setEdges`/`setCurrentError`/`setReviewRequest` calls become `engine.emitter.emit(...)`. The `import React` at the top of the file is removed.

#### `lib/execution/compare-runner.ts`

Updated to use the new `ExecutionEngine` interface. Each provider run gets its own emitter; a bridge maps events to the per-provider log arrays.

#### `lib/store/workflow-store.ts`

Add a `run()` action:

```typescript
run: async () => {
  const { nodes, edges, executionControl, errorRecoveryAction } = get();
  const emitter = new ExecutionEventEmitter();

  // Bridge events to store actions
  const cleanup = createStoreBridge(emitter, set, get);

  set({ executionStatus: 'running' });
  executionControl.current = 'running';

  try {
    await runParallel(nodes, edges, {
      emitter,
      control: executionControl,
      errorRecovery: errorRecoveryAction,
      reviewDecision: { current: null },
    });
  } finally {
    cleanup();
    set({ executionStatus: 'idle' });
  }
}
```

#### `app/page.tsx`

The `run` callback becomes `store.run()`. Remove the direct import of `runParallel`.

### Tests — the major payoff

`tests/lib/execution/parallel-runner.test.ts` — full integration tests with no React:

```typescript
import { runParallel, ExecutionEngine } from '@/lib/execution/parallel-runner';
import { ExecutionEventEmitter } from '@/lib/execution/events';

test('linear chain executes in order', async () => {
  const emitter = new ExecutionEventEmitter();
  const events: ExecutionEvent[] = [];
  emitter.on('node:complete', (e) => events.push(e));

  const nodes = [
    { id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: { name: 'P', text: 'hello' } },
    { id: '2', type: 'result', position: { x: 0, y: 100 }, data: { name: 'R' } },
  ];
  const edges = [{ id: 'e1', source: '1', target: '2' }];

  await runParallel(nodes, edges, {
    emitter,
    control: { current: 'running' },
    errorRecovery: { current: null },
    reviewDecision: { current: null },
  });

  expect(events).toHaveLength(2);
  expect(events[0].nodeId).toBe('1');
  expect(events[1].nodeId).toBe('2');
});
```

Test cases to cover:
- Linear chain execution
- Parallel execution (diamond DAG)
- Router path selection
- Loop iteration and early exit
- Cancellation mid-execution
- Pause and resume
- Error recovery (skip, retry, abort)
- Memory read/write across nodes

### Verification

All existing tests pass. New integration tests pass. App functions identically. `pnpm test && pnpm typecheck` pass.

---

## Phase 5: Node Type Plugin System

**Goal:** Adding a new node type requires exactly 1 file + 1 import line. Down from 6-7 files today.

### New files

#### `lib/node-types/base.ts`

```typescript
export interface NodeTypeDefinition<TData = Record<string, unknown>> {
  /** Unique type identifier — matches node.type in the graph */
  type: string;

  /** Display metadata for the palette */
  palette: {
    label: string;
    icon?: React.ComponentType;
    defaultData: TData;
  };

  /** The executor for this node type (from Phase 1) */
  executor: NodeExecutor;

  /** React component for rendering on the canvas */
  canvasComponent: React.ComponentType<NodeProps>;

  /** React component for the properties panel */
  propertiesComponent: React.ComponentType<{
    data: TData;
    onChange: (patch: Partial<TData>) => void;
  }>;
}
```

#### `lib/node-types/registry.ts`

```typescript
const nodeTypeRegistry = new Map<string, NodeTypeDefinition>();

export function registerNodeType(def: NodeTypeDefinition): void {
  nodeTypeRegistry.set(def.type, def);
  registerNodeExecutor(def.executor);  // also register the executor
}

export function getNodeType(type: string): NodeTypeDefinition | undefined { ... }
export function getAllNodeTypes(): NodeTypeDefinition[] { ... }
export function getNodeTypesMap(): NodeTypes { ... }      // for React Flow's nodeTypes prop
export function getPaletteItems(): PaletteItemData[] { ... }  // for the palette component
```

#### `lib/node-types/built-in/*.ts`

One file per built-in node type. Each combines the executor (from Phase 1), canvas component (existing), and properties component (existing) into a single `NodeTypeDefinition`. Example:

```typescript
// lib/node-types/built-in/prompt.ts
import { registerNodeType } from '../registry';
import { PromptNode } from '@/components/nodes/prompt-node';
import { PromptProperties } from '@/components/properties/prompt-properties';
import { promptExecutor } from '@/lib/execution/executors/prompt-executor';

registerNodeType({
  type: 'prompt',
  palette: {
    label: 'Prompt',
    defaultData: { name: 'Prompt', text: 'Your prompt here' },
  },
  executor: promptExecutor,
  canvasComponent: PromptNode,
  propertiesComponent: PromptProperties,
});
```

Plus `lib/node-types/built-in/index.ts` for side-effect registration imports.

### Modified files

| File | Change |
|------|--------|
| `components/nodes/index.tsx` | Replace hardcoded `nodeTypes` map with `getNodeTypesMap()` from registry |
| `components/properties/index.tsx` | Replace 10 type-check `if` blocks with `getNodeType(type)?.propertiesComponent` |
| `components/palette/index.tsx` | Replace 10 hardcoded `PaletteItem` calls with `getPaletteItems().map(...)` |

### The new contributor experience

Adding a custom node type:

```typescript
// lib/node-types/built-in/my-custom-type.ts
import { registerNodeType } from '../registry';

registerNodeType({
  type: 'my-custom-type',
  palette: { label: 'My Custom Type', defaultData: { name: 'Custom' } },
  executor: {
    type: 'my-custom-type',
    async execute(input) {
      return { output: `Processed: ${input.inputs.join(', ')}` };
    }
  },
  canvasComponent: MyCustomNode,
  propertiesComponent: MyCustomProperties,
});
```

Then add one line in `lib/node-types/built-in/index.ts`:
```typescript
import './my-custom-type';
```

### Tests

- `tests/lib/node-types/registry.test.ts` — register, getNodeType, getAllNodeTypes, getPaletteItems

### Verification

Palette generates from registry. Properties panel dispatches from registry. All 10 built-in node types work. `pnpm test && pnpm typecheck` pass.

---

## Summary

| Phase | New Files | Modified Files | Tests Added | Risk | Key Metric |
|-------|-----------|---------------|-------------|------|------------|
| 0 | 2 | 0 | 2 | Near zero | Foundation laid |
| 1 | 11 | 0 | 9 | Near zero | Executors exist, fully tested |
| 2 | 1 | 1 | 1 | Medium | God file eliminated |
| 3 | 2 | 5 | 1 | Medium | Prop drilling eliminated |
| 4 | 0 | 4 | 1 (large) | High | React removed from engine |
| 5 | 4 | 3 | 1 | Medium | 1-file node types |

**Estimated test coverage after completion:** ~60-70% (up from ~15-20%), with the critical execution path fully covered.

**Dependency order:** Phase 0 → 1 → 2 → 4. Phase 3 can run in parallel with Phases 1-2 (different files). Phase 5 depends on Phases 1-2 (executor registry) + Phase 3 (store for palette/properties).

**What doesn't change:** The DAG execution logic (topoSort, level grouping), provider system, tool system, type definitions, and all UI components remain structurally intact. This is an internal wiring refactor, not a feature change.
