# Sample Workflows Guide

**Multi-Agent Workflow Studio - Demo & Tutorial Workflows**

This guide documents all available sample workflows and planned demos for showcasing the application's features.

---

## Available Samples

These samples are currently implemented and accessible via the "Sample" dropdown in the header toolbar.

### 1. Document Summarizer
**Location:** `lib/addSample.ts:addDocumentSummarizer()`
**Complexity:** Beginner
**Features Demonstrated:**
- Document upload (PDF)
- PDF text extraction
- Live agent execution with streaming
- Simple linear workflow

**Workflow:**
```
Document Node → Agent (Summarizer) → Result
```

**How to Use:**
1. Click "Sample" → "Document Summarizer"
2. Click the Document node to open properties
3. Upload a PDF file
4. Click "Run Workflow"
5. Watch the agent summarize in real-time

**What It Shows:**
- Basic document processing
- LLM integration (OpenAI GPT-4o-mini)
- Real-time streaming output
- End-to-end workflow execution

---

### 2. RAG Pipeline
**Location:** `lib/addSample.ts:addRAGPipeline()`
**Complexity:** Intermediate
**Features Demonstrated:**
- Document upload (text files)
- Document chunking with semantic strategy
- Context-aware analysis
- Multi-step processing

**Workflow:**
```
Document Node → Chunker (Semantic) → Agent (Analyzer) → Result
```

**How to Use:**
1. Click "Sample" → "RAG Pipeline"
2. Upload a long text document (article, paper, etc.)
3. Configure chunker (500 char chunks, 50 char overlap)
4. Run workflow to see chunked analysis

**What It Shows:**
- Document chunking strategies
- Semantic splitting for better context
- Processing large documents in chunks
- RAG (Retrieval-Augmented Generation) pattern

---

### 3. Multi-Agent Analysis
**Location:** `lib/addSample.ts:addMultiAgentAnalysis()`
**Complexity:** Advanced
**Features Demonstrated:**
- **Parallel execution** (Phase 2A)
- Multi-agent collaboration
- Agent specialization (different temperatures)
- Result synthesis

**Workflow:**
```
                    ┌→ Agent (Extractor) ─┐
Document Node ──────┤                      ├→ Agent (Synthesizer) → Result
                    └→ Agent (Contextualizer) ─┘
```

**How to Use:**
1. Click "Sample" → "Multi-Agent Analysis"
2. Upload a document (PDF or text)
3. Run workflow
4. Watch two agents work in parallel, then synthesizer combines results

**What It Shows:**
- Phase 2A parallel execution
- Agents with different roles and parameters
- Topological sorting and level-based execution
- How multiple agents collaborate

**Performance Note:**
- Extractor and Contextualizer run simultaneously (faster than sequential)
- Execution log shows parallel execution grouping

---

## Planned Samples

These samples are designed but not yet implemented. They demonstrate Phase 2 orchestration features.

### 4. Content Moderation Router ✅
**Status:** Implemented
**Location:** `lib/addSample.ts:addContentModerationRouter()`
**Priority:** High
**Complexity:** Intermediate
**Features to Demonstrate:**
- **Router node** (keyword + sentiment routing)
- Conditional branching
- Path highlighting
- Different execution paths

**Proposed Workflow:**
```
Prompt (User Input) → Agent (Moderator) → Router (Keyword: toxic/offensive/spam) →
  ├─ Route: toxic → Agent (Filter) → Result (Blocked)
  ├─ Route: offensive → Agent (Warning) → Result (Flagged)
  └─ Route: safe (default) → Agent (Responder) → Result (Published)
```

**How It Would Work:**
1. Load sample, enter user message in Prompt node
2. Moderator agent analyzes the content
3. Router checks output for toxic keywords
4. Workflow branches based on classification
5. Only the active path is highlighted and executed

**Demo Value:**
- Shows how routers control execution flow
- Demonstrates conditional logic
- Perfect for content moderation use cases
- Visual path highlighting makes branching clear

---

### 5. Research Loop with Quality Check ✅
**Status:** Implemented
**Location:** `lib/addSample.ts:addResearchLoop()`
**Priority:** High
**Complexity:** Advanced
**Features to Demonstrate:**
- **Loop node** with iteration control
- **LLM-judge break condition**
- Iterative refinement
- Dynamic execution flow

**Proposed Workflow:**
```
Prompt (Research Topic) → Loop (Max 5 iterations, LLM-judge break) →
  Agent (Researcher) → Agent (Quality Checker) →
    ├─ Continue: "needs more depth" → Loop back to Researcher
    └─ Exit: "sufficient quality" → Result
```

**Loop Configuration:**
- Max iterations: 5
- Break condition: LLM-judge
- Judge prompt: "Is this research comprehensive and well-sourced? Answer BREAK if yes, CONTINUE if it needs more work."

**How It Would Work:**
1. Enter research topic in Prompt
2. Loop starts iteration 1
3. Researcher agent gathers information
4. Quality Checker evaluates depth
5. LLM decides: continue researching or break
6. Repeats until quality threshold met or max iterations reached

**Demo Value:**
- Shows iterative workflows
- Demonstrates LLM-as-judge pattern
- Illustrates loop exit conditions
- Real-world research/refinement use case

---

### 6. Stateful Chatbot with Memory ✅
**Status:** Implemented
**Location:** `lib/addSample.ts:addStatefulChatbot()`
**Priority:** High
**Complexity:** Intermediate
**Features to Demonstrate:**
- **Memory nodes** (read/write)
- **Memory inspector** panel
- Context persistence across turns
- Stateful conversations

**Proposed Workflow:**
```
Turn 1: Prompt (User) → Memory (Read: conversation_history) → Agent (Chat) → Memory (Write) + Result
Turn 2: (Re-run with new prompt, memory persists)
Turn 3: (Context builds up)
```

**Memory Structure:**
```json
{
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "user_preferences": {},
  "session_context": {}
}
```

**How It Would Work:**
1. Run workflow with first user message
2. Agent reads empty memory, generates response
3. Response written to memory
4. Edit Prompt with second message, re-run
5. Agent now has conversation context
6. Open Memory Inspector to see state

**Demo Value:**
- Shows memory system in action
- Memory inspector visualization
- Real-time memory updates
- Stateful multi-turn conversations

---

### 7. Approval Workflow with Human Review 🚧
**Priority:** Medium
**Complexity:** Intermediate
**Features to Demonstrate:**
- **Human-in-the-loop** review node
- **Multi-reviewer workflows** (Phase 2C)
- Approval rules (1-of-N, all-required, M-of-N)
- **Audit trail** logging

**Proposed Workflow:**
```
Prompt (Content Request) → Agent (Draft Generator) → Human Review →
  ├─ Approved → Agent (Publisher) → Result (Published)
  ├─ Rejected → Agent (Reviser) → Loop back to Review
  └─ Edited → Agent (Publisher) → Result (Published with edits)
```

**Multi-Reviewer Configuration:**
```
Reviewers: ["Legal", "Marketing", "Technical"]
Approval Rule: 2-of-3 (any 2 must approve)
Timeout: 300 seconds
Auto-proceed: On timeout, use default
```

**How It Would Work:**
1. Draft agent generates content
2. Workflow pauses at review node
3. Human reviewer(s) see modal with draft
4. Options: Approve, Reject, Edit
5. If approved → publish
6. If rejected → revision loop
7. Audit trail records all decisions

**Demo Value:**
- Shows human-AI collaboration
- Enterprise approval workflows
- Multi-reviewer consensus
- Audit trail for compliance

---

### 8. Smart Query Router (LLM-Judge) 🚧
**Priority:** Medium
**Complexity:** Advanced
**Features to Demonstrate:**
- **LLM-judge routing** (Phase 2B)
- **JSON-field routing** (Phase 2B)
- Multi-path routing
- Specialized agents

**Proposed Workflow:**
```
Prompt (User Query) → Agent (Classifier) → Router (LLM-judge) →
  ├─ Route: technical → Agent (Tech Expert) → Result
  ├─ Route: creative → Agent (Creative Writer) → Result
  ├─ Route: analytical → Agent (Data Analyst) → Result
  └─ Route: default → Agent (Generalist) → Result
```

**Router Configuration:**
- Strategy: LLM-judge
- Judge prompt: "Classify this query as: technical, creative, analytical, or general. Output JSON: {\"category\": \"...\"}"
- Routes defined for each category

**JSON-Field Routing Alternative:**
- Classifier outputs: `{"category": "technical", "confidence": 0.95}`
- Router reads: `output.category`
- Routes based on field value

**How It Would Work:**
1. User enters query in Prompt
2. Classifier agent analyzes query type
3. LLM-judge router evaluates classification
4. Workflow routes to appropriate specialist agent
5. Only selected path executes and highlights

**Demo Value:**
- Advanced routing strategies
- LLM-as-judge in action
- Agent specialization
- Complex decision trees

---

### 9. Iterative Code Review Loop 🚧
**Priority:** Low
**Complexity:** Advanced
**Features to Demonstrate:**
- **Loop with keyword break condition**
- Code analysis workflows
- Multi-iteration refinement
- Break conditions

**Proposed Workflow:**
```
Document (Code File) → Loop (Max 3, Break on "LGTM") →
  Agent (Code Reviewer) → Agent (Fixer) →
    ├─ Continue: Issues found → Loop back
    └─ Exit: "LGTM" in output → Result (Approved Code)
```

**Loop Configuration:**
- Max iterations: 3
- Break condition: Keyword
- Keywords: ["LGTM", "approved", "no issues"]

**How It Would Work:**
1. Upload code file
2. Reviewer agent checks for issues
3. If issues found, Fixer agent suggests improvements
4. Loop continues until "LGTM" or max iterations
5. Final result shows approved code

**Demo Value:**
- Keyword-based loop breaking
- Code review automation
- Iterative improvement pattern
- Real-world development workflow

---

### 10. Global Memory Cross-Workflow 🚧
**Priority:** Low
**Complexity:** Advanced
**Features to Demonstrate:**
- **Global memory scope** (Phase 2C)
- Memory persistence across workflows
- Session-based state
- Memory visualization

**Proposed Workflow:**
```
Workflow 1: Prompt → Agent (Profile Builder) → Memory (Write, scope: global) → Result
Workflow 2: Prompt → Memory (Read, scope: global) → Agent (Personalized Response) → Result
```

**Memory Scope:**
- Global memory persists across workflow runs
- Clear global memory only via Memory Inspector
- Workflow memory clears on each run

**How It Would Work:**
1. Run Workflow 1 to build user profile (stored globally)
2. Clear nodes, create Workflow 2
3. Workflow 2 reads global memory
4. Agent uses persisted profile for personalization
5. Memory Inspector shows global vs workflow scope

**Demo Value:**
- Global memory persistence
- Cross-workflow state sharing
- Session-based applications
- Memory scope differentiation

---

## Sample Implementation Status

| Sample | Status | Phase | Priority | Complexity |
|--------|--------|-------|----------|------------|
| 1. Document Summarizer | ✅ Implemented | Phase 1 | - | Beginner |
| 2. RAG Pipeline | ✅ Implemented | Phase 1 | - | Intermediate |
| 3. Multi-Agent Analysis | ✅ Implemented | Phase 2A | - | Advanced |
| 4. Content Moderation Router | ✅ Implemented | Phase 2B | High | Intermediate |
| 5. Research Loop | ✅ Implemented | Phase 2B | High | Advanced |
| 6. Stateful Chatbot | ✅ Implemented | Phase 2A | High | Intermediate |
| 7. Approval Workflow | 🚧 Planned | Phase 2A/C | Medium | Intermediate |
| 8. Smart Query Router | 🚧 Planned | Phase 2B | Medium | Advanced |
| 9. Code Review Loop | 🚧 Planned | Phase 2B | Low | Advanced |
| 10. Global Memory Demo | 🚧 Planned | Phase 2C | Low | Advanced |

---

## Feature Coverage Matrix

| Feature | Samples Demonstrating It |
|---------|--------------------------|
| **Phase 1** |
| Document upload | #1, #2, #3 ✅ |
| PDF extraction | #1, #3 ✅ |
| Document chunking | #2 ✅ |
| Agent execution | #1, #2, #3 ✅ |
| Streaming output | #1, #2, #3 ✅ |
| Linear workflows | #1, #2 ✅ |
| **Phase 2A** |
| Parallel execution | #3 ✅ |
| Router nodes (basic) | #4 ✅, #8 🚧 |
| Memory system | #6 ✅, #10 🚧 |
| Human review | #7 🚧 |
| **Phase 2B** |
| Router execution | #4 ✅, #8 🚧 |
| Loop nodes | #5 ✅, #9 🚧 |
| LLM-judge routing | #8 🚧 |
| JSON-field routing | #8 🚧 |
| Keyword break conditions | #9 🚧 |
| LLM-judge break conditions | #5 ✅ |
| Path highlighting | #4 ✅, #8 🚧 |
| **Phase 2C** |
| Memory inspector | #6 ✅, #10 🚧 |
| Audit trail | #7 🚧 |
| Multi-reviewer | #7 🚧 |
| Global memory | #10 🚧 |
| Memory visualization | #6 ✅, #10 🚧 |

---

## Recommended Demo Sequence

For demonstrating the application to new users, follow this sequence:

### 1. Basic Features (5 minutes)
- **Sample #1**: Document Summarizer
  - Shows basic workflow execution
  - Demonstrates live LLM integration
  - Easy to understand

### 2. Intermediate Features (10 minutes)
- **Sample #2**: RAG Pipeline
  - Shows document chunking
  - Multi-step processing
  - More complex workflow

### 3. Advanced Orchestration (15 minutes)
- **Sample #3**: Multi-Agent Analysis
  - Shows parallel execution (Phase 2A)
  - Multiple agents collaborating
  - Visual execution levels

### 4. Phase 2B Features (20 minutes) 🚧
- **Sample #4**: Content Moderation Router
  - Conditional branching
  - Path highlighting
  - Real-world use case
- **Sample #5**: Research Loop
  - Iterative workflows
  - LLM-judge break conditions
  - Quality refinement

### 5. Phase 2A/C Features (15 minutes) 🚧
- **Sample #6**: Stateful Chatbot
  - Memory system
  - Memory inspector
  - Context persistence
- **Sample #7**: Approval Workflow
  - Human-in-the-loop
  - Audit trail
  - Enterprise workflows

---

## Creating Your Own Workflows

After exploring the samples, users can create custom workflows:

1. **Drag & Drop**: Use palette to add nodes
2. **Connect**: Draw edges between nodes
3. **Configure**: Click nodes to edit properties
4. **Run**: Execute workflow and watch logs
5. **Iterate**: Adjust based on results

**Tips for Beginners:**
- Start with linear workflows (A → B → C)
- Add routers for conditional logic
- Use loops for iterative tasks
- Add memory for stateful workflows
- Use human review for approval gates

---

## Implementation Priority

For implementing the planned samples:

**High Priority (Implement First):**
1. Content Moderation Router (#4) - Shows router execution
2. Research Loop (#5) - Shows loop functionality
3. Stateful Chatbot (#6) - Shows memory system

**Medium Priority (Implement Next):**
4. Approval Workflow (#7) - Shows human-in-the-loop + audit
5. Smart Query Router (#8) - Shows LLM-judge + JSON routing

**Low Priority (Nice to Have):**
6. Code Review Loop (#9) - Additional loop example
7. Global Memory Demo (#10) - Advanced memory features

---

## Next Steps

To implement the planned samples:

1. **Create sample functions** in `lib/addSample.ts` (like existing ones)
2. **Update header dropdown** in `app/page.tsx` to include new samples
3. **Test each sample** to ensure it works as documented
4. **Create tutorial videos** (optional) showing each sample in action
5. **Update this document** as samples are implemented

---

## Notes for Developers

### Adding a New Sample

1. **Define the function** in `lib/addSample.ts`:
   ```typescript
   export function addYourSample(
     setNodes: (nodes: TypedNode[]) => void,
     setEdges: (edges: Edge[]) => void,
   ) {
     // Create nodes with crypto.randomUUID() for IDs
     // Create edges with markerEnd: { type: MarkerType.ArrowClosed }
     // Call setNodes([...]) and setEdges([...])
   }
   ```

2. **Import in header** (`components/header.tsx`):
   ```typescript
   import { addYourSample } from "@/lib/addSample";
   ```

3. **Add to dropdown menu** (in header):
   ```tsx
   <DropdownMenuItem onClick={() => addYourSample(setNodes, setEdges)}>
     Your Sample Name
   </DropdownMenuItem>
   ```

4. **Test thoroughly**:
   - Does it load correctly?
   - Do all connections work?
   - Does execution flow as expected?
   - Are node positions reasonable?

5. **Document it** in this file under "Available Samples"

### Sample Design Best Practices

- **Clear node names**: "Moderator Agent", not "Agent1"
- **Good spacing**: 250-350px between nodes horizontally
- **Logical layout**: Left-to-right flow, top-to-bottom for branches
- **Realistic prompts**: Show practical use cases
- **Appropriate models**: Use fast/cheap models for samples (gpt-4o-mini)
- **Useful results**: Output should demonstrate value

---

**Last Updated:** 2026-01-22
**Phase Status:** Phase 2 (A+B+C) Complete ✅
**Total Samples:** 6 implemented, 4 planned

**Recent Updates:**
- ✅ Added Content Moderation Router (demonstrates router execution + path highlighting)
- ✅ Added Research Loop (demonstrates loop nodes + LLM-judge break conditions)
- ✅ Added Stateful Chatbot (demonstrates memory system + memory inspector)
- ✅ Implemented router execution in lib/run.ts (routers now actually work!)
- ✅ Implemented loop execution in lib/run.ts (loops now actually iterate!)
- ✅ Added complete audit logging (all 4 event types)

**Audit Trail Status:**
- ✅ Human-review events logged
- ✅ Memory-write events logged
- ✅ Router-decision events logged ← **NOW WORKING**
- ✅ Loop iteration events logged ← **NOW WORKING**
