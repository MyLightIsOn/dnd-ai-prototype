# Phase 2A Implementation Plan: Core Orchestration

**Status:** Ready to Implement
**Priority:** HIGH
**Dependencies:** Phase 1 Complete
**Estimated Duration:** 1-2 weeks
**Scope:** Streamlined core features for fast prototype

---

## Overview

Phase 2A implements the **essential orchestration features** for a multi-agent workflow studio: parallel execution, basic routing, memory management, and human-in-the-loop. This streamlined version focuses on getting core functionality working rather than building every possible feature.

**Deferred to later:** Loops, complex routing strategies, memory visualization, multi-reviewer workflows.

---

## 2.0 Parallel Execution Engine

### Architecture

Currently, nodes execute **sequentially** even when they have no dependencies on each other:
```
Document → Agent 1 → Agent 2 → Synthesizer
           (runs)    (waits)
                     (runs)
```

**Goal:** Execute independent nodes in parallel:
```
Document → Agent 1 ┐
           (both)  ├→ Synthesizer
        → Agent 2 ┘  (runs)
```

### Implementation Strategy

```typescript
// lib/execution/levels.ts
export function groupNodesByLevel(
  sortedNodes: Id[],
  edges: Edge[]
): Id[][] {
  // Group nodes by dependency depth
  // Level 0: No dependencies
  // Level 1: Depend only on Level 0
  // Level 2: Depend on Level 0 or 1
  // etc.
}

// lib/run.ts
for (const level of levels) {
  // Execute all nodes in this level concurrently
  await Promise.all(
    level.map(nodeId => executeNode(nodeId))
  );
}
```

### Tasks

#### Task 2.0.1: Level-Based Grouping
- [ ] Create `groupNodesByLevel()` function
- [ ] Calculate dependency depth for each node
- [ ] Group nodes by level (array of arrays)
- [ ] Handle edge cases (disconnected nodes, multiple roots)

**Complexity:** Medium
**Files:** `lib/execution/levels.ts`

---

#### Task 2.0.2: Parallel Node Execution
- [ ] Modify `lib/run.ts` to iterate by level instead of individual nodes
- [ ] Use `Promise.all()` to execute nodes in same level
- [ ] Maintain execution order guarantees (levels are sequential)
- [ ] Coordinate state updates from parallel executions

**Complexity:** High (async coordination, React state updates)
**Files:** `lib/run.ts`

---

#### Task 2.0.3: Visual Feedback for Parallel Execution
- [ ] Show multiple nodes with blue pulsing borders simultaneously
- [ ] Update console logs in real-time from parallel agents
- [ ] Handle log interleaving (Agent 1 chunk, Agent 2 chunk, Agent 1 chunk...)
- [ ] Clear visual indication which nodes are running in parallel

**Complexity:** Medium
**Files:** `lib/run.ts`, `components/console/index.tsx`

---

#### Task 2.0.4: Error Handling in Parallel Branches
- [ ] If one parallel node fails, what happens?
  - Option A: Cancel all parallel nodes in that level
  - Option B: Let others complete, then show error
  - **Recommended:** Option B (let others finish)
- [ ] Show error dialog after level completes
- [ ] Allow retry/skip for failed node in parallel level

**Complexity:** High (complex error coordination)
**Files:** `lib/run.ts`, `components/error-dialog.tsx`

---

#### Task 2.0.5: Execution Controls with Parallel
- [ ] Pause: Stop after current level completes (wait for all parallel nodes)
- [ ] Cancel: Cancel all running nodes in current level
- [ ] Resume: Continue with next level
- [ ] Visual feedback showing "waiting for N nodes to complete"

**Complexity:** Medium
**Files:** `lib/run.ts`

---

## 2.1 Basic Router Node

### Architecture

```typescript
// types/router.ts
export interface RouterData {
  name: string;
  strategy: 'keyword' | 'sentiment';
  routes: Route[];
  defaultRoute?: string;
  executedRoute?: string; // Which route was taken
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
}

export interface Route {
  id: string;
  label: string;
  condition: RouteCondition;
}

export type RouteCondition =
  | { type: 'keyword'; keywords: string[]; matchMode: 'any' | 'all' }
  | { type: 'sentiment'; targetSentiment: 'positive' | 'negative' | 'neutral' };
```

### Tasks

#### Task 2.1.1: Router Node Component
- [ ] Create basic router node UI
- [ ] Show strategy (keyword/sentiment) badge
- [ ] Display route labels in node
- [ ] Color-coded indicator for executed route
- [ ] Multiple output handles (one per route + default)

**Complexity:** Medium (React Flow custom handles)
**Files:** `components/nodes/router-node.tsx`, `types/router.ts`

---

#### Task 2.1.2: Router Configuration UI
- [ ] Properties panel for router configuration
- [ ] Strategy selector (keyword vs sentiment)
- [ ] Route list editor (add/remove/edit routes)
- [ ] Keyword input (comma-separated)
- [ ] Match mode toggle (any/all keywords)

**Complexity:** Low
**Files:** `components/properties/router-properties.tsx`

---

#### Task 2.1.3: Route Evaluation - Keyword Strategy
- [ ] Implement keyword matching logic
- [ ] Case-insensitive search
- [ ] Match modes: "any" (OR), "all" (AND)
- [ ] Return matching route or default route

**Complexity:** Low
**Files:** `lib/execution/route-evaluator.ts`

---

#### Task 2.1.4: Route Evaluation - Sentiment Strategy
- [ ] Use simple sentiment library (sentiment.js) or OpenAI
- [ ] Classify input as positive/negative/neutral
- [ ] Match against target sentiment
- [ ] Confidence threshold handling

**Complexity:** Medium (external library integration)
**Files:** `lib/execution/route-evaluator.ts`

---

#### Task 2.1.5: Router Execution Integration
- [ ] Add router node to execution engine
- [ ] Evaluate routes and select next node
- [ ] Skip non-selected branches in execution
- [ ] Log which route was taken
- [ ] Highlight selected path visually

**Complexity:** High (graph traversal, execution flow)
**Files:** `lib/run.ts`, `lib/execution/levels.ts`

---

## 2.2 Memory System (Basic)

### Architecture

```typescript
// types/memory.ts
export interface MemoryData {
  name: string;
  scope: 'workflow'; // Only workflow scope for now
  values: Record<string, any>;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
}

// Extend AgentData
export interface AgentData {
  // ... existing fields
  memoryRead?: string[]; // Keys to read from memory
  memoryWrite?: { key: string; value: string }[]; // Keys to write (template support)
}
```

### Tasks

#### Task 2.2.1: Memory Node Component
- [ ] Create memory node UI
- [ ] Display key-value pairs (editable initial values)
- [ ] Show current state during/after execution
- [ ] Simple table view of memory contents

**Complexity:** Low
**Files:** `components/nodes/memory-node.tsx`, `types/memory.ts`

---

#### Task 2.2.2: Memory Manager
- [ ] In-memory Map-based storage
- [ ] Read/write/delete operations
- [ ] Workflow-scoped (reset on each run)
- [ ] Simple API: `memory.get(key)`, `memory.set(key, value)`

**Complexity:** Low
**Files:** `lib/execution/memory-manager.ts`

---

#### Task 2.2.3: Agent Memory Integration
- [ ] Add memory configuration to agent properties panel
- [ ] "Read from memory" - select keys to inject into prompt
- [ ] "Write to memory" - extract from output and store
- [ ] Template support: `${memory.userName}` in prompts

**Complexity:** Medium
**Files:** `components/properties/agent-properties.tsx`, `lib/run.ts`

---

#### Task 2.2.4: Memory Execution
- [ ] Initialize memory at workflow start
- [ ] Read memory values before agent execution
- [ ] Inject memory values into prompt context
- [ ] Write to memory after agent completes
- [ ] Log memory operations to console

**Complexity:** Medium
**Files:** `lib/run.ts`

---

## 2.3 Human-in-the-Loop (Basic)

### Architecture

```typescript
// types/human-review.ts
export interface HumanReviewData {
  name: string;
  reviewMode: 'approve-reject' | 'edit';
  required: boolean;
  timeout?: number; // Auto-approve after timeout (seconds)
  decision?: 'approved' | 'rejected';
  originalInput?: string;
  modifiedInput?: string;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
}
```

### Tasks

#### Task 2.3.1: Human Review Node Component
- [ ] Create review node UI
- [ ] Show review mode badge
- [ ] Display decision after review
- [ ] Visual indicator for pending review

**Complexity:** Low
**Files:** `components/nodes/human-review-node.tsx`, `types/human-review.ts`

---

#### Task 2.3.2: Review Modal UI
- [ ] Create modal that opens during execution
- [ ] Display input content for review
- [ ] Approve/Reject buttons
- [ ] Edit mode: textarea for modifying content
- [ ] Timer display (if timeout configured)

**Complexity:** Medium
**Files:** `components/human-review-modal/index.tsx`

---

#### Task 2.3.3: Execution Pause for Review
- [ ] Pause execution when reaching review node
- [ ] Wait for user decision (Promise-based)
- [ ] Resume with approved/rejected status
- [ ] Handle timeout (auto-approve)
- [ ] Pass modified content if edited

**Complexity:** High (async execution control)
**Files:** `lib/run.ts`

---

#### Task 2.3.4: Review Decision Handling
- [ ] If approved: continue to downstream nodes
- [ ] If rejected: skip downstream, mark as failed
- [ ] If edited: pass modified content instead of original
- [ ] Log decision to console
- [ ] Update node visual state

**Complexity:** Medium
**Files:** `lib/run.ts`

---

## Testing Strategy

### Parallel Execution Testing
- [ ] Create workflow with parallel branches
- [ ] Verify nodes execute simultaneously
- [ ] Check console logs interleave correctly
- [ ] Test error in one parallel branch
- [ ] Test pause/cancel during parallel execution

### Router Testing
- [ ] Keyword matching: any/all modes
- [ ] Sentiment classification
- [ ] Default route fallback
- [ ] Visual highlighting of selected path

### Memory Testing
- [ ] Read/write operations
- [ ] Template injection in prompts
- [ ] Memory persistence during workflow
- [ ] Memory reset between runs

### Human Review Testing
- [ ] Approve flow
- [ ] Reject flow (downstream skipped)
- [ ] Edit mode
- [ ] Timeout behavior

---

## Success Criteria

### Demo Workflow 1: Parallel Analysis
```
Document → Extractor (Agent 1) ┐
        → Contextualizer (Agent 2) ├→ Synthesizer → Result
```
✅ Both agents execute simultaneously
✅ Synthesizer waits for both to complete
✅ Total time ≈ max(Agent1, Agent2), not sum

---

### Demo Workflow 2: Content Moderation Router
```
User Input → Sentiment Router →
  [Positive] → Auto-Publish
  [Negative] → Human Review → Approve/Reject
```
✅ Router correctly classifies sentiment
✅ Positive content skips review
✅ Negative content triggers human review
✅ Visual path highlighting

---

### Demo Workflow 3: Stateful Chatbot
```
User Message → Agent (reads memory.conversationHistory) →
Memory (writes response) → Result
```
✅ Memory persists across nodes
✅ Agent can read previous context
✅ Template injection works (${memory.key})

---

## What's NOT in Phase 2A

**Deferred to Phase 2B or later:**
- Loop support (complex, requires cycle detection)
- LLM-as-judge routing (can add later)
- JSON field routing (niche use case)
- Memory visualization (polish feature)
- Memory inspector panel (nice-to-have)
- Multi-reviewer workflows (over-engineering)
- Audit trail (can add later)
- Complex approval rules (1-of-N, all-required)

**Focus:** Get core features working, tested, and polished.

---

## Implementation Order

**Week 1:**
1. Task 2.0.1-2.0.5: Parallel execution (highest value, builds on Phase 1)
2. Task 2.1.1-2.1.3: Basic router node with keyword strategy

**Week 2:**
3. Task 2.1.4-2.1.5: Sentiment routing and execution integration
4. Task 2.2.1-2.2.4: Basic memory system
5. Task 2.3.1-2.3.4: Human review (if time permits, otherwise Phase 2B)

---

## Documentation Needed

- [ ] Parallel execution guide (how to structure workflows)
- [ ] Router configuration tutorial
- [ ] Memory usage patterns
- [ ] Human review best practices
- [ ] Updated TESTING_GUIDE.md with Phase 2A tests
