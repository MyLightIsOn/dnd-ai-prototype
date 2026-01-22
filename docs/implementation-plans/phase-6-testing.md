# Phase 6 Implementation Plan: Testing & Production Readiness

**Status:** Planned
**Priority:** MEDIUM (Demonstrates production thinking)
**Dependencies:** Phase 1-3 (Core features)
**Estimated Duration:** 1-2 weeks

---

## Overview

Phase 6 builds evaluation, testing, and monitoring capabilities. This demonstrates production-ready thinking and reliability engineering.

---

## 6.1 Test Suite System

### Architecture

```typescript
// types/testing.ts
export interface TestCase {
  id: string;
  name: string;
  description?: string;
  inputs: Record<string, string>; // nodeId → input value
  expectedOutputs?: Record<string, string>; // nodeId → expected output
  evaluationCriteria?: EvaluationCriteria[];
}

export interface TestSuite {
  id: string;
  workflowId: string;
  name: string;
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutputs: Record<string, string>;
  expectedOutputs: Record<string, string>;
  score?: number; // 0-100 from LLM evaluation
  feedback?: string; // LLM explanation
  executionTime: number;
  cost: number;
  error?: string;
  timestamp: string;
}

export interface TestRun {
  id: string;
  testSuiteId: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    totalTime: number;
    totalCost: number;
  };
  timestamp: string;
}

export interface EvaluationCriteria {
  type: 'exact-match' | 'contains' | 'regex' | 'llm-judge';
  config: any;
}
```

### Tasks

#### Task 6.1.1: Test Case Management UI
- [ ] Test suite creation modal
- [ ] Add/edit/delete test cases
- [ ] Input value editor per node
- [ ] Expected output editor
- [ ] Test case library/storage

**UI Mockup:**
```
┌───────────────────────────────────────┐
│ Test Suite: RAG Assistant Tests       │
├───────────────────────────────────────┤
│ [+ Add Test Case]                     │
├───────────────────────────────────────┤
│ ✓ Test 1: Simple Question            │
│   Input: "What is RAG?"               │
│   Expected: Contains "retrieval"      │
│   [Edit] [Delete] [Run]               │
├───────────────────────────────────────┤
│ ✗ Test 2: Complex Query               │
│   Input: "Explain vector databases"   │
│   Expected: > 100 words               │
│   Last run: Failed (too short)        │
│   [Edit] [Delete] [Run]               │
├───────────────────────────────────────┤
│ ⏹ Test 3: Edge Case                   │
│   Input: ""                           │
│   Expected: Error message             │
│   [Edit] [Delete] [Run]               │
├───────────────────────────────────────┤
│ [Run All Tests] [Export Results]      │
└───────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/testing/test-suite-editor.tsx`

---

#### Task 6.1.2: Test Execution Engine
- [ ] Run workflow with test inputs
- [ ] Capture all outputs
- [ ] Compare with expected outputs
- [ ] Generate test result
- [ ] Parallel test execution (optional)

**Complexity:** Medium
**Files:** `lib/testing/test-runner.ts`

---

#### Task 6.1.3: Evaluation Strategies

##### Exact Match
```typescript
function exactMatch(actual: string, expected: string): boolean {
  return actual.trim() === expected.trim();
}
```

##### Contains
```typescript
function contains(actual: string, keywords: string[]): boolean {
  return keywords.every(kw => actual.toLowerCase().includes(kw.toLowerCase()));
}
```

##### Regex
```typescript
function regexMatch(actual: string, pattern: string): boolean {
  return new RegExp(pattern).test(actual);
}
```

##### LLM-as-Judge
```typescript
async function llmJudge(
  actual: string,
  criteria: string,
  provider: ModelProvider
): Promise<{ passed: boolean; score: number; feedback: string }> {
  const prompt = `
    Evaluate this output against the criteria.

    Output: ${actual}

    Criteria: ${criteria}

    Score from 0-100 and explain your reasoning.
  `;

  const response = await provider.complete({ prompt, ... });
  // Parse response to extract score and feedback
  return parseJudgmentResponse(response.content);
}
```

**Complexity:** Medium
**Files:** `lib/testing/evaluators.ts`

---

#### Task 6.1.4: Test Results Dashboard
- [ ] Test run history
- [ ] Pass/fail summary
- [ ] Detailed results per test case
- [ ] Diff view (expected vs actual)
- [ ] Cost/time metrics

**Dashboard Mockup:**
```
┌────────────────────────────────────────────┐
│ Test Run Results                           │
│ Run at: 2025-01-16 10:30 AM                │
├────────────────────────────────────────────┤
│ Summary                                    │
│ ✓ Passed: 15 | ✗ Failed: 3 | Total: 18     │
│ Time: 45.2s | Cost: $0.23                  │
├────────────────────────────────────────────┤
│ Test Results                               │
├────────────────────────────────────────────┤
│ ✓ Simple Question           Score: 95/100  │
│ ✓ Complex Query             Score: 88/100  │
│ ✗ Edge Case                 Score: 45/100  │
│   Expected: Error message                  │
│   Actual: (empty string)                   │
│   [View Details]                           │
├────────────────────────────────────────────┤
│ [Export CSV] [Run Again]                   │
└────────────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/testing/results-dashboard.tsx`

---

#### Task 6.1.5: Test Storage
- [ ] Save test suites to DB (if Phase 5 done) or localStorage
- [ ] Save test run history
- [ ] Export test results as JSON/CSV
- [ ] Import test cases from file

**Complexity:** Low
**Files:** `lib/testing/storage.ts`

---

## 6.2 Performance Monitoring

### Architecture

```typescript
// types/metrics.ts
export interface ExecutionMetrics {
  workflowId: string;
  runId: string;
  nodeMetrics: NodeMetric[];
  totalTime: number;
  totalCost: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface NodeMetric {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokenUsage?: TokenUsage;
  cost?: number;
  success: boolean;
  error?: string;
}
```

### Tasks

#### Task 6.2.1: Metrics Collection
- [ ] Instrument execution engine with timing
- [ ] Track token usage per node
- [ ] Calculate cost per node
- [ ] Capture errors with stack traces
- [ ] Store metrics in memory/DB

**Complexity:** Low
**Files:** `lib/execution/metrics.ts`

---

#### Task 6.2.2: Metrics Dashboard
- [ ] Execution history list
- [ ] Timeline visualization
- [ ] Node-level metrics
- [ ] Bottleneck identification
- [ ] Cost breakdown chart

**Dashboard Mockup:**
```
┌────────────────────────────────────────────┐
│ Performance Metrics                        │
├────────────────────────────────────────────┤
│ Recent Executions                          │
│ ┌────────────────────────────────────────┐ │
│ │ Run #42 - 2 min ago                    │ │
│ │ ⏱ 12.3s | 💰 $0.045 | ✓ Success        │ │
│ │ [View Details]                         │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │ Run #41 - 5 min ago                    │ │
│ │ ⏱ 8.7s  | 💰 $0.032 | ✓ Success        │ │
│ │ [View Details]                         │ │
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ Slowest Nodes (Avg)                        │
│ 1. Writer Agent      - 5.2s                │
│ 2. Web Search        - 3.8s                │
│ 3. Research Agent    - 2.1s                │
├────────────────────────────────────────────┤
│ Cost by Node Type                          │
│ Agents: $0.98 (78%)                        │
│ Tools:  $0.15 (12%)                        │
│ Other:  $0.12 (10%)                        │
└────────────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/metrics/dashboard.tsx`

---

#### Task 6.2.3: Execution Timeline Visualization
- [ ] Gantt chart of node executions
- [ ] Waterfall view
- [ ] Identify parallel vs sequential sections
- [ ] Highlight critical path

**Complexity:** High (visualization library needed)
**Libraries:** Recharts, Visx, or D3.js

**Files:** `components/metrics/timeline-chart.tsx`

---

#### Task 6.2.4: Historical Trends
- [ ] Store metrics over time
- [ ] Line charts (cost/time trends)
- [ ] Detect regressions (execution time increased)
- [ ] Cost forecasting

**Complexity:** Medium
**Files:** `components/metrics/trends.tsx`

---

## 6.3 Type Safety & Validation

### Tasks

#### Task 6.3.1: Zod Schema Validation
- [ ] Define Zod schemas for all node types
- [ ] Validate on node creation
- [ ] Validate on property changes
- [ ] Runtime validation of workflow JSON

**Example:**
```typescript
import { z } from 'zod';

const AgentDataSchema = z.object({
  name: z.string().min(1),
  model: z.string().regex(/^[a-z-]+\/[a-z0-9-]+$/),
  prompt: z.string().min(1),
  mode: z.enum(['mock', 'live']),
  streaming: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

// Usage
function createAgentNode(data: unknown): AgentData {
  return AgentDataSchema.parse(data); // Throws if invalid
}
```

**Complexity:** Low
**Files:** `types/schemas.ts`

---

#### Task 6.3.2: Edge Type Validation
- [ ] Define input/output types for each node type
- [ ] Validate edge connections (type compatibility)
- [ ] Show warning for incompatible connections
- [ ] Suggest type converters

**Type System:**
```typescript
export type NodeIOType = 'text' | 'json' | 'document' | 'chunks' | 'any';

export const nodeTypeRegistry = {
  agent: { inputs: ['text', 'document'], outputs: ['text'] },
  tool: { inputs: ['text', 'json'], outputs: ['json', 'text'] },
  document: { inputs: [], outputs: ['document'] },
  chunker: { inputs: ['document'], outputs: ['chunks'] },
  result: { inputs: ['text', 'json'], outputs: [] },
};

function canConnect(sourceType: string, targetType: string): boolean {
  const sourceOutputs = nodeTypeRegistry[sourceType].outputs;
  const targetInputs = nodeTypeRegistry[targetType].inputs;

  return sourceOutputs.some(o =>
    targetInputs.includes(o) || targetInputs.includes('any')
  );
}
```

**Complexity:** Medium
**Files:** `lib/validation/edge-types.ts`

---

#### Task 6.3.3: Connection Rules
- [ ] Prevent invalid connections in UI
- [ ] Visual feedback (red highlight on invalid drop)
- [ ] Error message explaining why connection is invalid
- [ ] Suggest valid connections

**Complexity:** Medium
**Files:** `components/viewport/connection-validator.tsx`

---

#### Task 6.3.4: Pre-Execution Validation
- [ ] Validate entire workflow before running
- [ ] Check for missing configurations
- [ ] Check for missing API keys
- [ ] Check for isolated nodes (no path to result)
- [ ] Show validation errors in UI

**Validation Checks:**
```typescript
interface ValidationError {
  nodeId: string;
  severity: 'error' | 'warning';
  message: string;
}

function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for nodes with missing required fields
  nodes.forEach(node => {
    if (node.type === 'agent') {
      const data = node.data as AgentData;
      if (!data.prompt) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: 'Agent prompt is required',
        });
      }
      if (data.mode === 'live' && !data.model) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: 'Model must be selected for live mode',
        });
      }
    }
  });

  // Check for isolated nodes
  const connected = new Set<string>();
  edges.forEach(e => {
    connected.add(e.source);
    connected.add(e.target);
  });
  nodes.forEach(node => {
    if (!connected.has(node.id)) {
      errors.push({
        nodeId: node.id,
        severity: 'warning',
        message: 'Node is not connected to workflow',
      });
    }
  });

  return errors;
}
```

**Complexity:** Medium
**Files:** `lib/validation/workflow-validator.ts`

---

## Testing Strategy

### Test Suite Testing
- [ ] Create test suite with multiple cases
- [ ] Run tests and verify results
- [ ] LLM evaluation accuracy
- [ ] Parallel execution (if implemented)

### Metrics Testing
- [ ] Metrics collected accurately
- [ ] Timeline visualization renders correctly
- [ ] Cost calculation matches actual
- [ ] Trends chart displays data

### Validation Testing
- [ ] Schema validation catches invalid data
- [ ] Edge type validation prevents bad connections
- [ ] Workflow validation identifies issues
- [ ] Error messages are helpful

---

## Success Criteria

### Demo Scenario 1: Test-Driven Workflow
1. Create workflow
2. Write 5 test cases
3. Run tests
4. See 3 pass, 2 fail
5. Fix workflow based on failures
6. Re-run tests
7. All pass

### Demo Scenario 2: Performance Optimization
1. Run workflow
2. Check metrics dashboard
3. Identify slowest node (8s)
4. Optimize configuration
5. Re-run and verify improvement (3s)
6. See cost reduction

### Demo Scenario 3: Type Safety
1. Try to connect Document → Agent
2. See green indicator (valid)
3. Try to connect Agent → Chunker
4. See red indicator (invalid)
5. Error message explains incompatibility

---

## Documentation

- [ ] Test suite creation guide
- [ ] LLM evaluation best practices
- [ ] Performance monitoring guide
- [ ] Optimization tips
- [ ] Type system reference
- [ ] Validation rules documentation

---

## Future Enhancements

### Advanced Testing
- [ ] A/B testing (compare two workflow versions)
- [ ] Regression testing (alert on performance degradation)
- [ ] Load testing (stress test with many inputs)
- [ ] Fuzzing (random input generation)

### Advanced Monitoring
- [ ] Real-time monitoring dashboard
- [ ] Alerts (Slack/email on errors)
- [ ] Logging (persistent execution logs)
- [ ] Tracing (distributed tracing for complex workflows)

### Advanced Validation
- [ ] Type inference (auto-detect node output types)
- [ ] Auto-conversion (insert converter nodes)
- [ ] Workflow linting (style guide enforcement)
- [ ] Accessibility checks (ensure workflows are maintainable)
