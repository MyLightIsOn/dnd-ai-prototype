# Phase 4 Implementation Plan: Templates & User Experience

**Status:** Planned
**Priority:** MEDIUM (High portfolio value)
**Dependencies:** Phase 1, Phase 2 (some features), Phase 3 (some tools)
**Estimated Duration:** 1-2 weeks

---

## Overview

Phase 4 creates polished, demonstrable workflows and enhances overall UX. This is critical for portfolio presentation and user adoption.

---

## 4.1 Workflow Templates

### Template Structure

```typescript
// types/template.ts
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'rag' | 'multi-agent' | 'automation' | 'research' | 'content';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];

  // Requirements
  requiredProviders: string[]; // ['openai', 'anthropic']
  requiredTools: string[]; // ['web-search', 'code-exec']
  estimatedCost: number; // USD
  estimatedTime: number; // seconds

  // Workflow data
  nodes: Node[];
  edges: Edge[];

  // Documentation
  instructions?: string; // Markdown
  useCases?: string[];
  exampleOutput?: string;

  // Metadata
  author?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string; // Base64 image
}
```

### Tasks

#### Task 4.1.1: Template Data Structure
- [ ] Define template schema
- [ ] Create template storage (JSON files in `/templates` directory)
- [ ] Template validation (ensure nodes/edges are valid)

**Complexity:** Low
**Files:** `types/template.ts`, `lib/templates/schema.ts`

---

#### Task 4.1.2: Template Browser UI
- [ ] Templates gallery modal
- [ ] Template cards with preview
- [ ] Category filtering
- [ ] Search by tags
- [ ] Difficulty indicators

**UI Mockup:**
```
┌─────────────────────────────────────────────────┐
│ Templates                                  [X]  │
├─────────────────────────────────────────────────┤
│ [Search...] [All▾] [Beginner▾]                 │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐             │
│ │ 📄 RAG       │  │ 🤖 Multi-    │             │
│ │ Assistant    │  │ Agent Debate │             │
│ │              │  │              │             │
│ │ ⭐⭐⭐        │  │ ⭐⭐⭐⭐       │             │
│ │ Beginner     │  │ Intermediate │             │
│ │ $0.05/run    │  │ $0.15/run    │             │
│ │ [Load]       │  │ [Load]       │             │
│ └──────────────┘  └──────────────┘             │
│                                                 │
│ (More templates...)                             │
└─────────────────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/template-browser/index.tsx`

---

#### Task 4.1.3: Template Loading
- [ ] Load button functionality
- [ ] Replace current workflow (with confirmation)
- [ ] Merge with current workflow (advanced)
- [ ] Template positioning (auto-layout)

**Complexity:** Medium
**Files:** `lib/templates/loader.ts`

---

#### Task 4.1.4: Create 5+ Templates

##### Template 1: RAG Research Assistant
```yaml
name: "RAG Research Assistant"
description: "Upload documents, chunk them, and ask questions with context retrieval"
category: rag
difficulty: beginner
nodes:
  - Document Upload
  - Chunker (semantic, 500 chars)
  - User Query (prompt node)
  - Retrieval Agent (finds relevant chunks)
  - Summary Agent (answers question)
  - Result
```

**Complexity:** Low (mostly configuration)
**Files:** `templates/rag-assistant.json`

---

##### Template 2: Code Review Pipeline
```yaml
name: "Code Review Pipeline"
description: "Automated code review with linting, security checks, and human approval"
category: automation
difficulty: intermediate
nodes:
  - Code Upload (document)
  - Linting Agent (check style)
  - Security Agent (check vulnerabilities)
  - Router (pass/fail)
    - [Pass] → Human Review → Approve
    - [Fail] → Rejection Notice
```

**Complexity:** Low
**Files:** `templates/code-review.json`

---

##### Template 3: Multi-Agent Debate
```yaml
name: "Multi-Agent Debate"
description: "Two agents debate a topic, then a judge decides the winner"
category: multi-agent
difficulty: intermediate
nodes:
  - Topic Prompt
  - Advocate Agent (argues for)
  - Opposition Agent (argues against)
  - Judge Agent (evaluates arguments)
  - Result
```

**Complexity:** Low
**Files:** `templates/multi-agent-debate.json`

---

##### Template 4: Content Creation Pipeline
```yaml
name: "Content Creation Pipeline"
description: "Research → Outline → Write → Edit workflow for blog posts"
category: content
difficulty: advanced
nodes:
  - Topic Prompt
  - Web Search Tool (research)
  - Research Agent (summarize findings)
  - Outline Agent (create structure)
  - Writer Agent (write full draft)
  - Editor Agent (improve and polish)
  - Human Review
  - Final Result
```

**Complexity:** Medium (requires web search tool)
**Files:** `templates/content-pipeline.json`

---

##### Template 5: Customer Support Router
```yaml
name: "Customer Support Router"
description: "Intelligent routing of support queries to KB or human agent"
category: automation
difficulty: beginner
nodes:
  - Customer Query (prompt)
  - Intent Router (classify urgency/type)
    - [Simple] → KB Search → Automated Response
    - [Complex] → Human Agent Review
  - Result
```

**Complexity:** Low
**Files:** `templates/support-router.json`

---

#### Task 4.1.5: Template Export (Save as Template)
- [ ] Export current workflow as template
- [ ] Template metadata editor
- [ ] Thumbnail generation (canvas screenshot)
- [ ] Save to templates directory or share

**Complexity:** Medium
**Files:** `lib/templates/exporter.ts`, `components/template-export-modal/index.tsx`

---

## 4.2 UI/UX Polish

### Tasks

#### Task 4.2.1: Visual Design System
- [ ] Consistent color palette (update Tailwind config)
- [ ] Typography scale
- [ ] Spacing system
- [ ] Shadow and border radius standards

**Design Tokens:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* brand colors */ },
        agent: '#6366f1',    // indigo for agents
        tool: '#ea580c',     // orange for tools
        document: '#10b981', // green for documents
        result: '#64748b',   // gray for results
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      }
    }
  }
}
```

**Complexity:** Low
**Files:** `tailwind.config.js`, global CSS

---

#### Task 4.2.2: Loading States
- [ ] Skeleton loaders for async operations
- [ ] Spinners for API calls
- [ ] Progress bars for long operations
- [ ] Shimmer effects for placeholders

**Complexity:** Low
**Files:** `components/ui/skeleton.tsx`, `components/ui/spinner.tsx`

---

#### Task 4.2.3: Empty States
- [ ] Empty canvas state (no nodes)
- [ ] Empty console (no logs)
- [ ] No API keys configured
- [ ] No templates available

**Example:**
```
┌─────────────────────────────────────┐
│                                     │
│         🎨                          │
│                                     │
│   Get Started with Your First       │
│   Workflow                          │
│                                     │
│   Drag nodes from the palette       │
│   or load a template                │
│                                     │
│   [Load Template]  [View Guide]     │
│                                     │
└─────────────────────────────────────┘
```

**Complexity:** Low
**Files:** Multiple component files

---

#### Task 4.2.4: Animations & Transitions
- [ ] Node appearance (fade + scale)
- [ ] Edge drawing animation
- [ ] Execution highlight (pulse)
- [ ] Modal transitions
- [ ] Smooth scrolling

**Complexity:** Low
**Files:** CSS animations, Framer Motion integration (optional)

---

#### Task 4.2.5: Responsive Design
- [ ] Mobile layout (vertical stack)
- [ ] Tablet layout (collapsed panels)
- [ ] Minimum canvas size
- [ ] Responsive typography

**Breakpoints:**
- Mobile: < 768px (show one panel at a time)
- Tablet: 768px - 1024px (collapsible sidebars)
- Desktop: > 1024px (full layout)

**Complexity:** Medium
**Files:** Layout components, Tailwind responsive classes

---

## 4.3 Keyboard Shortcuts

### Shortcut Map

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Y | Redo |
| Cmd/Ctrl + S | Export workflow |
| Cmd/Ctrl + O | Import workflow |
| Cmd/Ctrl + E | Run workflow |
| Delete/Backspace | Delete selected nodes |
| Space | Toggle pan mode |
| Cmd/Ctrl + A | Select all nodes |
| Cmd/Ctrl + / | Show keyboard shortcuts |
| Escape | Close modals/deselect |

### Tasks

#### Task 4.3.1: Keyboard Event Handler
- [ ] Global keyboard listener
- [ ] Action dispatcher
- [ ] Platform detection (Mac vs Windows)
- [ ] Prevent conflicts with browser shortcuts

**Complexity:** Medium
**Files:** `hooks/useKeyboardShortcuts.ts`

---

#### Task 4.3.2: Shortcuts Help Modal
- [ ] Keyboard shortcuts reference
- [ ] Searchable command palette (Cmd+K style)
- [ ] Visual key indicators

**Complexity:** Low
**Files:** `components/shortcuts-modal/index.tsx`

---

## 4.4 Undo/Redo System

### Architecture

```typescript
// lib/history/command.ts
export interface Command {
  do(): void;
  undo(): void;
  description: string;
}

export class AddNodeCommand implements Command {
  constructor(
    private node: Node,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  ) {}

  do() {
    this.setNodes(nodes => [...nodes, this.node]);
  }

  undo() {
    this.setNodes(nodes => nodes.filter(n => n.id !== this.node.id));
  }

  description = `Add node ${this.node.id}`;
}

// History manager
export class CommandHistory {
  private history: Command[] = [];
  private currentIndex = -1;

  execute(command: Command) {
    // Remove any commands after current index (if we're mid-history)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Execute and add to history
    command.do();
    this.history.push(command);
    this.currentIndex++;
  }

  undo() {
    if (this.currentIndex >= 0) {
      this.history[this.currentIndex].undo();
      this.currentIndex--;
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.history[this.currentIndex].do();
    }
  }
}
```

### Tasks

#### Task 4.4.1: Command Classes
- [ ] AddNodeCommand
- [ ] RemoveNodeCommand
- [ ] AddEdgeCommand
- [ ] RemoveEdgeCommand
- [ ] UpdateNodeCommand (property changes)
- [ ] MoveNodeCommand (position, debounced)

**Complexity:** Medium
**Files:** `lib/history/commands.ts`

---

#### Task 4.4.2: History Manager Integration
- [ ] Create history manager instance
- [ ] Wrap all mutations in commands
- [ ] Undo/redo UI buttons
- [ ] History size limit (last 50 actions)

**Complexity:** High (requires refactoring state updates)
**Files:** `app/page.tsx`, `lib/history/manager.ts`

---

#### Task 4.4.3: History Timeline (Optional)
- [ ] Visual timeline of actions
- [ ] Click to jump to any point
- [ ] Action descriptions
- [ ] Branching visualization (if undo then take new path)

**Complexity:** High (nice-to-have)
**Files:** `components/history-timeline/index.tsx`

---

## 4.5 Onboarding

### Tasks

#### Task 4.5.1: First-Run Tutorial
- [ ] Detect first visit (localStorage flag)
- [ ] Overlay tutorial steps
- [ ] Highlight UI elements
- [ ] Interactive walkthrough

**Tutorial Steps:**
1. Welcome
2. This is the palette (drag nodes)
3. This is the canvas (connect nodes)
4. This is properties (configure nodes)
5. Click Run to execute
6. Check console for output

**Complexity:** Medium
**Files:** `components/onboarding/tutorial.tsx`

**Library Option:** Use `react-joyride` or `intro.js`

---

#### Task 4.5.2: Tooltips
- [ ] Add tooltips to all UI elements
- [ ] Hover delay (500ms)
- [ ] Keyboard accessible
- [ ] Consistent styling

**Complexity:** Low
**Files:** Component files, `components/ui/tooltip.tsx`

---

#### Task 4.5.3: Documentation Links
- [ ] Help button in header
- [ ] Link to docs (create docs site or README sections)
- [ ] Video tutorial (optional)
- [ ] Example gallery

**Complexity:** Low
**Files:** `components/header.tsx`

---

## Testing Strategy

### Template Testing
- [ ] All templates load successfully
- [ ] All templates execute without errors
- [ ] Cost estimates are accurate
- [ ] Instructions are clear

### UX Testing
- [ ] Keyboard shortcuts work on Mac and Windows
- [ ] Responsive design on mobile/tablet/desktop
- [ ] All animations smooth (60fps)
- [ ] Empty states display correctly

### Undo/Redo Testing
- [ ] All actions are undoable
- [ ] Redo works after undo
- [ ] History limit enforced
- [ ] No memory leaks

---

## Success Criteria

### Portfolio Presentation
After Phase 4, the project should:
- Look professional and polished
- Have 5+ working demo templates
- Be usable without documentation (intuitive UI)
- Work on different screen sizes
- Feel fast and responsive

### User Experience Goals
- First-time user can load and run a template in < 60 seconds
- All interactions have immediate visual feedback
- No dead-ends (always clear next action)
- Errors are helpful and actionable

---

## Documentation

- [ ] Template creation guide
- [ ] Keyboard shortcuts reference
- [ ] UI component documentation
- [ ] Design system guide
- [ ] Onboarding video (optional)
