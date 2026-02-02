# Phase 2C Implementation Plan: Polish & Advanced Features

**Status:** Ready to Implement
**Priority:** MEDIUM (Nice-to-have improvements)
**Dependencies:** Phase 2A Complete, Phase 2B Recommended
**Estimated Duration:** 1-2 weeks
**Scope:** UX polish, visualization, and advanced orchestration features

---

## Overview

Phase 2C adds polish and advanced capabilities to the orchestration system:
1. **Memory visualization** - Visual debugging and data flow understanding
2. **Audit trail** - Decision tracking and compliance
3. **Multi-reviewer workflows** - Advanced approval patterns
4. **Global memory scope** - Cross-workflow persistence

**Current State:** Core features work but lack advanced debugging tools and enterprise features.

**Goal State:** Production-ready orchestration with debugging tools, audit capabilities, and advanced review patterns.

---

## 2.0 Memory Inspector Panel

### Problem Statement

**Current Behavior:**
- Memory values only visible in Memory node display
- No way to see all memory keys at once during execution
- Can't track memory changes over time
- Debugging memory issues is difficult

**Desired Behavior:**
- Dedicated panel showing all memory state
- Real-time updates during execution
- History of changes (before/after values)
- Clear/reset functionality

### Architecture

```typescript
// New component structure
components/
  memory-inspector/
    index.tsx          // Main panel component
    memory-table.tsx   // Key-value table display
    memory-history.tsx // Timeline of changes
```

**Panel Placement:**
- Right sidebar (collapsible)
- Or bottom panel (next to console)
- Or floating panel (draggable)

**Recommended:** Right sidebar - consistent with properties panel pattern

### Tasks

#### Task 2.0.1: Memory Inspector UI Component
**Priority:** 🟡 High
**Estimated Time:** 3-4 hours
**Complexity:** Medium

**Implementation:**
```typescript
// components/memory-inspector/index.tsx
interface MemoryInspectorProps {
  memory: MemoryManager;
  isExecuting: boolean;
}

export function MemoryInspector({ memory, isExecuting }: MemoryInspectorProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  // Real-time updates during execution
  useEffect(() => {
    if (isExecuting) {
      const interval = setInterval(() => {
        const currentValues = memory.getAll();
        const changed = findChangedKeys(values, currentValues);
        setChangedKeys(changed);
        setValues(currentValues);
      }, 100); // Poll every 100ms

      return () => clearInterval(interval);
    }
  }, [isExecuting, memory]);

  return (
    <div className="memory-inspector">
      <header>
        <h3>Memory Inspector</h3>
        <button onClick={() => memory.clear()}>Clear All</button>
      </header>

      <MemoryTable
        values={values}
        changedKeys={changedKeys}
      />

      <MemoryHistory history={memory.getHistory()} />
    </div>
  );
}
```

**Features:**
- [ ] Collapsible panel in right sidebar
- [ ] Table showing all key-value pairs
- [ ] Highlight recently changed keys (fade animation)
- [ ] Clear all button
- [ ] Search/filter keys
- [ ] Value type indicators (string, number, object, array)
- [ ] Expandable objects/arrays (JSON tree view)

**Files:**
- `components/memory-inspector/index.tsx` (create)
- `components/memory-inspector/memory-table.tsx` (create)
- `app/page.tsx` - Add inspector to layout

**Acceptance Criteria:**
- Inspector panel displays all memory keys
- Real-time updates during execution
- Changed keys highlighted
- Clear button works
- Values formatted correctly (JSON pretty-print for objects)

---

#### Task 2.0.2: Memory Change Tracking
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Implementation:**
```typescript
// lib/execution/memory-manager.ts - Enhanced

export class MemoryManager {
  private memory = new Map<string, any>();
  private history: MemoryChange[] = [];

  set(key: string, value: any): void {
    const oldValue = this.memory.get(key);
    const change: MemoryChange = {
      timestamp: Date.now(),
      key,
      oldValue,
      newValue: value,
      operation: 'set'
    };

    this.history.push(change);
    this.memory.set(key, value);

    // Emit change event for real-time updates
    this.emit('change', change);
  }

  getHistory(): MemoryChange[] {
    return [...this.history];
  }

  getChangesSince(timestamp: number): MemoryChange[] {
    return this.history.filter(c => c.timestamp >= timestamp);
  }
}

interface MemoryChange {
  timestamp: number;
  key: string;
  oldValue: any;
  newValue: any;
  operation: 'set' | 'delete';
}
```

**Features:**
- [ ] Track all set/delete operations
- [ ] Store old and new values
- [ ] Timestamp each change
- [ ] Event emitter for real-time updates (optional)
- [ ] getHistory() method
- [ ] getChangesSince(timestamp) for incremental updates

**Files:**
- `lib/execution/memory-manager.ts` - Enhance existing class

**Acceptance Criteria:**
- All memory changes tracked
- History accessible via API
- Old/new values stored correctly
- Timestamps accurate

---

#### Task 2.0.3: Memory History Timeline
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Visual Design:**
```
Memory History
─────────────────────────
⏱️ 12:34:56.123
  userName: undefined → "Alice"

⏱️ 12:34:57.456
  userAge: undefined → 25

⏱️ 12:34:58.789
  userName: "Alice" → "Bob"
```

**Implementation:**
- [ ] Reverse chronological timeline
- [ ] Show before/after values
- [ ] Timestamps relative to workflow start
- [ ] Diff highlighting (red for removed, green for added)
- [ ] Filter by key
- [ ] Export as JSON

**Files:**
- `components/memory-inspector/memory-history.tsx` (create)

**Acceptance Criteria:**
- Timeline displays all changes
- Timestamps human-readable
- Diffs clearly visible
- Can filter by key

---

## 2.1 Memory Visualization

### Problem Statement

**Current Behavior:**
- No visual indication which nodes use memory
- Can't see data flow through memory
- Hard to understand memory dependencies

**Desired Behavior:**
- Visual connections showing memory read/write
- Badge indicators on nodes using memory
- Dashed lines from memory node to consumers
- Memory dependency graph overlay

### Architecture

**Approach A: React Flow Custom Edges** (Recommended)
- Add custom edge type for memory connections
- Dashed lines, different color (purple?)
- Rendered alongside regular edges

**Approach B: SVG Overlay**
- Custom SVG layer over React Flow canvas
- Draw lines programmatically
- More flexible but harder to maintain

**Approach C: Background Pattern**
- Subtle background connections
- Non-interactive visual aid

### Tasks

#### Task 2.1.1: Memory Connection Detection
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Low

**Implementation:**
```typescript
// lib/execution/memory-connections.ts

export function detectMemoryConnections(
  nodes: TypedNode[],
  edges: Edge[]
): MemoryConnection[] {
  const connections: MemoryConnection[] = [];

  // Find all memory nodes
  const memoryNodes = nodes.filter(n => n.type === 'memory');

  // Find all agents with memory operations
  const agentsWithMemory = nodes.filter(n => {
    if (n.type !== 'agent') return false;
    const data = n.data as AgentData;
    return data.memoryRead?.length > 0 || data.memoryWrite;
  });

  // Create virtual connections
  agentsWithMemory.forEach(agent => {
    const data = agent.data as AgentData;

    // Write connections: agent → memory
    if (data.memoryWrite) {
      connections.push({
        source: agent.id,
        target: memoryNodes[0]?.id, // Assume single memory node for now
        type: 'write',
        keys: [data.memoryWrite]
      });
    }

    // Read connections: memory → agent
    if (data.memoryRead?.length > 0) {
      connections.push({
        source: memoryNodes[0]?.id,
        target: agent.id,
        type: 'read',
        keys: data.memoryRead
      });
    }
  });

  return connections;
}

interface MemoryConnection {
  source: Id;
  target: Id;
  type: 'read' | 'write';
  keys: string[];
}
```

**Features:**
- [ ] Detect all memory read operations
- [ ] Detect all memory write operations
- [ ] Associate with memory node
- [ ] Track which keys are read/written

**Files:**
- `lib/execution/memory-connections.ts` (create)

**Acceptance Criteria:**
- All memory reads detected
- All memory writes detected
- Connections correctly linked to memory node

---

#### Task 2.1.2: Memory Connection Visualization
**Priority:** 🟢 Medium
**Estimated Time:** 3-4 hours
**Complexity:** High (React Flow custom rendering)

**Implementation:**
```typescript
// components/viewport/memory-overlay.tsx

export function MemoryOverlay({
  connections,
  nodes
}: MemoryOverlayProps) {
  return (
    <svg className="memory-connections-overlay">
      {connections.map(conn => (
        <MemoryConnectionLine
          key={`${conn.source}-${conn.target}`}
          source={getNodePosition(nodes, conn.source)}
          target={getNodePosition(nodes, conn.target)}
          type={conn.type}
        />
      ))}
    </svg>
  );
}

function MemoryConnectionLine({ source, target, type }) {
  const path = calculateCurvedPath(source, target);

  return (
    <path
      d={path}
      stroke={type === 'read' ? '#9333ea' : '#ec4899'}
      strokeWidth={2}
      strokeDasharray="5,5"
      fill="none"
      opacity={0.6}
      markerEnd={`url(#arrow-${type})`}
    />
  );
}
```

**Visual Style:**
- **Read connections:** Purple dashed lines (memory → agent)
- **Write connections:** Pink dashed lines (agent → memory)
- **Arrow markers:** Indicate direction
- **Opacity:** 0.6 to not overpower regular edges
- **Toggle:** Button to show/hide memory connections

**Features:**
- [ ] Dashed lines for memory connections
- [ ] Color-coded by type (read/write)
- [ ] Arrows showing direction
- [ ] Curved paths (avoid overlapping edges)
- [ ] Toggle visibility on/off
- [ ] Tooltips showing keys being accessed

**Files:**
- `components/viewport/memory-overlay.tsx` (create)
- `components/viewport/index.tsx` - Integrate overlay

**Acceptance Criteria:**
- Memory connections visible
- Read/write visually distinct
- Lines don't clutter UI
- Toggle works
- Tooltips show memory keys

---

#### Task 2.1.3: Memory Usage Badges
**Priority:** 🟢 Medium
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Visual Design:**
```
┌──────────────────┐
│ 🧠 Agent Name    │ ← Badge shows memory icon
│ gpt-4o-mini      │
│ 📖 userName      │ ← Shows keys being read
│ 💾 result        │ ← Shows keys being written
└──────────────────┘
```

**Implementation:**
- [ ] Add memory badge to agent nodes using memory
- [ ] Show read icon (📖) + keys in subtitle
- [ ] Show write icon (💾) + key in subtitle
- [ ] Badge color matches connection color (purple/pink)
- [ ] Only show when memory operations configured

**Files:**
- `components/nodes/index.tsx` - Update AgentNode component

**Acceptance Criteria:**
- Badges appear on nodes with memory operations
- Icons clearly indicate read vs write
- Keys displayed in badge
- Visual consistency with connection colors

---

## 2.2 Global Memory Scope

### Problem Statement

**Current Behavior:**
- Memory is workflow-scoped only
- Memory clears between runs
- No way to persist state across workflows

**Desired Behavior:**
- Option for global memory scope
- Global memory persists across runs
- Useful for session state, user preferences, counters

### Tasks

#### Task 2.2.1: Global Memory Scope Implementation
**Priority:** 🟢 Medium
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Implementation:**
```typescript
// lib/execution/memory-manager.ts

class MemoryManager {
  private workflowMemory = new Map<string, any>();
  private globalMemory = new Map<string, any>(); // New

  constructor(private scope: 'workflow' | 'global' = 'workflow') {}

  private getStore(): Map<string, any> {
    return this.scope === 'global' ? this.globalMemory : this.workflowMemory;
  }

  get(key: string): any {
    return this.getStore().get(key);
  }

  set(key: string, value: any): void {
    this.getStore().set(key, value);
    // ... history tracking
  }

  clear(): void {
    // Only clear workflow memory, preserve global
    this.workflowMemory.clear();
  }

  clearAll(): void {
    // Clear both scopes
    this.workflowMemory.clear();
    this.globalMemory.clear();
  }
}

// Usage in run.ts
const workflowMemory = new MemoryManager('workflow');
const globalMemory = new MemoryManager('global');
```

**Features:**
- [ ] Separate storage for workflow vs global scope
- [ ] Workflow memory clears on each run
- [ ] Global memory persists across runs
- [ ] Clear vs clearAll methods
- [ ] Scope indicator in memory inspector

**Files:**
- `lib/execution/memory-manager.ts` - Add scope support
- `lib/run.ts` - Initialize both scopes
- `types/memory.ts` - Add scope field to MemoryData

**Acceptance Criteria:**
- Workflow memory clears between runs
- Global memory persists between runs
- Both scopes accessible during execution
- Memory inspector shows scope indicator

---

#### Task 2.2.2: Memory Scope Configuration UI
**Priority:** 🟢 Medium
**Estimated Time:** 1 hour
**Complexity:** Low

**Implementation:**
- [ ] Add "Scope" dropdown to memory node properties
- [ ] Options: "Workflow" (default) or "Global"
- [ ] Visual indicator on memory node (color or icon)
- [ ] Help text explaining difference

**Visual:**
```
Memory Node Properties
─────────────────────
Name: Session State

Scope: [Global ▼]
       Workflow
       Global ✓

ℹ️ Workflow: Resets each run
ℹ️ Global: Persists across runs
```

**Files:**
- `components/properties/memory-properties.tsx` - Add scope selector
- `components/nodes/memory-node.tsx` - Show scope indicator

**Acceptance Criteria:**
- Scope configurable in properties panel
- Visual indicator on node
- Help text clear and helpful

---

## 2.3 Audit Trail

### Problem Statement

**Current Behavior:**
- Human review decisions not tracked
- No record of who approved/rejected
- Can't replay decision history
- No compliance trail

**Desired Behavior:**
- All review decisions logged
- Timestamp and reviewer info stored
- Before/after content comparison
- Exportable audit log

### Tasks

#### Task 2.3.1: Audit Log Data Structure
**Priority:** 🟡 High
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Implementation:**
```typescript
// lib/execution/audit-log.ts

export interface AuditEntry {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  type: 'human-review' | 'router-decision' | 'memory-write';
  decision?: 'approved' | 'rejected' | 'edited';
  beforeContent?: string;
  afterContent?: string;
  reviewer?: string; // Future: multi-user support
  metadata?: Record<string, any>;
}

export class AuditLog {
  private entries: AuditEntry[] = [];

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    this.entries.push({
      ...entry,
      id: generateId(),
      timestamp: Date.now()
    });
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntriesByNode(nodeId: string): AuditEntry[] {
    return this.entries.filter(e => e.nodeId === nodeId);
  }

  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
  }
}
```

**Features:**
- [ ] Store all human review decisions
- [ ] Store router decisions (optional)
- [ ] Store memory writes (optional)
- [ ] Timestamp each entry
- [ ] Export as JSON
- [ ] Filter by node, type, time range

**Files:**
- `lib/execution/audit-log.ts` (create)

**Acceptance Criteria:**
- All review decisions logged
- Data structure supports all required fields
- Export works correctly

---

#### Task 2.3.2: Audit Trail Integration
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Implementation:**
```typescript
// In lib/run.ts - human review execution

if (node.type === "human-review") {
  // ... existing code ...

  // After user decision
  auditLog.log({
    nodeId: node.id,
    nodeName: reviewData.name,
    type: 'human-review',
    decision: reviewDecision,
    beforeContent: originalInput,
    afterContent: modifiedInput || originalInput,
    metadata: {
      reviewMode: reviewData.reviewMode,
      timeToDecision: decisionTime - startTime
    }
  });

  // Log to console
  console.log('📝 Audit: Review decision logged');
}
```

**Integration Points:**
- [ ] Human review node (log all decisions)
- [ ] Router node (log route selections) - optional
- [ ] Memory writes (log all writes) - optional
- [ ] Initialize audit log in run()
- [ ] Pass audit log to executeNode()

**Files:**
- `lib/run.ts` - Integrate audit logging
- `app/page.tsx` - Initialize audit log state

**Acceptance Criteria:**
- All review decisions logged automatically
- Console confirms logging
- Audit log accessible after execution

---

#### Task 2.3.3: Audit Trail Viewer UI
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Visual Design:**
```
Audit Trail
─────────────────────────────────
🕐 12:34:56 - Human Review
   Node: Content Moderator
   Decision: APPROVED
   Time taken: 15s
   [View Details]

🕐 12:34:45 - Router Decision
   Node: Sentiment Router
   Route: Positive Path
   [View Details]

🕐 12:34:30 - Memory Write
   Node: Agent 1
   Key: userName
   Value: "Alice"
```

**Implementation:**
- [ ] Timeline view (reverse chronological)
- [ ] Entry type icons
- [ ] Expandable details (before/after comparison)
- [ ] Filter by entry type
- [ ] Search by node name
- [ ] Export button (download JSON)

**Files:**
- `components/audit-trail/index.tsx` (create)
- `components/audit-trail/audit-entry.tsx` (create)

**Acceptance Criteria:**
- Timeline displays all entries
- Details expandable
- Before/after comparison visible
- Export works

---

## 2.4 Multi-Reviewer Workflows

### Problem Statement

**Current Behavior:**
- Single reviewer per review node
- Either approve or reject
- No consensus mechanisms

**Desired Behavior:**
- Multiple reviewers can see same content
- Approval rules: 1-of-N, all-required, M-of-N
- Voting and consensus
- Conflict resolution

### Architecture

**Approach:**
- Each review node can have multiple "review slots"
- Each slot can be filled by different reviewer (future: actual users)
- For now: simulate with numbered reviewers (Reviewer 1, 2, 3)
- Approval rule determines when to proceed

```typescript
// types/human-review.ts - Enhanced

export interface HumanReviewData {
  // ... existing fields
  multiReview?: MultiReviewConfig;
}

export interface MultiReviewConfig {
  enabled: boolean;
  reviewerCount: number; // How many reviewers
  approvalRule: ApprovalRule;
  decisions?: ReviewDecision[]; // Track each reviewer's decision
}

export type ApprovalRule =
  | { type: '1-of-n' } // Any one approval is enough
  | { type: 'all-required' } // All must approve
  | { type: 'm-of-n'; m: number }; // At least M approvals

export interface ReviewDecision {
  reviewer: string; // Reviewer ID
  decision: 'approved' | 'rejected';
  timestamp: number;
  notes?: string;
}
```

### Tasks

#### Task 2.4.1: Multi-Review Data Model
**Priority:** 🟢 Medium
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Implementation:**
- [ ] Extend HumanReviewData with multiReview field
- [ ] Define MultiReviewConfig interface
- [ ] Define ApprovalRule types
- [ ] Define ReviewDecision interface

**Files:**
- `types/human-review.ts` - Add interfaces

**Acceptance Criteria:**
- Types defined correctly
- All approval rules supported

---

#### Task 2.4.2: Multi-Review Configuration UI
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Visual Design:**
```
Review Configuration
─────────────────────
☑️ Enable Multi-Reviewer

Number of Reviewers: [3]

Approval Rule:
  ○ Any one approval (1-of-N)
  ○ All required
  ● At least [2] of [3] approvals

ℹ️ Reviewers will be prompted sequentially
   or in parallel (based on rule).
```

**Implementation:**
- [ ] Checkbox to enable multi-review
- [ ] Number input for reviewer count
- [ ] Radio buttons for approval rule
- [ ] Conditional input for M-of-N rule
- [ ] Validation (M <= N)

**Files:**
- `components/properties/human-review-properties.tsx` - Add multi-review config

**Acceptance Criteria:**
- Multi-review configurable
- All approval rules selectable
- Validation prevents invalid configs

---

#### Task 2.4.3: Sequential Multi-Review Flow
**Priority:** 🟡 High
**Estimated Time:** 3-4 hours
**Complexity:** High

**Approach:** Show modal to each reviewer in sequence

```typescript
// Execution flow

const decisions: ReviewDecision[] = [];

for (let i = 0; i < reviewConfig.reviewerCount; i++) {
  // Show modal to reviewer i
  const decision = await showReviewModal(`Reviewer ${i + 1}`, content);

  decisions.push({
    reviewer: `Reviewer ${i + 1}`,
    decision,
    timestamp: Date.now()
  });

  // Check if we can stop early
  if (canDecideEarly(decisions, reviewConfig.approvalRule)) {
    break;
  }
}

// Final decision based on rule
const finalDecision = evaluateApprovalRule(decisions, reviewConfig.approvalRule);
```

**Early Termination:**
- **1-of-N:** Stop after first approval
- **All-required:** Stop after first rejection
- **M-of-N:** Stop when M approvals or too many rejections

**Implementation:**
- [ ] Loop through reviewers sequentially
- [ ] Show modal for each reviewer
- [ ] Track all decisions
- [ ] Early termination logic
- [ ] Final decision evaluation
- [ ] Update audit log with all decisions

**Files:**
- `lib/run.ts` - Multi-review execution logic
- `components/human-review-modal.tsx` - Show reviewer number

**Acceptance Criteria:**
- All reviewers prompted in sequence
- Early termination works correctly
- Final decision matches approval rule
- All decisions tracked

---

#### Task 2.4.4: Parallel Multi-Review Flow (Stretch Goal)
**Priority:** 🔵 Low
**Estimated Time:** 4-5 hours
**Complexity:** Very High

**Approach:** Show modals to all reviewers simultaneously (simulated)

**Challenge:** Browser can't show multiple modals at once. Need alternative:
- Multiple browser tabs/windows
- Simulated delay (pretend reviews happen in parallel)
- Future: Real-time collaboration with WebSockets

**For Phase 2C:** Skip parallel mode, do sequential only

---

#### Task 2.4.5: Approval Rule Evaluation
**Priority:** 🟡 High
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Implementation:**
```typescript
// lib/execution/approval-evaluator.ts

export function evaluateApprovalRule(
  decisions: ReviewDecision[],
  rule: ApprovalRule
): 'approved' | 'rejected' {
  const approvals = decisions.filter(d => d.decision === 'approved').length;
  const rejections = decisions.filter(d => d.decision === 'rejected').length;

  switch (rule.type) {
    case '1-of-n':
      return approvals >= 1 ? 'approved' : 'rejected';

    case 'all-required':
      return rejections === 0 ? 'approved' : 'rejected';

    case 'm-of-n':
      return approvals >= rule.m ? 'approved' : 'rejected';

    default:
      return 'rejected';
  }
}

export function canDecideEarly(
  decisions: ReviewDecision[],
  rule: ApprovalRule,
  totalReviewers: number
): boolean {
  const approvals = decisions.filter(d => d.decision === 'approved').length;
  const rejections = decisions.filter(d => d.decision === 'rejected').length;
  const remaining = totalReviewers - decisions.length;

  switch (rule.type) {
    case '1-of-n':
      // Can stop if we have 1 approval
      return approvals >= 1;

    case 'all-required':
      // Can stop if we have 1 rejection
      return rejections >= 1;

    case 'm-of-n':
      // Can stop if we have M approvals
      if (approvals >= rule.m) return true;
      // Can stop if we can't possibly get M approvals
      if (approvals + remaining < rule.m) return true;
      return false;

    default:
      return false;
  }
}
```

**Features:**
- [ ] Evaluate all approval rule types
- [ ] Early termination detection
- [ ] Handle edge cases (0 decisions, all abstain)

**Files:**
- `lib/execution/approval-evaluator.ts` (create)

**Acceptance Criteria:**
- All rules evaluate correctly
- Early termination logic correct
- Edge cases handled

---

#### Task 2.4.6: Multi-Review Visualization
**Priority:** 🟢 Medium
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Visual Design:**
```
┌─────────────────────┐
│ 👥 Human Review     │
│ Multi-Reviewer      │
│                     │
│ Reviewers: 3        │
│ Rule: 2-of-3        │
│                     │
│ Decisions:          │
│ ✅ Reviewer 1       │
│ ✅ Reviewer 2       │
│ ⏳ Reviewer 3       │
│                     │
│ Status: APPROVED    │
└─────────────────────┘
```

**Implementation:**
- [ ] Show reviewer count and rule on node
- [ ] Show decision checkmarks for each reviewer
- [ ] Pending indicator (⏳) for not-yet-decided
- [ ] Final status badge (APPROVED/REJECTED/PENDING)
- [ ] Tooltip with full decision history

**Files:**
- `components/nodes/human-review-node.tsx` - Add multi-review display

**Acceptance Criteria:**
- All reviewer decisions visible
- Status clear and prominent
- Visual updates as decisions come in

---

## Testing Strategy

### Memory Inspector Tests

#### Test 1: Real-Time Updates
**Steps:**
1. Open memory inspector
2. Run workflow with memory writes
3. Observe inspector during execution

**Expected:**
- Memory values update in real-time
- Changed keys highlighted
- Table updates smoothly

---

#### Test 2: Memory History
**Steps:**
1. Run workflow with multiple memory writes
2. Check memory history timeline

**Expected:**
- All changes listed chronologically
- Before/after values correct
- Timestamps accurate

---

### Memory Visualization Tests

#### Test 3: Memory Connection Display
**Steps:**
1. Create workflow with memory reads/writes
2. Enable memory visualization

**Expected:**
- Dashed lines from memory to readers (purple)
- Dashed lines from writers to memory (pink)
- Badges on nodes using memory

---

#### Test 4: Toggle Memory Visualization
**Steps:**
1. Enable memory connections
2. Toggle off
3. Toggle on

**Expected:**
- Connections hide/show correctly
- No performance issues
- Regular edges unaffected

---

### Global Memory Tests

#### Test 5: Global vs Workflow Scope
**Steps:**
1. Create workflow with global memory
2. Run workflow, check value
3. Run again, check value persists

**Expected:**
- Workflow memory clears between runs
- Global memory persists between runs

---

### Audit Trail Tests

#### Test 6: Review Decision Logging
**Steps:**
1. Run workflow with human review
2. Approve content
3. Check audit trail

**Expected:**
- Decision logged
- Timestamp accurate
- Before/after content stored

---

#### Test 7: Audit Export
**Steps:**
1. Run workflow with multiple reviews
2. Export audit log as JSON

**Expected:**
- All entries included
- Valid JSON format
- All fields present

---

### Multi-Reviewer Tests

#### Test 8: 1-of-N Approval
**Setup:** 3 reviewers, 1-of-N rule

**Steps:**
1. Reviewer 1 rejects
2. Reviewer 2 approves
3. (Reviewer 3 not needed - early termination)

**Expected:**
- Stops after Reviewer 2 approval
- Final decision: APPROVED
- Only 2 decisions recorded

---

#### Test 9: All-Required Approval
**Setup:** 3 reviewers, all-required rule

**Steps:**
1. Reviewer 1 approves
2. Reviewer 2 rejects
3. (Reviewer 3 not needed - early termination)

**Expected:**
- Stops after Reviewer 2 rejection
- Final decision: REJECTED

---

#### Test 10: M-of-N Approval
**Setup:** 5 reviewers, 3-of-5 rule

**Steps:**
1. Reviewers 1, 2, 3 approve
2. (Reviewers 4, 5 not needed - early termination)

**Expected:**
- Stops after 3rd approval
- Final decision: APPROVED

---

## Success Criteria

### Memory Inspector
- ✅ All memory values visible in real-time
- ✅ Changed keys highlighted
- ✅ History timeline shows all changes
- ✅ Clear button works
- ✅ Search/filter functional

### Memory Visualization
- ✅ Memory connections displayed correctly
- ✅ Read/write visually distinct
- ✅ Badges on memory-using nodes
- ✅ Toggle show/hide works
- ✅ No performance degradation

### Global Memory
- ✅ Global scope persists across runs
- ✅ Workflow scope clears each run
- ✅ Scope configurable in UI
- ✅ Inspector shows scope indicator

### Audit Trail
- ✅ All decisions logged automatically
- ✅ Export to JSON works
- ✅ Timeline viewer displays all entries
- ✅ Before/after comparison visible

### Multi-Reviewer
- ✅ Multiple reviewers prompted
- ✅ All approval rules work correctly
- ✅ Early termination functions
- ✅ Visual feedback shows all decisions
- ✅ Audit trail includes all reviewers

---

## Implementation Order

### Week 1: Memory Enhancements (Days 1-5)
**Day 1-2:** Memory Inspector
- Task 2.0.1: Inspector UI
- Task 2.0.2: Change tracking

**Day 3:** Memory History
- Task 2.0.3: Timeline component

**Day 4-5:** Memory Visualization
- Task 2.1.1: Connection detection
- Task 2.1.2: Connection rendering
- Task 2.1.3: Usage badges

**Day 5:** Global Memory
- Task 2.2.1: Scope implementation
- Task 2.2.2: Scope UI

**Deliverable:** Complete memory debugging system

---

### Week 2: Audit & Multi-Review (Days 6-10)
**Day 6-7:** Audit Trail
- Task 2.3.1: Data structure
- Task 2.3.2: Integration
- Task 2.3.3: Viewer UI

**Day 8-10:** Multi-Reviewer
- Task 2.4.1: Data model
- Task 2.4.2: Configuration UI
- Task 2.4.3: Sequential flow
- Task 2.4.5: Approval evaluation
- Task 2.4.6: Visualization

**Deliverable:** Enterprise-ready review system

---

## Dependencies

### External Dependencies
- Phase 2A must be complete (memory system exists)
- Phase 2B recommended but not required

### Internal Dependencies
- Task 2.0.2 depends on 2.0.1
- Task 2.0.3 depends on 2.0.2
- Task 2.1.2 depends on 2.1.1
- Task 2.3.2 depends on 2.3.1
- Task 2.4.3 depends on 2.4.1, 2.4.2
- Task 2.4.6 depends on 2.4.3

**Parallelizable:**
- Memory inspector (2.0.x) and Memory visualization (2.1.x) can be done in parallel
- Audit trail (2.3.x) and Multi-review (2.4.x) can be done in parallel

---

## Risk Mitigation

### High-Risk Items

1. **Memory Visualization Performance** (Task 2.1.2)
   - **Risk:** SVG overlays may cause lag with many nodes
   - **Mitigation:** Use React Flow's built-in rendering where possible
   - **Fallback:** Make visualization optional, off by default

2. **Multi-Review Complexity** (Task 2.4.3)
   - **Risk:** Complex approval logic may have edge cases
   - **Mitigation:** Comprehensive unit tests for approval evaluator
   - **Fallback:** Support only 1-of-N rule in v1

3. **Audit Log Size** (Task 2.3.1)
   - **Risk:** Large workflows generate huge audit logs
   - **Mitigation:** Add max size limit, auto-truncate old entries
   - **Fallback:** Only log review decisions, skip router/memory

---

## Optional Enhancements (Stretch Goals)

### If Time Permits:

1. **Memory Search**
   - Full-text search across memory values
   - Regex support
   - Filter by value type

2. **Memory Persistence**
   - Save global memory to localStorage
   - Restore on page load
   - Import/export memory state

3. **Audit Filtering**
   - Date range filter
   - Node type filter
   - Decision type filter

4. **Multi-Review Parallel Mode**
   - Real-time collaboration (requires backend)
   - WebSocket integration
   - Reviewer notifications

---

## Documentation Deliverables

- [ ] Memory inspector usage guide
- [ ] Memory visualization patterns
- [ ] Global vs workflow memory guide
- [ ] Audit trail compliance guide
- [ ] Multi-reviewer workflow examples
- [ ] Updated TESTING_GUIDE.md with Phase 2C tests

---

## Estimated Effort

### Total Time Estimate
- **Memory Inspector:** 7-10 hours
- **Memory Visualization:** 6-9 hours
- **Global Memory:** 2-3 hours
- **Audit Trail:** 5-8 hours
- **Multi-Reviewer:** 8-12 hours
- **Testing & Polish:** 4-6 hours
- **Documentation:** 2-3 hours

**Total:** 34-51 hours (~2-3 weeks at 10-20 hrs/week)

### Critical Path
1. Memory inspector (Days 1-2)
2. Audit trail integration (Days 6-7)
3. Multi-review flow (Days 8-9)
4. Testing (Day 10)

Everything else can be done in parallel or deferred.

---

## Phase 2C Completion Checklist

### Memory Enhancements
- [ ] Memory inspector panel implemented
- [ ] Real-time updates working
- [ ] Memory history timeline functional
- [ ] Memory connections visualized
- [ ] Memory usage badges on nodes
- [ ] Global memory scope working

### Audit & Compliance
- [ ] Audit log data structure defined
- [ ] All decisions logged automatically
- [ ] Audit trail viewer UI complete
- [ ] Export to JSON working
- [ ] Before/after comparison visible

### Multi-Reviewer
- [ ] Multi-review data model defined
- [ ] Configuration UI complete
- [ ] Sequential review flow working
- [ ] All approval rules functional
- [ ] Early termination working
- [ ] Visualization showing all decisions

### Quality Gates
- [ ] TypeScript compiles with no errors
- [ ] All test scenarios pass
- [ ] No performance degradation
- [ ] Memory visualization toggleable
- [ ] Documentation complete

---

## Next Steps After Phase 2C

With Phase 2C complete, Phase 2 is **100% done**:
- ✅ Parallel execution (2A)
- ✅ Router + loops (2B)
- ✅ Memory debugging (2C)
- ✅ Audit + multi-review (2C)

**Recommended Next:**
- **Phase 3:** Tools & Integrations (web search, APIs, code execution)
- **Phase 4:** Templates & UX (polished workflows, keyboard shortcuts)
- **Phase 6:** Testing & Quality (unit tests, E2E tests, CI/CD)

Phase 2 orchestration is complete - time to add capabilities or polish UX!
