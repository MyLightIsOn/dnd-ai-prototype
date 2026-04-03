# Phase 4: Workflow Templates — Design Spec

**Date:** 2026-04-03  
**Status:** Approved

## Overview

Add a templates system to inference-sandbox. Users can browse 11 built-in workflow templates and save their own workflows as reusable templates. A dedicated `/templates` page replaces the existing "Samples" toolbar dropdown as the single entry point for loading templates.

## Decisions Made

| Question | Decision |
|---|---|
| Template sources | Built-in (11 existing samples) + user-saved (stored in SQLite) |
| Toolbar Samples dropdown | Removed; everything goes through `/templates` page |
| Save metadata | Name + optional description |
| Template storage | New `templates` table in existing `data/runs.db` |
| Sharing | None in this phase (no export/import of templates) |
| Load behavior | Replaces current canvas; confirmation dialog if canvas is not empty |

---

## 1. Data Layer

### Database

New table added to the existing `data/runs.db` via `getDb()` migration in `lib/db/index.ts`:

```sql
CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,   -- uuid v4
  name        TEXT NOT NULL,
  description TEXT,               -- nullable
  created_at  INTEGER NOT NULL,   -- Unix ms
  node_count  INTEGER NOT NULL,
  node_types  TEXT NOT NULL,      -- JSON array of unique node type strings, e.g. ["agent","tool","result"]
  workflow    TEXT NOT NULL        -- JSON: { nodes: TypedNode[], edges: Edge[] }
);
```

`node_types` is pre-computed on save (derived from `workflow.nodes`) so the templates page never needs to parse workflow JSON just to render node-type badges.

### API Routes

All routes live in `app/api/templates/`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List all user templates, newest first |
| `POST` | `/api/templates` | Create a new user template |
| `DELETE` | `/api/templates/[id]` | Delete a user template |

No update/edit endpoint — to update a template, delete and re-save.

### New Files

- `lib/db/templates-repo.ts` — typed query functions: `insertTemplate`, `listTemplates`, `deleteTemplate`

---

## 2. Built-in Templates Refactor

### Before

`lib/addSample.ts` contains 11 imperative functions (`addDocumentSummarizer`, `addRagPipeline`, etc.), each calling `setNodes` and `setEdges` directly. They are invoked from a dropdown in the toolbar.

### After

`lib/addSample.ts` is deleted. A new declarative static array replaces it:

**New file:** `lib/templates/built-in.ts`

```typescript
export interface BuiltInTemplate {
  id: string;           // stable slug, e.g. "document-summarizer"
  name: string;
  description: string;
  node_count: number;
  node_types: string[]; // unique node type strings, e.g. ["document", "agent", "result"]
  workflow: { nodes: TypedNode[]; edges: Edge[] };
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'document-summarizer',
    name: 'Document Summarizer',
    description: 'Upload a PDF and get a concise summary using an LLM agent.',
    node_count: 3,
    node_types: ['document', 'agent', 'result'],
    workflow: { nodes: [...], edges: [...] },
  },
  // ... 10 more entries matching all existing samples
];
```

The 11 entries correspond 1-to-1 with the existing sample functions. Node and edge definitions are inlined, copied from the existing `addSample.ts` functions.

Loading any template (built-in or user) goes through a single shared function:

```typescript
function loadTemplate(workflow: { nodes: TypedNode[]; edges: Edge[] }) {
  setNodes(workflow.nodes);
  setEdges(workflow.edges);
}
```

---

## 3. Templates Page

### Route

`app/templates/page.tsx` — the `NEXT_PUBLIC_FEATURE_TEMPLATES` flag in `components/nav/index.tsx` is set to `true` in `.env.local`.

### Layout (top to bottom)

#### Page header

- Left: "Workflow Templates" heading + subtitle ("Start from a built-in template or one you've saved")
- Right: "+ Save Current Workflow" button — opens `SaveTemplateModal`

#### Built-in Templates section

- Section label: "Built-in Templates"
- 3-column card grid showing all 11 built-in templates
- Cards are static (loaded from `BUILT_IN_TEMPLATES` array, no API call needed)

#### My Templates section

- Section label: "My Templates"
- 3-column card grid, newest first, fetched from `GET /api/templates`
- Empty state (dashed border placeholder): "Save your current workflow to create a template"

### Template Card (`components/templates/template-card.tsx`)

Shared component used for both built-in and user templates.

Props:
- `name: string`
- `description: string | null`
- `nodeCount: number`
- `nodeTypes: string[]`
- `createdAt?: number` — shown on user templates only (e.g. "Apr 3")
- `showDelete?: boolean` — true for user templates only
- `onLoad: () => void`
- `onDelete?: () => void`

Card contents:
- Name (bold)
- Description (gray, 2 lines max)
- Node-type badges (colored pills, one per unique node type; counts shown if >1, e.g. "Agent ×2")
- Footer: node count + creation date (user templates) · Load button · Delete button (user templates only)

**Load behavior:** `onLoad` sets a `pendingTemplate` in the page's local state. If the canvas has no nodes, it loads immediately. If the canvas has nodes, a confirmation dialog appears ("This will replace your current workflow. Continue?"). On confirm: calls `setNodes` + `setEdges` from the Zustand store, sets `workflowName` to the template name, then navigates to `/`.

**Delete behavior:** calls `DELETE /api/templates/[id]`, then refreshes the user templates list.

### Save Template Modal (`components/templates/save-template-modal.tsx`)

Opens from:
1. The "+ Save Current Workflow" button on the templates page header
2. A "Save as Template" button in the editor toolbar

Fields:
- **Name** (required) — pre-filled from `workflowName` in the Zustand store
- **Description** (optional) — empty textarea

On submit: `POST /api/templates` with `{ name, description, node_count, node_types, workflow }`. On success: modal closes; if opened from the templates page, the user templates list refreshes.

---

## 4. Toolbar & Editor Changes

### Removed

- The "Samples" `DropdownMenu` and all its items from `components/toolbar/index.tsx`
- The `onAddSample` prop from `Toolbar`, `Header`, and `app/page.tsx`
- The `addSample` switch statement and all 11 `add*` imports from `app/page.tsx`

### Added

- A **"Save as Template"** button in `components/toolbar/index.tsx`, placed next to the Export button. Disabled when the canvas has no nodes.
- `saveTemplateOpen: boolean` state in `app/page.tsx` to control the modal

---

## 5. New Files Summary

```
lib/
  templates/
    built-in.ts                    # BUILT_IN_TEMPLATES static array

lib/db/
  templates-repo.ts                # insertTemplate, listTemplates, deleteTemplate

app/
  api/
    templates/
      route.ts                     # GET (list) + POST (create)
      [id]/
        route.ts                   # DELETE
  templates/
    page.tsx                       # Templates gallery page

components/
  templates/
    template-card.tsx              # Shared card for built-in + user templates
    save-template-modal.tsx        # Save dialog with name + description
```

---

## 6. Modified Files

| File | Change |
|---|---|
| `lib/db/index.ts` | Add `templates` table to `migrate()` |
| `components/toolbar/index.tsx` | Remove Samples dropdown; add Save as Template button |
| `components/header.tsx` | Remove `onAddSample` prop |
| `app/page.tsx` | Remove addSample logic; add `saveTemplateOpen` state and `SaveTemplateModal` render |
| `.env.local` | Set `NEXT_PUBLIC_FEATURE_TEMPLATES=true` |

---

## 7. Deleted Files

- `lib/addSample.ts`

---

## 8. Testing

- Unit tests for `lib/db/templates-repo.ts` using in-memory SQLite (`:memory:`)
- Unit tests for `lib/templates/built-in.ts`: verify all 11 entries have required fields, valid node/edge arrays, and that `node_types` matches the actual node types present in `workflow.nodes`
- No browser tests for the templates page UI
