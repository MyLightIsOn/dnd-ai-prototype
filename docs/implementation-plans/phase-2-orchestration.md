# Phase 2 Implementation Plan: Advanced Orchestration

**Status:** Planned
**Priority:** MEDIUM-HIGH
**Dependencies:** Phase 1 (Provider system must be complete)
**Estimated Duration:** 2 weeks

---

## Overview

Phase 2 adds intelligent workflow control: conditional branching, loops, shared memory, and human-in-the-loop patterns. This transforms linear pipelines into dynamic, agentic workflows.

---

## 2.1 Conditional Branching & Routing

### Architecture

```typescript
// types/router.ts
export interface RouterData {
  name: string;
  strategy: 'keyword' | 'sentiment' | 'llm-judge' | 'json-field';
  routes: Route[];
  defaultRoute?: string;
  executedRoute?: string; // Set during execution
}

export interface Route {
  id: string;
  label: string;
  condition: RouteCondition;
  handleId: string; // React Flow handle ID
}

export type RouteCondition =
  | { type: 'keyword'; keywords: string[]; matchMode: 'any' | 'all' }
  | { type: 'sentiment'; targetSentiment: 'positive' | 'negative' | 'neutral' }
  | { type: 'llm-judge'; prompt: string; threshold?: number }
  | { type: 'json-field'; field: string; operator: 'equals' | 'contains' | 'gt' | 'lt'; value: any };
```

### Tasks

#### Task 2.1.1: Router Node Component
- [ ] Create router node with multiple output handles
- [ ] Visual configuration UI for routes
- [ ] Color-coded output handles
- [ ] Route condition editor

**Complexity:** Medium
**Files:** `components/nodes/router-node.tsx`, `types/router.ts`

---

#### Task 2.1.2: Route Evaluation Engine
- [ ] Implement keyword matching
- [ ] Implement sentiment analysis (use sentiment library or LLM)
- [ ] Implement LLM-as-judge evaluation
- [ ] Implement JSON field extraction

**Complexity:** Medium
**Files:** `lib/execution/route-evaluator.ts`

---

#### Task 2.1.3: Multi-Handle Support in Viewport
- [ ] Modify viewport to support multiple source handles
- [ ] Dynamic handle creation based on routes
- [ ] Handle positioning and layout
- [ ] Edge connection validation

**Complexity:** High (React Flow internals)
**Files:** `components/viewport/index.tsx`, `components/nodes/router-node.tsx`

---

#### Task 2.1.4: Execution Path Highlighting
- [ ] Track which route was taken during execution
- [ ] Highlight active path with color
- [ ] Show route decision in logs
- [ ] Visual indicator on router node

**Complexity:** Low
**Files:** `lib/run.ts`, `components/viewport/index.tsx`

---

#### Task 2.1.5: Loop Support
- [ ] Detect loops in graph (don't prevent them)
- [ ] Add max iteration limit per loop
- [ ] Loop counter in execution state
- [ ] Break conditions (configurable)

**Complexity:** High (cycle detection, execution control)
**Files:** `lib/topoSort.ts`, `lib/run.ts`

---

## 2.2 Memory & Context Management

### Architecture

```typescript
// types/memory.ts
export interface MemoryData {
  name: string;
  scope: 'workflow' | 'global';
  initialValues: Record<string, any>;
  currentValues?: Record<string, any>;
}

export interface MemoryOperation {
  type: 'read' | 'write' | 'delete';
  key: string;
  value?: any;
}

// Extend AgentData
export interface AgentData {
  // ... existing fields
  memoryOperations?: MemoryOperation[];
  useMemoryContext?: boolean; // Inject all memory into prompt
}
```

### Tasks

#### Task 2.2.1: Memory Node Component
- [ ] Create memory node UI
- [ ] Initial values editor (key-value pairs)
- [ ] Current state display (read-only)
- [ ] Memory inspector panel

**Complexity:** Medium
**Files:** `components/nodes/memory-node.tsx`, `types/memory.ts`

---

#### Task 2.2.2: Memory Manager
- [ ] Create in-memory store (Map-based)
- [ ] Read/write/delete operations
- [ ] Scope handling (workflow vs global)
- [ ] Change tracking and history

**Complexity:** Low
**Files:** `lib/execution/memory-manager.ts`

---

#### Task 2.2.3: Agent-Memory Integration
- [ ] Add memory operations to agent properties
- [ ] Read from memory before execution
- [ ] Write to memory after execution
- [ ] Memory template injection (${memory.key})

**Complexity:** Medium
**Files:** `components/properties/agent-properties.tsx`, `lib/run.ts`

---

#### Task 2.2.4: Memory Inspector UI
- [ ] Side panel showing all memory state
- [ ] Real-time updates during execution
- [ ] Highlight changed keys
- [ ] Memory history timeline

**Complexity:** Medium
**Files:** `components/memory-inspector/index.tsx`

---

#### Task 2.2.5: Memory Visualization
- [ ] Show which nodes read/write memory
- [ ] Dashed lines from memory node to consumers
- [ ] Indicator badge on nodes using memory
- [ ] Memory dependency graph

**Complexity:** High (custom React Flow overlays)
**Files:** `components/viewport/memory-overlay.tsx`

---

## 2.3 Human-in-the-Loop Node

### Architecture

```typescript
// types/human-review.ts
export interface HumanReviewData {
  name: string;
  reviewMode: 'approve-reject' | 'approve-reject-edit' | 'edit-only';
  required: boolean; // If false, auto-approve after timeout
  timeout?: number; // Seconds
  decision?: 'approved' | 'rejected' | 'edited';
  originalInput?: string;
  modifiedInput?: string;
  reviewer?: string;
  reviewedAt?: string;
}
```

### Tasks

#### Task 2.3.1: Human Review Node Component
- [ ] Create node UI with review indicator
- [ ] Show pending/completed state
- [ ] Display decision badge
- [ ] Link to review dialog

**Complexity:** Low
**Files:** `components/nodes/human-review-node.tsx`, `types/human-review.ts`

---

#### Task 2.3.2: Review Modal UI
- [ ] Pause execution and show modal
- [ ] Display input for review
- [ ] Edit textarea (if enabled)
- [ ] Approve/Reject buttons
- [ ] Timer display (if timeout set)

**Complexity:** Medium
**Files:** `components/human-review-modal/index.tsx`

---

#### Task 2.3.3: Execution Pause/Resume
- [ ] Pause execution at review node
- [ ] Wait for user action (Promise-based)
- [ ] Resume with approval decision
- [ ] Handle timeout (auto-approve)

**Complexity:** High (async coordination)
**Files:** `lib/run.ts`

---

#### Task 2.3.4: Audit Trail
- [ ] Log all review decisions
- [ ] Before/after comparison
- [ ] Timestamp and reviewer info
- [ ] Export audit log as JSON

**Complexity:** Low
**Files:** `lib/execution/audit-log.ts`

---

#### Task 2.3.5: Approval Workflow
- [ ] Skip downstream if rejected
- [ ] Pass modified content if edited
- [ ] Multiple reviewers (parallel)
- [ ] Approval rules (1-of-N, all required)

**Complexity:** High
**Files:** `lib/run.ts`

---

## Testing Strategy

### Router Testing
- [ ] All route strategies with sample inputs
- [ ] Edge cases (no match → default route)
- [ ] Multiple routes matching
- [ ] Loop execution with limits

### Memory Testing
- [ ] Read/write operations
- [ ] Scope isolation (workflow vs global)
- [ ] Concurrent access patterns
- [ ] Memory persistence during pause

### Human Review Testing
- [ ] Review modal interactions
- [ ] Timeout behavior
- [ ] Edit mode
- [ ] Approval/rejection paths

---

## Success Criteria

### Demo Scenario 1: Content Moderation
```
User Input → Sentiment Router →
  [Positive] → Approve Agent → Publish
  [Negative] → Human Review → Approve/Reject
```

### Demo Scenario 2: Research Loop
```
Topic → Research Agent → Quality Router →
  [Good] → Summary
  [Poor] → Memory (iteration count) → Research Agent (loop, max 3x)
```

### Demo Scenario 3: Multi-Agent Collaboration
```
Task → Agent A → Memory (writes plan) →
       Agent B (reads plan) → Memory (writes code) →
       Agent C (reads code) → Human Review → Deploy
```

---

## Documentation

- [ ] Router configuration guide
- [ ] Memory usage patterns
- [ ] Human review best practices
- [ ] Example workflows for each feature
