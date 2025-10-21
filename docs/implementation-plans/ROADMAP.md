# Multi-Agent Workflow Studio - Development Roadmap

This document outlines the phased development plan to transform this prototype into a portfolio-grade project demonstrating advanced AI systems orchestration, multi-model integration, and agentic workflow capabilities.

## Design Goals

This project should demonstrate:
- Working with multiple LLM providers and model APIs
- Building orchestration logic for agentic workflows
- Moving beyond UI to implement realistic interactions where the "happy path" isn't guaranteed
- Creating functional artifacts that work with real models and tools
- Understanding of RAG pipelines and document processing
- Production-ready thinking (evaluation, testing, error handling)

---

## 📋 Detailed Implementation Plans

For detailed, task-by-task implementation guidance, see:

- **[Phase 1: Foundation](phase-1-foundation.md)** - Multi-model providers, documents, streaming (START HERE)
- **[Phase 2: Orchestration](phase-2-orchestration.md)** - Routing, memory, human-in-loop
- **[Phase 3: Tools](phase-3-tools.md)** - Web search, code execution, APIs
- **[Phase 4: Templates & UX](phase-4-templates.md)** - Polished UI, templates, shortcuts
- **[Phase 5: Collaboration](phase-5-collaboration.md)** - Sharing, persistence, real-time
- **[Phase 6: Testing](phase-6-testing.md)** - Test suites, monitoring, validation

**Navigation Guide:** [docs/implementation-plans/README.md](README.md)

---

## Phase 1: Foundation - Multi-Model & Document Support

**Goal:** Establish core infrastructure for real API integration and document processing

**Priority:** HIGH (User-requested core features)

### Features

#### 1.1 Multi-Model Provider System
- **Provider Abstraction Layer**
  - Abstract provider interface (`providers/base.ts`)
  - OpenAI provider (`providers/openai.ts`)
  - Anthropic provider (`providers/anthropic.ts`)
  - Google AI provider (`providers/google.ts`)
  - Ollama provider (local models) (`providers/ollama.ts`)

- **Settings & Configuration**
  - Settings panel/modal for API key management
  - localStorage-based key storage (never committed)
  - Provider status indicators (API key configured, reachable)
  - Default model per provider

- **Agent Node Enhancements**
  - Model selector dropdown per agent (grouped by provider)
  - Provider logo/icon display
  - Mode toggle: Mock vs Live execution
  - Streaming toggle per agent

- **Cost Tracking**
  - Token usage tracking per execution
  - Cost estimation by model (pricing table)
  - Execution summary with total cost

**Success Criteria:**
- Can switch between OpenAI GPT-4, Claude, Gemini without code changes
- API keys stored securely in localStorage
- Real API calls execute successfully in Live mode
- Cost tracking displays accurate estimates

#### 1.2 Document Node Type
- **Document Upload & Storage**
  - New "Document" node type
  - File upload (PDF, TXT, MD, code files)
  - In-memory storage of document content
  - Document preview in properties panel
  - File metadata display (name, size, type)

- **Document Processing**
  - Text extraction from PDFs (pdf-parse or similar)
  - Markdown rendering preview
  - Code syntax highlighting preview
  - Character/word count statistics

- **Document Chunking Node**
  - New "Chunker" node type
  - Chunking strategies:
    - Fixed size (with overlap)
    - Semantic (sentence/paragraph boundaries)
    - Recursive (hierarchical splitting)
  - Chunk size/overlap configuration
  - Preview chunked output

- **Integration with Agents**
  - Pass document content to Agent nodes
  - Document context injection into prompts
  - Truncation handling for long documents

**Success Criteria:**
- Can upload PDF/text documents via drag-and-drop
- Documents display in preview panel
- Can chunk documents with configurable strategies
- Agent nodes receive document content as input

#### 1.3 Streaming Live Execution
- **Real-time Execution UI**
  - Currently executing node highlighted (animated border)
  - Token-by-token streaming in console
  - Progress indicators during execution
  - Execution time per node

- **Execution Controls**
  - Pause/Resume execution
  - Cancel mid-execution
  - Execution state persistence (resume after pause)

- **Error Handling**
  - API error display (rate limits, invalid keys, network errors)
  - Node-level error states (red border/icon)
  - Error recovery options (retry, skip, abort)
  - Helpful error messages with next steps

**Success Criteria:**
- See tokens streaming in real-time from LLM
- Can pause and resume workflow execution
- Errors displayed clearly with recovery options
- Execution state visually tracked on canvas

---

## Phase 2: Advanced Orchestration

**Goal:** Move beyond linear pipelines into dynamic, intelligent workflows

**Priority:** MEDIUM-HIGH (Core orchestration capabilities)

### Features

#### 2.1 Conditional Branching & Routing
- **Router Node Type**
  - Evaluates input and routes to different paths
  - Routing strategies:
    - Keyword matching (if output contains X)
    - Sentiment analysis (positive/negative/neutral)
    - LLM-as-judge (ask model which path to take)
    - JSON field extraction (route based on structured data)

- **Visual Branching**
  - Multiple output handles on Router nodes
  - Edge labels (condition descriptions)
  - Colored paths (green/red/yellow for different routes)
  - Execution path highlighting (show which branch was taken)

- **Loop Support**
  - Allow edges that create loops
  - Max iteration limit per loop
  - Loop counter display
  - Break conditions (exit loop when X)

**Success Criteria:**
- Router node can evaluate output and choose path
- Workflow executes different branches based on conditions
- Loops execute with proper termination
- Visual feedback shows which path was taken

#### 2.2 Memory & Context Management
- **Memory Node Type**
  - Key-value store accessible across workflow
  - Read/write operations from any node
  - Scoped memory (workflow-level vs global)
  - Memory initialization (seed values)

- **Agent Memory Integration**
  - Agents can read from memory before execution
  - Agents can write to memory after execution
  - Memory templates (inject memory values into prompts)
  - Memory history (track changes over time)

- **Visual Indicators**
  - Memory dependency visualization (which nodes share state)
  - Memory inspector panel (view all keys/values)
  - Memory change indicators (highlight modified keys)

**Success Criteria:**
- Agents can read and write to shared memory
- Memory state persists across node executions
- Memory inspector shows current state
- Multiple agents can collaborate via memory

#### 2.3 Human-in-the-Loop Node
- **Human Review Node**
  - Pauses execution at specified points
  - Modal dialog with output preview
  - Approve/Reject/Edit actions
  - Edit mode (modify output before continuing)

- **Audit Trail**
  - Log of all human interventions
  - Timestamp and action taken
  - Before/after comparison
  - Export audit log

- **Approval Workflows**
  - Required vs optional review points
  - Multiple reviewers (parallel approval)
  - Approval timeout (auto-approve after X seconds)

**Success Criteria:**
- Workflow pauses for human input
- User can edit Agent output before continuing
- Audit trail captures all interventions
- Workflow resumes correctly after approval

---

## Phase 3: Tool Integration & Extensibility

**Goal:** Connect workflows to real-world data sources and execution environments

**Priority:** MEDIUM (Essential for practical demos)

### Features

#### 3.1 Web Search Tool
- **Search Integration**
  - Tavily API integration (or SerpAPI as fallback)
  - Search query from upstream nodes
  - Configurable result count
  - Result filtering (domains, date range)

- **Search Result Processing**
  - Structured results (title, URL, snippet)
  - Full page content extraction (optional)
  - Result ranking/relevance scoring
  - Pass results to downstream agents

**Success Criteria:**
- Can perform web searches from workflows
- Results properly formatted for Agent consumption
- Search configuration in properties panel

#### 3.2 Code Execution Tool
- **Sandbox Integration**
  - E2B or Modal sandbox integration
  - Support for Python, JavaScript, TypeScript
  - Timeout and resource limits
  - stdout/stderr capture

- **Code Execution Features**
  - Execute code generated by Agents
  - Return execution results to workflow
  - Error handling (syntax, runtime errors)
  - Package/dependency support

**Success Criteria:**
- Can execute code in isolated sandbox
- Results and errors properly captured
- Supports multiple languages

#### 3.3 Database & API Tools
- **Database Query Tool**
  - Connect to Postgres/Supabase
  - Execute SELECT queries (read-only safety)
  - Result set formatting
  - Query validation

- **HTTP API Tool**
  - Generic HTTP request node
  - Methods: GET, POST, PUT, DELETE
  - Headers and authentication (Bearer, API key)
  - Request/response body formatting
  - OAuth support (future)

**Success Criteria:**
- Can query databases and pass results to agents
- HTTP requests work with auth headers
- Errors handled gracefully

#### 3.4 Custom Tool Builder
- **Inline Function Editor**
  - JavaScript function editor in properties panel
  - Function signature: `async (input: string) => string`
  - Access to utility libraries (fetch, cheerio, etc.)
  - Local execution (no sandbox needed for simple tools)

- **Tool Library**
  - Save custom tools for reuse
  - Import/export tool definitions
  - Community tool registry (future)

**Success Criteria:**
- Can write custom JavaScript tools inline
- Tools execute correctly in workflow
- Tool library allows reuse across workflows

---

## Phase 4: Templates & User Experience

**Goal:** Create polished, demonstrable workflows that showcase capabilities

**Priority:** MEDIUM (Portfolio presentation)

### Features

#### 4.1 Workflow Templates
- **Template Library**
  - Curated, working examples
  - One-click template insertion
  - Template categories (RAG, Multi-Agent, Automation)

- **Included Templates**
  1. **RAG Research Assistant**
     - Document upload → Chunk → Embed → Query → Retrieve → Summarize

  2. **Code Review Pipeline**
     - Code upload → Linting agent → Security agent → Review agent → Human approval

  3. **Multi-Agent Debate**
     - Topic prompt → Advocate agent → Opposition agent → Judge agent → Result

  4. **Content Creation Pipeline**
     - Topic → Research (web search) → Outline agent → Writer → Editor → Final

  5. **Customer Support Router**
     - Query → Intent router → (KB search OR Agent response) → Human review

- **Template Metadata**
  - Description, use case, required API keys
  - Estimated cost per execution
  - Difficulty level
  - Tags for searchability

**Success Criteria:**
- 5+ working templates included
- Templates demonstrate various node types
- One-click template loading works
- Templates are well-documented

#### 4.2 UI/UX Polish
- **Visual Design**
  - Professional color scheme and spacing
  - Smooth animations and transitions
  - Loading states for all async operations
  - Empty states with helpful guidance
  - Responsive design (works on smaller screens)

- **Keyboard Shortcuts**
  - Cmd/Ctrl+Z: Undo
  - Cmd/Ctrl+Y: Redo
  - Cmd/Ctrl+S: Export workflow
  - Delete: Remove selected nodes
  - Space: Pan mode toggle

- **Onboarding**
  - First-run tutorial overlay
  - Tooltips on all UI elements
  - Example workflow on first load
  - Link to documentation

**Success Criteria:**
- UI feels polished and professional
- All interactions have proper feedback
- Keyboard shortcuts work correctly
- New users understand how to start

#### 4.3 Undo/Redo System
- **Command Pattern**
  - All graph mutations wrapped in commands
  - Command history stack
  - Undo/redo navigation

- **Supported Operations**
  - Add/remove nodes
  - Add/remove edges
  - Property changes
  - Position changes (debounced)

- **Version History**
  - Timeline view of changes
  - Change descriptions
  - Ability to jump to any version

**Success Criteria:**
- Cmd+Z undoes last action
- Can redo undone actions
- History persists during session
- All major operations are undoable

---

## Phase 5: Collaboration & Sharing

**Goal:** Enable sharing and collaboration on workflows

**Priority:** LOW-MEDIUM (Portfolio enhancement)

### Features

#### 5.1 Workflow Persistence
- **Backend Storage**
  - Supabase or Firebase integration
  - Save workflows to cloud
  - Load workflows by ID
  - Auto-save (debounced)

- **Workflow Management**
  - My Workflows list
  - Rename, delete workflows
  - Last modified timestamps
  - Workflow thumbnails (canvas screenshot)

**Success Criteria:**
- Workflows persist across sessions
- Can share workflow URL with others
- Workflow list shows all saved flows

#### 5.2 Public Gallery
- **Community Workflows**
  - Mark workflow as public/private
  - Gallery view of public workflows
  - Search and filter (tags, popularity)
  - Fork/remix workflows

- **Social Features**
  - Like/bookmark workflows
  - Usage counter (how many times forked)
  - Creator attribution

**Success Criteria:**
- Public workflows discoverable in gallery
- Can fork others' workflows
- Usage analytics visible

#### 5.3 Real-time Collaboration (Stretch)
- **Multiplayer Editing**
  - Live cursors (Liveblocks/PartyKit)
  - Presence indicators (who's viewing)
  - Collaborative editing (CRDT-based)
  - Chat or comments

**Success Criteria:**
- Multiple users can view same workflow
- See others' cursors in real-time
- No conflicts during concurrent edits

---

## Phase 6: Testing & Production Readiness

**Goal:** Build evaluation and testing capabilities for reliable workflows

**Priority:** MEDIUM (Demonstrates production thinking)

### Features

#### 6.1 Test Suite System
- **Test Definition**
  - Create test cases with input/expected output
  - Multiple test cases per workflow
  - Test case management UI

- **Execution**
  - Run all tests button
  - Parallel test execution
  - Test results dashboard (pass/fail counts)
  - Diff view (expected vs actual)

- **LLM-as-Judge Evaluation**
  - Define evaluation criteria
  - Use LLM to grade outputs
  - Scoring rubrics (1-10 scale)
  - Explanation of scores

**Success Criteria:**
- Can define test cases for workflows
- Tests run and show pass/fail results
- LLM evaluation provides scores and reasoning

#### 6.2 Performance Monitoring
- **Metrics Collection**
  - Execution time per node
  - Total workflow latency
  - Token usage and cost
  - API call success/failure rates

- **Dashboard**
  - Historical metrics (line charts)
  - Execution history log
  - Cost trends over time
  - Slowest nodes highlighted

**Success Criteria:**
- Metrics collected for every execution
- Dashboard shows performance trends
- Can identify bottlenecks

#### 6.3 Type Safety & Validation
- **Schema Validation**
  - Zod schemas for all node types
  - Runtime validation on node creation
  - Edge validation (type compatibility)
  - Connection rules (prevent invalid graphs)

- **Type Inference**
  - Nodes declare input/output types
  - Type mismatch warnings on edges
  - Auto-conversion suggestions

**Success Criteria:**
- Invalid nodes cannot be created
- Incompatible connections prevented
- Type errors surfaced before execution

---

## Implementation Strategy

### Phase Priority
1. **Phase 1** (Must-have): Foundation for all other work
2. **Phase 4** (High value): Templates make project demonstrable
3. **Phase 2** (Differentiation): Shows advanced orchestration skills
4. **Phase 3** (Practical): Proves real-world applicability
5. **Phase 6** (Polish): Shows production-readiness thinking
6. **Phase 5** (Nice-to-have): Enhances portfolio but not critical

### Technical Approach
- Start each phase with architecture design document
- Build incrementally (one feature at a time)
- Test each feature before moving to next
- Update CLAUDE.md after each phase
- Create git branches per phase
- Tag releases after each phase completion

### Portfolio Presentation
After Phase 1, 2, and 4 are complete, you'll have:
- ✅ Multi-model orchestration (OpenAI, Anthropic, Google, Ollama)
- ✅ Document processing and RAG pipelines
- ✅ Advanced workflow features (branching, memory, human-in-loop)
- ✅ 5+ polished demo templates
- ✅ Real API integration with streaming execution
- ✅ Professional UI with proper error handling

This combination directly demonstrates the Design Technologist AI Systems role requirements.

---

## Next Steps

1. Review and refine this roadmap
2. Create detailed implementation plan for Phase 1
3. Set up project board (GitHub Projects or similar)
4. Begin Phase 1.1: Multi-Model Provider System

---

## Notes & Decisions

### Technology Decisions Needed
- [ ] Backend choice: Supabase vs Firebase vs Vercel Postgres (Phase 5)
- [ ] Vector DB: Pinecone vs Supabase pgvector vs Chroma (Phase 1.2)
- [ ] Code sandbox: E2B vs Modal vs WebContainers (Phase 3.2)
- [ ] Collaboration: Liveblocks vs PartyKit vs custom (Phase 5.3)

### Open Questions
- Should we support embedding models in Phase 1.2? (OpenAI, Cohere, local)
- Do we need persistent storage before Phase 5? (localStorage as interim)
- Should templates be code or JSON-based?
- How to handle API key rotation/expiration?

### Future Considerations
- VS Code extension integration
- CLI for running workflows headless
- Workflow debugging tools (breakpoints, step-through)
- Workflow analytics (A/B testing different prompts)
- Workflow versioning (git-like branches)
