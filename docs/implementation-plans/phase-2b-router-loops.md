# Phase 2B Implementation Plan: Router Completion & Loops

**Status:** Ready to Implement
**Priority:** HIGH (Critical functionality)
**Dependencies:** Phase 2A Complete
**Estimated Duration:** 1-2 weeks
**Scope:** Complete router functionality + loop support

---

## Overview

Phase 2B completes the orchestration system by:
1. Making routers actually work (execution integration)
2. Adding loop support for iterative workflows
3. Implementing advanced routing strategies
4. Visual feedback for execution paths

**Current State:** Router nodes exist with UI and evaluation logic, but execution doesn't branch based on router decisions. No loop support.

**Goal State:** Routers direct execution flow; loops enable iterative workflows with configurable limits.

---

## 2.0 Router Execution Integration

### Problem Statement

**Current Behavior:**
- Router node evaluates which route should be taken
- Route decision is stored in node data
- BUT: Execution continues to ALL downstream nodes (doesn't branch)

**Desired Behavior:**
- Router evaluates route
- Execution follows ONLY the selected edge
- Non-selected branches are skipped
- Visual feedback shows which path was taken

### Architecture

```typescript
// lib/run.ts - Modified execution flow

async function executeNode(nodeId, ...) {
  // ... existing code ...

  if (node.type === "router") {
    const routerData = node.data as RouterData;

    // 1. Evaluate routes
    const selectedRoute = evaluateRoute(
      routerData.strategy,
      routerData.routes,
      dependencyOutputs[0]
    );

    // 2. Store decision in node data
    setNodes(nodes => nodes.map(n =>
      n.id === nodeId ? {
        ...n,
        data: { ...n.data, executedRoute: selectedRoute.id }
      } : n
    ));

    // 3. Filter edges to follow only selected route
    // This modifies the execution graph for downstream nodes
    const selectedEdges = edges.filter(edge =>
      edge.source === nodeId && edge.sourceHandle === selectedRoute.handleId
    );

    // 4. Mark non-selected edges as inactive (for visual feedback)
    setEdges(edges => edges.map(edge => ({
      ...edge,
      style: edge.source === nodeId && edge.sourceHandle !== selectedRoute.handleId
        ? { ...edge.style, opacity: 0.3, stroke: '#ccc' }
        : edge.style
    })));

    // Return route output for downstream
    nodeOutputs[nodeId] = dependencyOutputs[0]; // Pass through input
  }
}
```

### Tasks

#### Task 2.0.1: Route Execution Logic
**Priority:** 🔴 CRITICAL
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Implementation:**
- [ ] Modify `executeNode()` in `lib/run.ts` to handle router nodes
- [ ] Call `evaluateRoute()` from route-evaluator.ts
- [ ] Store selected route ID in node data (`executedRoute` field)
- [ ] Return input as output (routers pass through content)
- [ ] Log route decision to console

**Files:**
- `lib/run.ts` - Add router case to executeNode switch

**Acceptance Criteria:**
- Router node executes without errors
- Console shows which route was selected
- Node data contains `executedRoute` value

---

#### Task 2.0.2: Edge Filtering for Conditional Branches
**Priority:** 🔴 CRITICAL
**Estimated Time:** 3-4 hours
**Complexity:** High

**Challenge:** Current execution model processes all edges. Need to conditionally skip edges based on router decisions.

**Approach A: Dynamic Edge Filtering** (Recommended)
```typescript
// In run() function, after router executes:
function getActiveEdges(allEdges: Edge[], routerDecisions: Map<Id, string>): Edge[] {
  return allEdges.filter(edge => {
    const sourceNode = nodesById[edge.source];
    if (sourceNode.type !== 'router') return true; // Keep all non-router edges

    const routerData = sourceNode.data as RouterData;
    const selectedRouteId = routerDecisions.get(edge.source);
    const selectedRoute = routerData.routes.find(r => r.id === selectedRouteId);

    // Keep edge only if it matches selected route handle
    return edge.sourceHandle === selectedRoute?.handleId;
  });
}
```

**Approach B: Mark Edges as Inactive** (Alternative)
- Add `active: boolean` flag to edge data
- Skip inactive edges during level grouping
- Keep all edges in state for visual feedback

**Implementation:**
- [ ] Create `getActiveEdges()` helper function
- [ ] Modify `groupNodesByLevel()` to accept active edges only
- [ ] Track router decisions in Map during execution
- [ ] Filter edges after each router node executes
- [ ] Recalculate execution levels for remaining nodes

**Files:**
- `lib/run.ts` - Router decision tracking
- `lib/execution/levels.ts` - May need to accept edge filter

**Acceptance Criteria:**
- Only nodes on selected path execute
- Non-selected branches completely skipped
- Multiple routers in workflow work correctly

---

#### Task 2.0.3: Visual Path Highlighting
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Implementation:**
- [ ] After router execution, update edge styles
- [ ] Selected path edges: bold, colored (green or blue)
- [ ] Non-selected path edges: dim, gray
- [ ] Add `animated={true}` to selected edges
- [ ] Router node shows executed route in green

**Edge Style Updates:**
```typescript
// After router executes
setEdges(edges => edges.map(edge => {
  if (edge.source !== routerId) return edge;

  const isSelected = edge.sourceHandle === selectedRoute.handleId;
  return {
    ...edge,
    style: {
      stroke: isSelected ? '#10b981' : '#d1d5db',
      strokeWidth: isSelected ? 2 : 1,
      opacity: isSelected ? 1 : 0.3
    },
    animated: isSelected
  };
}));
```

**Files:**
- `lib/run.ts` - Edge style updates during execution
- `components/nodes/router-node.tsx` - Already highlights executed route

**Acceptance Criteria:**
- Selected path visually distinct (bold, colored)
- Non-selected paths dimmed
- Visual feedback clear even with complex workflows

---

#### Task 2.0.4: Default Route Handling
**Priority:** 🟡 High
**Estimated Time:** 1-2 hours
**Complexity:** Low

**Implementation:**
- [ ] If no route matches, select default route (if configured)
- [ ] If no default route, throw error
- [ ] Log default route selection to console
- [ ] Visual indicator for default route (different color?)

**Logic:**
```typescript
const selectedRoute = evaluateRoute(...);

if (!selectedRoute) {
  if (routerData.defaultRoute) {
    selectedRoute = routerData.routes.find(r => r.id === routerData.defaultRoute);
    logs.concat("⚠️ Router: No route matched, using default");
  } else {
    throw new Error("Router: No route matched and no default route configured");
  }
}
```

**Files:**
- `lib/execution/route-evaluator.ts` - Return null if no match
- `lib/run.ts` - Handle null return value

**Acceptance Criteria:**
- Default route triggers when no routes match
- Error thrown if no match and no default
- Console clearly indicates default route usage

---

## 2.1 Loop Support

### Architecture

**Current Limitation:** Topological sort fails if graph has cycles (intentional).

**New Behavior:**
- Detect loops in graph
- Allow execution to cycle back
- Track iteration count
- Enforce max iteration limit
- Support break conditions

### Loop Node Design

```typescript
// types/loop.ts
export interface LoopData {
  name: string;
  maxIterations: number; // Default: 10
  currentIteration?: number;
  breakCondition?: LoopBreakCondition;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
}

export interface LoopBreakCondition {
  type: 'always' | 'keyword' | 'llm-judge';
  // If keyword: break when input contains keyword
  keywords?: string[];
  // If llm-judge: break when LLM says "break"
  llmPrompt?: string;
}
```

**Alternative Approach:** No Loop Node, Just Allow Cycles
- Detect cycles in graph (don't prevent them)
- Add iteration counter to execution state
- Break after N iterations of any node
- Simpler but less flexible

**Recommended:** Loop Node approach (more explicit, better UX)

### Tasks

#### Task 2.1.1: Cycle Detection (Don't Prevent)
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Current:** `topoSort()` returns `hasCycle: true` and empty order.

**New Behavior:**
```typescript
// lib/topoSort.ts
export function topoSort(nodes, edges) {
  // Try standard topological sort
  const { order, hasCycle } = kahn(nodes, edges);

  if (!hasCycle) {
    return { order, hasCycle: false, cycles: [] };
  }

  // If cycle detected, identify loop nodes
  const cycles = detectCycles(nodes, edges);

  // Return partial order (nodes before loop entry)
  const partialOrder = partialTopoSort(nodes, edges, cycles);

  return { order: partialOrder, hasCycle: true, cycles };
}

function detectCycles(nodes, edges): Id[][] {
  // Use Tarjan's algorithm or DFS to find strongly connected components
  // Each SCC with >1 node is a cycle
}
```

**Implementation:**
- [ ] Add cycle detection algorithm (Tarjan's or DFS-based)
- [ ] Return cycle information (which nodes form loops)
- [ ] Modify `topoSort` to return partial order even with cycles
- [ ] Update `run()` to handle `hasCycle: true` gracefully

**Files:**
- `lib/topoSort.ts` - Add cycle detection

**Acceptance Criteria:**
- Cycles detected correctly
- Cycle nodes identified
- Execution can proceed with cycles present

---

#### Task 2.1.2: Loop Node Component
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Low

**Visual Design:**
- Circular icon or loop symbol
- Shows current/max iterations (e.g., "2/10")
- Break condition indicator
- Color: Orange or purple to distinguish from other nodes

**Implementation:**
- [ ] Create `types/loop.ts` with LoopData interface
- [ ] Create `components/nodes/loop-node.tsx`
- [ ] Show iteration counter during execution
- [ ] Display break condition in subtitle
- [ ] Add to nodeTypes registry

**Files:**
- `types/loop.ts` (create)
- `components/nodes/loop-node.tsx` (create)
- `components/nodes/index.tsx` - Register loop node

**Acceptance Criteria:**
- Loop node renders correctly
- Iteration count displays during execution
- Break condition visible in node

---

#### Task 2.1.3: Loop Execution Engine
**Priority:** 🔴 CRITICAL
**Estimated Time:** 4-6 hours
**Complexity:** Very High

**Challenge:** Execution currently assumes DAG (no revisiting nodes). Need to support cycles.

**Approach:**
```typescript
// Pseudocode for loop execution

const iterationCounts = new Map<Id, number>(); // Track iterations per node

while (hasNodesToExecute) {
  const node = getNextNode();

  // Check if node is in a loop
  const isLoopNode = cycles.some(cycle => cycle.includes(node.id));

  if (isLoopNode) {
    const count = iterationCounts.get(node.id) || 0;
    const loopData = findLoopNodeInCycle(node.id);

    // Check max iterations
    if (count >= loopData.maxIterations) {
      logs.concat(`🔁 Loop limit reached for ${node.id}, breaking`);
      break; // Exit loop
    }

    // Check break condition
    if (shouldBreakLoop(loopData.breakCondition, nodeOutputs)) {
      logs.concat(`🔁 Break condition met, exiting loop`);
      break;
    }

    iterationCounts.set(node.id, count + 1);
  }

  await executeNode(node.id);
}
```

**Implementation:**
- [ ] Modify `run()` to track iteration counts
- [ ] Allow nodes to execute multiple times
- [ ] Check max iterations before each loop iteration
- [ ] Evaluate break conditions
- [ ] Update visual feedback (show iteration count on loop node)
- [ ] Prevent infinite loops (hard limit: 100 iterations)

**Files:**
- `lib/run.ts` - Major modifications to execution loop

**Acceptance Criteria:**
- Simple loops execute correctly (A → B → A)
- Max iterations enforced
- Infinite loops prevented
- Execution terminates gracefully

---

#### Task 2.1.4: Break Condition Evaluation
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Medium

**Break Condition Types:**

1. **Always Break** (after max iterations)
2. **Keyword Break** (when output contains keyword)
3. **LLM Judge Break** (LLM decides to break)

**Implementation:**
- [ ] Create `lib/execution/loop-evaluator.ts`
- [ ] Implement keyword-based break check
- [ ] Implement LLM-judge break check (call LLM with prompt)
- [ ] Integrate with loop execution engine

**LLM Judge Example:**
```typescript
async function evaluateLLMBreak(
  prompt: string,
  loopInput: string,
  iteration: number
): Promise<boolean> {
  const llmPrompt = `${prompt}

Current iteration: ${iteration}
Current output: ${loopInput}

Should we break the loop? Respond with only "BREAK" or "CONTINUE".`;

  const response = await callLLM(llmPrompt);
  return response.includes("BREAK");
}
```

**Files:**
- `lib/execution/loop-evaluator.ts` (create)

**Acceptance Criteria:**
- Keyword break works
- LLM break works (if configured)
- Break conditions logged to console

---

#### Task 2.1.5: Loop Configuration UI
**Priority:** 🟡 High
**Estimated Time:** 2-3 hours
**Complexity:** Low

**Properties Panel:**
- Max iterations input (number, default: 10)
- Break condition type dropdown
- Keyword input (if keyword break selected)
- LLM prompt textarea (if LLM break selected)

**Implementation:**
- [ ] Create `components/properties/loop-properties.tsx`
- [ ] Max iterations input with validation (1-100)
- [ ] Break condition type selector
- [ ] Conditional inputs based on break type
- [ ] Help text explaining each option

**Files:**
- `components/properties/loop-properties.tsx` (create)
- `components/properties/index.tsx` - Add loop case

**Acceptance Criteria:**
- Max iterations configurable
- Break condition type selectable
- Conditional UI based on break type
- Validation prevents invalid values

---

## 2.2 Advanced Routing Strategies

### Task 2.2.1: LLM-as-Judge Routing
**Priority:** 🟡 High
**Estimated Time:** 3-4 hours
**Complexity:** Medium

**Use Case:** Complex routing decisions that require understanding content.

**Example:** Route customer feedback to "bug", "feature request", or "question" based on content analysis.

**Implementation:**
```typescript
// In route-evaluator.ts

async function evaluateLLMJudge(
  input: string,
  routes: Route[],
  judgePrompt: string
): Promise<Route | null> {
  const routeLabels = routes.map(r => r.label).join(", ");

  const prompt = `${judgePrompt}

Available routes: ${routeLabels}

Input to classify:
${input}

Which route should this input take? Respond with ONLY the route label.`;

  const llmResponse = await callLLM(prompt);

  // Match LLM response to route label
  const selectedRoute = routes.find(r =>
    llmResponse.toLowerCase().includes(r.label.toLowerCase())
  );

  return selectedRoute || null;
}
```

**Tasks:**
- [ ] Extend RouteCondition type to include llm-judge
- [ ] Add LLM judge configuration UI in router properties
- [ ] Implement evaluateLLMJudge() in route-evaluator.ts
- [ ] Handle API errors gracefully
- [ ] Add loading indicator during LLM call
- [ ] Cost tracking for routing LLM calls

**Files:**
- `types/router.ts` - Extend RouteCondition
- `lib/execution/route-evaluator.ts` - Add LLM judge logic
- `components/properties/router-properties.tsx` - Add UI for judge prompt

**Acceptance Criteria:**
- LLM judge routing works with OpenAI/Anthropic
- Errors handled gracefully
- Cost tracked and logged
- Prompt configurable in UI

---

### Task 2.2.2: JSON-Field Routing
**Priority:** 🟢 Medium
**Estimated Time:** 2-3 hours
**Complexity:** Low

**Use Case:** Route based on structured data from API responses.

**Example:** API returns `{ "status": "success", "priority": "high" }` → route based on priority field.

**Implementation:**
```typescript
function evaluateJSONField(
  input: string,
  condition: JSONFieldCondition
): boolean {
  try {
    const json = JSON.parse(input);
    const fieldValue = json[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(condition.value);
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  } catch (error) {
    console.error('JSON parsing error:', error);
    return false;
  }
}
```

**Tasks:**
- [ ] Extend RouteCondition type for JSON field
- [ ] Implement evaluateJSONField() in route-evaluator
- [ ] Add JSON field configuration UI
- [ ] Handle parsing errors
- [ ] Support nested field paths (optional: "user.name")

**Files:**
- `types/router.ts` - Extend RouteCondition
- `lib/execution/route-evaluator.ts` - Add JSON field logic
- `components/properties/router-properties.tsx` - Add UI

**Acceptance Criteria:**
- JSON parsing works correctly
- All operators (equals, contains, gt, lt) work
- Invalid JSON handled gracefully
- Field path configurable in UI

---

## Testing Strategy

### Router Execution Tests

#### Test 1: Basic Router Branching
**Workflow:**
```
Prompt → Router (keyword: "urgent" → Route A, else → Route B)
       → Route A → Result A
       → Route B → Result B
```

**Test Cases:**
- Input contains "urgent" → Route A executes, Route B skipped
- Input doesn't contain "urgent" → Route B executes, Route A skipped
- Visual: Selected path highlighted, non-selected dimmed

---

#### Test 2: Cascading Routers
**Workflow:**
```
Prompt → Router 1 → [Route X] → Router 2 → [Route Y1] → Result 1
                              → [Route Y2] → Result 2
              → [Route Z] → Result 3
```

**Test Cases:**
- Multiple routers in sequence work correctly
- Only final selected path executes
- Visual feedback shows complete path

---

#### Test 3: Router with Default Route
**Workflow:**
```
Prompt → Router (route1, route2, default) → Result
```

**Test Cases:**
- Input matches route1 → route1 executes
- Input matches route2 → route2 executes
- Input matches neither → default route executes
- No default configured + no match → error

---

### Loop Tests

#### Test 4: Basic Loop (Fixed Iterations)
**Workflow:**
```
Agent 1 → Loop (max: 3) → Agent 2 → [loops back to Agent 1]
                       → [exit] → Result
```

**Test Cases:**
- Loop executes exactly 3 times
- Iteration counter updates (0 → 1 → 2 → 3)
- Execution exits after max iterations
- Result receives output from final iteration

---

#### Test 5: Loop with Keyword Break
**Workflow:**
```
Agent → Loop (break on "COMPLETE") → [loop or exit]
```

**Test Cases:**
- Agent outputs "COMPLETE" → loop breaks early
- Agent doesn't output "COMPLETE" → continues to max iterations
- Break logged to console

---

#### Test 6: Nested Loops (Advanced)
**Workflow:**
```
Outer Loop (max: 2)
  → Inner Loop (max: 3)
    → Agent
  → Result
```

**Test Cases:**
- Inner loop executes 3 times per outer loop iteration
- Total executions: 2 * 3 = 6
- Iteration counters tracked separately

---

### Advanced Routing Tests

#### Test 7: LLM-as-Judge Routing
**Workflow:**
```
Prompt → Router (LLM judge) → [Bug] → Result A
                           → [Feature] → Result B
                           → [Question] → Result C
```

**Test Cases:**
- Bug report routed to Bug path
- Feature request routed to Feature path
- Question routed to Question path
- LLM cost tracked

---

#### Test 8: JSON-Field Routing
**Workflow:**
```
Agent (outputs JSON) → Router (field: "priority", equals: "high") → Result
```

**Test Cases:**
- JSON with priority="high" → high priority route
- JSON with priority="low" → default route
- Invalid JSON → error handling

---

## Success Criteria

### Router Execution
- ✅ Router nodes direct execution flow (don't just store decision)
- ✅ Non-selected branches completely skipped
- ✅ Visual feedback clearly shows selected path
- ✅ Multiple routers in workflow work correctly
- ✅ Default routes work as expected

### Loops
- ✅ Simple loops execute correctly
- ✅ Max iterations enforced
- ✅ Break conditions work (keyword, LLM)
- ✅ Infinite loops prevented (hard limit)
- ✅ Iteration counter visible during execution

### Advanced Routing
- ✅ LLM-as-judge routing works
- ✅ JSON-field routing works
- ✅ All routing strategies available in UI
- ✅ Error handling for all strategies

### Demo Workflows
See "Testing Strategy" section for 8 comprehensive demo workflows.

---

## Implementation Order

### Week 1: Critical Router Functionality
**Days 1-2:** Router Execution Integration
- Task 2.0.1: Route execution logic ⭐
- Task 2.0.2: Edge filtering ⭐
- Task 2.0.4: Default route handling
- **Deliverable:** Routers actually work

**Days 3-4:** Visual Feedback & Advanced Routing
- Task 2.0.3: Path highlighting
- Task 2.2.1: LLM-as-judge routing
- Task 2.2.2: JSON-field routing (optional)
- **Deliverable:** All routing strategies available

---

### Week 2: Loop Support
**Days 5-6:** Loop Infrastructure
- Task 2.1.1: Cycle detection
- Task 2.1.2: Loop node component
- Task 2.1.5: Loop configuration UI
- **Deliverable:** Loop nodes created

**Days 7-9:** Loop Execution
- Task 2.1.3: Loop execution engine ⭐
- Task 2.1.4: Break condition evaluation
- **Deliverable:** Loops work end-to-end

**Day 10:** Testing & Polish
- Run all test scenarios
- Fix bugs
- Documentation updates

---

## Risk Mitigation

### High-Risk Items

1. **Loop Execution Complexity** (Task 2.1.3)
   - **Risk:** Very complex to implement correctly
   - **Mitigation:** Start with simplest case (single loop), then expand
   - **Fallback:** Limit to simple loops only (no nested loops in v1)

2. **Edge Filtering Performance** (Task 2.0.2)
   - **Risk:** Recalculating levels after each router may be slow
   - **Mitigation:** Profile performance, optimize if needed
   - **Fallback:** Cache level calculations where possible

3. **Infinite Loop Prevention** (Task 2.1.3)
   - **Risk:** Bugs could cause infinite loops, crash browser
   - **Mitigation:** Hard limit (100 iterations), watchdog timer
   - **Fallback:** Emergency stop button in UI

---

## Dependencies

### External Dependencies
- Phase 2A must be complete and tested
- Router nodes already exist (from Phase 2A)
- Route evaluation logic already exists (from Phase 2A)

### Internal Dependencies
- Task 2.0.1 and 2.0.2 must complete before 2.0.3
- Task 2.1.1 must complete before 2.1.3
- All router tasks can be done in parallel with loop tasks

---

## Documentation Deliverables

- [ ] Router execution guide (how to configure routes)
- [ ] Loop usage patterns (common loop scenarios)
- [ ] Advanced routing strategies examples
- [ ] Updated TESTING_GUIDE.md with Phase 2B tests
- [ ] Demo workflows for each feature
- [ ] Troubleshooting guide (common pitfalls)

---

## Phase 2B Completion Checklist

### Router Completion
- [ ] Router execution integration works
- [ ] Edge filtering working correctly
- [ ] Visual path highlighting implemented
- [ ] Default route handling complete
- [ ] LLM-as-judge routing functional
- [ ] JSON-field routing functional
- [ ] All routing tests passing

### Loop Support
- [ ] Cycle detection implemented
- [ ] Loop node component created
- [ ] Loop execution engine working
- [ ] Max iterations enforced
- [ ] Break conditions implemented
- [ ] Loop configuration UI complete
- [ ] All loop tests passing

### Quality Gates
- [ ] TypeScript compiles with no errors
- [ ] All 8 test workflows pass
- [ ] No infinite loops possible
- [ ] Performance acceptable (no lag with 10+ nodes)
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

## Estimated Effort

### Total Time Estimate
- **Router Completion:** 10-14 hours
- **Loop Support:** 12-17 hours
- **Testing & Polish:** 4-6 hours
- **Documentation:** 2-3 hours

**Total:** 28-40 hours (~2-3 weeks at 10-15 hrs/week)

### Critical Path
1. Router execution integration (Days 1-2) ⭐
2. Loop execution engine (Days 7-9) ⭐
3. Testing (Day 10)

Everything else can be done in parallel or deferred if needed.

---

## Next Steps After Phase 2B

With Phase 2B complete, you'll have:
- ✅ Fully functional orchestration system
- ✅ Conditional branching with multiple strategies
- ✅ Iterative workflows with loops
- ✅ All core features of Phase 2

**Options:**
1. **Move to Phase 3** (Tools & Integrations)
2. **Complete Phase 2C** (Polish & visualization)
3. **Move to Phase 4** (Templates & UX)

**Recommendation:** Move to Phase 3 or 4 - core orchestration is done, time to add capabilities or polish UX.
