# Phase 1 Implementation Plan: Foundation - Multi-Model & Document Support

**Status:** Ready for Implementation
**Priority:** HIGH
**Dependencies:** None
**Estimated Duration:** 2-3 weeks

---

## Overview

Phase 1 establishes the core infrastructure needed for real LLM API integration and document processing. This is the foundation for all subsequent phases.

---

## 1.1 Multi-Model Provider System

### Architecture Design

#### Provider Interface (`lib/providers/base.ts`)
```typescript
export interface ModelProvider {
  name: string;
  models: ModelConfig[];
  supportsStreaming: boolean;

  // Core methods
  complete(params: CompletionParams): Promise<CompletionResponse>;
  stream(params: CompletionParams): AsyncIterator<StreamChunk>;
  validateApiKey(apiKey: string): Promise<boolean>;

  // Pricing
  calculateCost(tokens: TokenUsage): number;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export interface CompletionParams {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}
```

#### Provider Registry (`lib/providers/registry.ts`)
```typescript
export const providers = new Map<string, ModelProvider>();

export function registerProvider(provider: ModelProvider) {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): ModelProvider | undefined {
  return providers.get(name);
}

export function getAllModels(): ModelConfig[] {
  return Array.from(providers.values()).flatMap(p => p.models);
}
```

### Implementation Tasks

#### Task 1.1.1: Create Provider Base Infrastructure
- [ ] Create `lib/providers/` directory
- [ ] Define base interfaces in `base.ts`
- [ ] Create provider registry in `registry.ts`
- [ ] Add pricing table constant (update quarterly)

**Files to Create:**
- `lib/providers/base.ts`
- `lib/providers/registry.ts`
- `lib/providers/pricing.ts`

**Acceptance Criteria:**
- Types compile without errors
- Registry can register and retrieve providers
- Pricing table includes major models

---

#### Task 1.1.2: Implement OpenAI Provider
- [ ] Install `openai` package: `pnpm add openai`
- [ ] Create `lib/providers/openai.ts`
- [ ] Implement `complete()` method
- [ ] Implement `stream()` method using async iterator
- [ ] Add error handling (rate limits, invalid key, network errors)
- [ ] Register OpenAI provider in registry

**Models to Support:**
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-3.5-turbo

**Error Handling:**
- 401: Invalid API key
- 429: Rate limit exceeded
- 500: OpenAI service error
- Network errors: timeout, connection refused

**Acceptance Criteria:**
- Can make successful API calls with valid key
- Streaming works token-by-token
- Errors are caught and formatted properly
- Cost calculation matches OpenAI pricing

---

#### Task 1.1.3: Implement Anthropic Provider
- [ ] Install `@anthropic-ai/sdk` package
- [ ] Create `lib/providers/anthropic.ts`
- [ ] Implement completion and streaming
- [ ] Handle Anthropic-specific message format
- [ ] Register provider

**Models to Support:**
- claude-opus-4
- claude-sonnet-4
- claude-haiku-4

**Special Considerations:**
- Anthropic uses different message format (system message separate)
- Streaming API differs from OpenAI
- Different token counting

**Acceptance Criteria:**
- Works with Claude models
- Message format correctly transformed
- Streaming functional

---

#### Task 1.1.4: Implement Google AI Provider
- [ ] Install `@google/generative-ai` package
- [ ] Create `lib/providers/google.ts`
- [ ] Implement completion and streaming
- [ ] Register provider

**Models to Support:**
- gemini-2.0-flash
- gemini-1.5-pro
- gemini-1.5-flash-latest

**Acceptance Criteria:**
- Works with Gemini models
- Streaming functional

---

#### Task 1.1.5: Implement Ollama Provider
- [ ] Create `lib/providers/ollama.ts`
- [ ] Use fetch API (no SDK needed)
- [ ] Auto-detect available models via API
- [ ] Default to `http://localhost:11434`

**Models:** Dynamic (query Ollama API)

**Special Considerations:**
- No API key needed
- Should handle Ollama not running gracefully
- No cost (local execution)

**Acceptance Criteria:**
- Works with local Ollama instance
- Shows helpful message if Ollama not running
- Lists available models dynamically

---

#### Task 1.1.6: Settings Panel UI
- [ ] Create `components/settings/index.tsx`
- [ ] Create `components/settings/provider-config.tsx`
- [ ] Add settings button to header
- [ ] Create modal/drawer for settings

**UI Mockup:**
```
┌─────────────────────────────────────┐
│  Settings                        [X]│
├─────────────────────────────────────┤
│                                     │
│  API Keys                           │
│                                     │
│  OpenAI                             │
│  [••••••••••••••••••••]  [Test]    │
│  ✓ Connected                        │
│                                     │
│  Anthropic                          │
│  [___________________]  [Test]     │
│  ⚠ Not configured                   │
│                                     │
│  Google AI                          │
│  [___________________]  [Test]     │
│  ⚠ Not configured                   │
│                                     │
│  Ollama (Local)                     │
│  [http://localhost:11434]          │
│  ✓ Connected - 3 models available   │
│                                     │
│  [ Save ]  [ Cancel ]               │
└─────────────────────────────────────┘
```

**State Management:**
- Store API keys in localStorage (never commit)
- Encrypt keys before storage (use `crypto-js`)
- Test button validates key with provider
- Show connection status indicator

**Files to Create:**
- `components/settings/index.tsx`
- `components/settings/provider-config.tsx`
- `lib/storage/api-keys.ts` (encrypted localStorage wrapper)

**Acceptance Criteria:**
- Settings modal opens from header
- Can save API keys securely
- Test button validates keys
- Status indicators accurate

---

#### Task 1.1.7: Enhanced Agent Node
- [ ] Update `types/agent.ts` to include model selection
- [ ] Add model dropdown to properties panel
- [ ] Add mode toggle (Mock vs Live)
- [ ] Add streaming toggle
- [ ] Show provider logo/icon

**Type Updates:**
```typescript
export interface AgentData {
  name: string;
  model: string; // Format: "provider/model-id" e.g. "openai/gpt-4o"
  prompt: string;
  mode: 'mock' | 'live';
  streaming: boolean;
  temperature?: number;
  maxTokens?: number;
}
```

**Properties Panel Updates:**
- Model selector: grouped dropdown (by provider)
- Mode toggle: switch between Mock/Live
- Streaming: checkbox
- Advanced settings (collapsible): temperature, maxTokens

**Files to Modify:**
- `types/agent.ts`
- `components/properties/index.tsx`
- `components/nodes/index.tsx` (add provider icon)

**Acceptance Criteria:**
- Can select any registered model
- Mode toggle works
- Provider icon displays correctly
- Settings persist when changing nodes

---

#### Task 1.1.8: Update Execution Engine
- [ ] Modify `lib/run.ts` to call real providers
- [ ] Add streaming support
- [ ] Update console to show streaming tokens
- [ ] Add cost tracking

**Execution Flow Changes:**
```typescript
// Old: mock execution
const logText = `🤖 ${agentData.name} ... ${Math.random().toString(36)}`;

// New: real execution
if (agentData.mode === 'live') {
  const [providerName, modelId] = agentData.model.split('/');
  const provider = getProvider(providerName);

  if (agentData.streaming) {
    // Stream tokens to console
    for await (const chunk of provider.stream({ ... })) {
      setLogs(logs => logs.concat(chunk.delta));
    }
  } else {
    // Single completion
    const response = await provider.complete({ ... });
    setLogs(logs => logs.concat(response.content));
  }

  // Track cost
  const cost = provider.calculateCost(response.usage);
  totalCost += cost;
} else {
  // Keep mock behavior
}
```

**Files to Modify:**
- `lib/run.ts`

**New Files:**
- `lib/execution/cost-tracker.ts`

**Acceptance Criteria:**
- Live mode makes real API calls
- Streaming displays tokens in real-time
- Cost calculated and displayed
- Mock mode still works

---

#### Task 1.1.9: Cost Tracking UI
- [ ] Add cost display to console
- [ ] Show per-node costs
- [ ] Show total execution cost
- [ ] Add cost summary modal

**Console Updates:**
```
🤖 Researcher (gpt-4o)
Input: ... (245 tokens)
Output: ... (512 tokens)
Cost: $0.0089
Time: 2.3s

🔧 Tool execution...

💰 Total Cost: $0.0089 | Time: 2.3s | Tokens: 757
```

**Acceptance Criteria:**
- Cost displayed per Agent node
- Total cost shown at end
- Token counts accurate
- Cost matches provider pricing

---

## 1.2 Document Node Type

### Architecture Design

#### Document Type (`types/document.ts`)
```typescript
export interface DocumentData {
  name: string;
  fileName: string;
  fileType: 'pdf' | 'txt' | 'md' | 'code';
  content: string;
  size: number; // bytes
  uploadedAt: string;
  metadata?: Record<string, any>;
}

export interface ChunkerData {
  name: string;
  strategy: 'fixed' | 'semantic' | 'recursive';
  chunkSize: number;
  overlap: number;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  index: number;
  startChar: number;
  endChar: number;
}
```

### Implementation Tasks

#### Task 1.2.1: Document Node Component
- [ ] Create document type definition
- [ ] Create `components/nodes/document-node.tsx`
- [ ] Add file upload to properties panel
- [ ] Add document preview

**Node Appearance:**
```
┌──────────────────────┐
│ 📄 Document          │
├──────────────────────┤
│ research-paper.pdf   │
│ 2.4 MB, 34 pages     │
│ Uploaded 2min ago    │
└──────────────────────┘
```

**Files to Create:**
- `types/document.ts`
- `components/nodes/document-node.tsx`
- `components/properties/document-properties.tsx`

**Acceptance Criteria:**
- Can drag document node onto canvas
- File upload works via properties panel
- Document metadata displays correctly

---

#### Task 1.2.2: PDF Text Extraction
- [ ] Install `pdf-parse` or `pdfjs-dist`
- [ ] Create `lib/document/pdf-parser.ts`
- [ ] Extract text from PDF
- [ ] Handle multi-page PDFs
- [ ] Show extraction progress

**Acceptance Criteria:**
- Can extract text from PDF files
- Multi-page PDFs processed completely
- Progress indicator during extraction
- Errors handled (corrupted PDFs, etc.)

---

#### Task 1.2.3: Document Preview UI
- [ ] Create preview component in properties panel
- [ ] Markdown rendering (use `react-markdown`)
- [ ] Code syntax highlighting (use `prism-react-renderer`)
- [ ] Scrollable text preview
- [ ] Character/word/line count

**Preview Panel:**
```
┌─────────────────────────┐
│ Document Preview        │
├─────────────────────────┤
│ research-paper.pdf      │
│ 2.4 MB · 45,230 chars   │
│ 7,892 words · 342 lines │
├─────────────────────────┤
│ [Text Preview]          │
│                         │
│ Lorem ipsum dolor sit   │
│ amet, consectetur...    │
│                         │
│ (scrollable)            │
└─────────────────────────┘
```

**Acceptance Criteria:**
- Preview shows document content
- Markdown rendered correctly
- Code has syntax highlighting
- Stats accurate

---

#### Task 1.2.4: Chunker Node Component
- [ ] Create `components/nodes/chunker-node.tsx`
- [ ] Implement chunking strategies
- [ ] Show chunk preview
- [ ] Configure chunk size/overlap

**Chunking Strategies:**

1. **Fixed Size:**
   ```typescript
   function fixedSizeChunk(text: string, size: number, overlap: number): Chunk[] {
     const chunks = [];
     for (let i = 0; i < text.length; i += size - overlap) {
       chunks.push(text.slice(i, i + size));
     }
     return chunks;
   }
   ```

2. **Semantic (sentence boundaries):**
   ```typescript
   function semanticChunk(text: string, targetSize: number): Chunk[] {
     const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
     // Group sentences up to targetSize
   }
   ```

3. **Recursive (hierarchical):**
   ```typescript
   function recursiveChunk(text: string, size: number): Chunk[] {
     // Split by paragraphs, then sentences, then chars
   }
   ```

**Files to Create:**
- `components/nodes/chunker-node.tsx`
- `lib/document/chunker.ts`

**Acceptance Criteria:**
- Three chunking strategies implemented
- Chunk preview shows first 3 chunks
- Configuration affects output
- Chunks stored in node data

---

#### Task 1.2.5: Document → Agent Integration
- [ ] Update run.ts to handle document nodes
- [ ] Pass document content to downstream agents
- [ ] Handle chunked documents (pass all chunks or selected?)
- [ ] Truncate if exceeds context window

**Execution Logic:**
```typescript
if (node.type === 'document') {
  const docData = node.data as DocumentData;
  nodeOutputs[node.id] = docData.content;
}

if (node.type === 'chunker') {
  const chunkerData = node.data as ChunkerData;
  // Get parent document content
  const parentContent = nodeOutputs[parentNodeId];
  const chunks = chunkDocument(parentContent, chunkerData.strategy, ...);
  nodeOutputs[node.id] = chunks.map(c => c.content).join('\n---\n');
}

if (node.type === 'agent') {
  // Agent receives document content as input
  const documentInput = incomingEdges.map(id => nodeOutputs[id]);
  // Inject into prompt
  const fullPrompt = `${agentData.prompt}\n\nDocument:\n${documentInput}`;
}
```

**Acceptance Criteria:**
- Document content flows to agents
- Chunked documents handled correctly
- Long documents truncated with warning
- Context window limits respected

---

## 1.3 Streaming Live Execution

### Implementation Tasks

#### Task 1.3.1: Node Execution State
- [ ] Add execution state to node data
- [ ] Visual indicators (border color/animation)
- [ ] Update during execution

**Execution States:**
- `idle`: Gray (default)
- `executing`: Blue animated border
- `completed`: Green
- `error`: Red
- `skipped`: Yellow

**Node State Type:**
```typescript
export type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error' | 'skipped';

// Add to each node data type
export interface AgentData {
  // ... existing fields
  executionState?: NodeExecutionState;
  executionError?: string;
}
```

**Files to Modify:**
- All type files in `types/`
- `components/nodes/index.tsx` (add state styling)

**Acceptance Criteria:**
- Nodes change color during execution
- Animated border on executing nodes
- Error state shows error icon

---

#### Task 1.3.2: Streaming Console
- [ ] Update console to append tokens
- [ ] Add auto-scroll during streaming
- [ ] Show typing indicator
- [ ] Group messages by node

**Console Update:**
```typescript
// Instead of: setLogs(logs => logs.concat(fullMessage));
// Use: setLogs(logs => appendToLastLog(logs, chunk.delta));

function appendToLastLog(logs: string[], delta: string): string[] {
  const lastLog = logs[logs.length - 1];
  return [...logs.slice(0, -1), lastLog + delta];
}
```

**UI Enhancement:**
```
┌─────────────────────────────────────┐
│ Console                   [Clear]   │
├─────────────────────────────────────┤
│ ▶ Researcher (executing...)         │
│   The latest research indicates▊    │
│                                     │
│ ✓ WebSearch (completed)             │
│   Found 5 results...                │
│                                     │
│ ⏸ Waiting: Writer                   │
└─────────────────────────────────────┘
```

**Acceptance Criteria:**
- Tokens appear in real-time
- Console auto-scrolls
- Completed nodes marked clearly
- Can distinguish between nodes

---

#### Task 1.3.3: Execution Controls
- [ ] Add pause/resume buttons
- [ ] Add cancel button
- [ ] Pause execution state
- [ ] Resume from paused state

**State Management:**
```typescript
type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
const pauseRequestedRef = useRef(false);

async function run() {
  setExecutionStatus('running');

  for (const nodeId of topologicalOrder) {
    // Check for pause
    if (pauseRequestedRef.current) {
      setExecutionStatus('paused');
      await waitForResume(); // Promise that resolves on resume click
    }

    // Execute node...
  }

  setExecutionStatus('completed');
}
```

**UI:**
```
[▶ Run] → [⏸ Pause] → [▶ Resume]
[⏹ Cancel] (always visible during execution)
```

**Acceptance Criteria:**
- Can pause mid-execution
- Resume continues from pause point
- Cancel stops execution immediately
- Status indicators accurate

---

#### Task 1.3.4: Error Handling UI
- [ ] Catch and display API errors
- [ ] Node-level error display
- [ ] Error recovery options
- [ ] Error details modal

**Error Types:**
- API errors (401, 429, 500)
- Network errors (timeout, connection)
- Validation errors (missing API key, invalid model)
- Execution errors (context length exceeded)

**Error Display:**
```typescript
try {
  const response = await provider.complete({ ... });
} catch (error) {
  // Update node state
  setNodes(nodes => nodes.map(n =>
    n.id === nodeId
      ? { ...n, data: { ...n.data, executionState: 'error', executionError: error.message } }
      : n
  ));

  // Log error
  setLogs(logs => logs.concat(`❌ ${nodeId}: ${error.message}`));

  // Show recovery options
  const action = await showErrorDialog({
    title: 'API Error',
    message: error.message,
    options: ['Retry', 'Skip Node', 'Abort Workflow']
  });
}
```

**Error Dialog:**
```
┌──────────────────────────────────┐
│ ❌ Execution Error               │
├──────────────────────────────────┤
│ Node: Researcher                 │
│                                  │
│ Error: Rate limit exceeded       │
│                                  │
│ The OpenAI API returned a 429    │
│ error. You've exceeded your      │
│ rate limit.                      │
│                                  │
│ [ Retry ]  [ Skip ]  [ Abort ]   │
└──────────────────────────────────┘
```

**Acceptance Criteria:**
- All errors caught and displayed
- Error dialogs show helpful messages
- Can retry failed nodes
- Can skip or abort on error

---

## Testing Strategy

### Unit Tests
- [ ] Provider implementations (mock API responses)
- [ ] Chunking algorithms
- [ ] Cost calculation accuracy
- [ ] Document parsing

### Integration Tests
- [ ] End-to-end workflow execution
- [ ] Real API calls (with test keys)
- [ ] Streaming behavior
- [ ] Error handling paths

### Manual Testing
- [ ] Upload various document types
- [ ] Test all models with real keys
- [ ] Streaming in different browsers
- [ ] Error scenarios (invalid key, rate limits)
- [ ] Pause/resume/cancel
- [ ] Cost tracking accuracy

---

## Documentation Updates

After Phase 1 completion:
- [ ] Update CLAUDE.md with new architecture
- [ ] Document provider interface for future additions
- [ ] Add examples of using each provider
- [ ] Update README with new features

---

## Success Criteria (Phase 1 Complete)

### Demo Scenario
A user should be able to:
1. Open settings and add OpenAI API key
2. Create a workflow: Document → Agent (GPT-4) → Result
3. Upload a PDF document
4. Configure Agent to summarize the document
5. Run in Live mode with streaming enabled
6. See tokens streaming in real-time
7. View final result with cost breakdown
8. Pause execution mid-stream
9. Resume and complete workflow

### Performance Targets
- Document upload: < 1s for 10MB file
- PDF extraction: < 3s for 100-page document
- API response: Streaming starts within 2s
- UI responsiveness: No blocking during execution

### Code Quality
- TypeScript strict mode with no errors
- All new code follows existing patterns
- Console warnings addressed
- No performance regressions

---

## Next Phase Preview

After Phase 1, we'll be ready for:
- **Phase 2**: Conditional branching and memory (requires execution engine)
- **Phase 4**: Templates (requires working providers and documents)
- **Phase 3**: Tool integration (builds on provider pattern)
