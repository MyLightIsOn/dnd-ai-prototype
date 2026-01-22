# Phase 5 Implementation Plan: Collaboration & Sharing

**Status:** Planned
**Priority:** LOW-MEDIUM (Portfolio enhancement)
**Dependencies:** Phase 1-4 (Core functionality must be solid)
**Estimated Duration:** 2-3 weeks

---

## Overview

Phase 5 enables workflow persistence, sharing, and collaboration. This transforms the tool from single-user to community-driven.

---

## Technology Decisions

### Backend Options

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Supabase** | Postgres DB, Auth, Real-time, Storage | Learning curve | Free tier generous |
| **Firebase** | Easy setup, Real-time DB, Auth | NoSQL can be limiting | Free tier good |
| **Vercel Postgres + Auth** | Integrated with Next.js | Manual real-time setup | Pay-as-you-go |

**Recommendation:** Supabase (best balance of features and developer experience)

---

## 5.1 Workflow Persistence

### Architecture

#### Database Schema (Postgres/Supabase)

```sql
-- Users table (Supabase Auth)
-- Provided by Supabase

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT, -- Base64 or URL
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  category TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow likes
CREATE TABLE workflow_likes (
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (workflow_id, user_id)
);

-- Workflow forks (track lineage)
CREATE TABLE workflow_forks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID REFERENCES workflows(id),
  forked_id UUID REFERENCES workflows(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Users can read public workflows or their own
CREATE POLICY "Public workflows are viewable by everyone"
  ON workflows FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Users can only insert their own workflows
CREATE POLICY "Users can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own workflows
CREATE POLICY "Users can update own workflows"
  ON workflows FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own workflows
CREATE POLICY "Users can delete own workflows"
  ON workflows FOR DELETE
  USING (auth.uid() = user_id);
```

### Tasks

#### Task 5.1.1: Supabase Setup
- [ ] Create Supabase project
- [ ] Run schema migrations
- [ ] Configure RLS policies
- [ ] Get API keys (anon, service)

**Complexity:** Low
**Files:** `supabase/migrations/001_initial_schema.sql`

---

#### Task 5.1.2: Supabase Client Integration
- [ ] Install `@supabase/supabase-js`
- [ ] Create client wrapper
- [ ] Environment variables for keys
- [ ] Type generation from DB schema

**Complexity:** Low
**Files:** `lib/supabase/client.ts`, `.env.local`

---

#### Task 5.1.3: Authentication
- [ ] Supabase Auth integration
- [ ] Login modal (email/password)
- [ ] OAuth providers (Google, GitHub - optional)
- [ ] User profile display
- [ ] Logout functionality

**UI Mockup:**
```
┌─────────────────────────┐
│ Login                [X]│
├─────────────────────────┤
│                         │
│ Email                   │
│ [_________________]     │
│                         │
│ Password                │
│ [_________________]     │
│                         │
│ [  Login  ]             │
│                         │
│ Don't have an account?  │
│ [ Sign Up ]             │
│                         │
│ ──── or ────            │
│                         │
│ [ Continue with Google ]│
│ [ Continue with GitHub ]│
└─────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/auth/login-modal.tsx`, `lib/supabase/auth.ts`

---

#### Task 5.1.4: Save Workflow
- [ ] Save button in header
- [ ] Create new workflow
- [ ] Update existing workflow
- [ ] Auto-save (debounced, every 30s)
- [ ] Unsaved changes indicator

**Complexity:** Medium
**Files:** `lib/supabase/workflows.ts`, `components/header.tsx`

---

#### Task 5.1.5: Load Workflow
- [ ] My Workflows list
- [ ] Workflow cards (thumbnail, name, updated)
- [ ] Search workflows
- [ ] Sort by date/name
- [ ] Load workflow to canvas

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ My Workflows                   [+]  │
├─────────────────────────────────────┤
│ [Search...]  [Sort: Recent ▾]       │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [Thumbnail]  RAG Assistant      │ │
│ │              Updated 2 hours ago│ │
│ │              [Open] [Delete]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Thumbnail]  Content Pipeline   │ │
│ │              Updated 1 day ago  │ │
│ │              [Open] [Delete]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/workflows-list/index.tsx`

---

#### Task 5.1.6: Workflow Management
- [ ] Rename workflow
- [ ] Update description
- [ ] Delete workflow (with confirmation)
- [ ] Duplicate workflow
- [ ] Export as JSON (download)

**Complexity:** Low
**Files:** `components/workflow-menu/index.tsx`

---

#### Task 5.1.7: Thumbnail Generation
- [ ] Capture canvas as image (html2canvas or similar)
- [ ] Resize/compress thumbnail
- [ ] Store as base64 or upload to Supabase Storage
- [ ] Regenerate on workflow change

**Complexity:** Medium
**Files:** `lib/utils/thumbnail.ts`

---

## 5.2 Public Gallery

### Tasks

#### Task 5.2.1: Publish Workflow
- [ ] Toggle workflow visibility (public/private)
- [ ] Publish confirmation modal
- [ ] Category selection
- [ ] Tag input
- [ ] Preview before publish

**Complexity:** Low
**Files:** `components/publish-modal/index.tsx`

---

#### Task 5.2.2: Gallery View
- [ ] Public workflows feed
- [ ] Filter by category
- [ ] Search by tags/name
- [ ] Sort by popular/recent
- [ ] Pagination or infinite scroll

**UI Mockup:**
```
┌─────────────────────────────────────────────┐
│ Gallery                                     │
├─────────────────────────────────────────────┤
│ [Search...] [Category: All ▾] [Sort ▾]      │
├─────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐         │
│ │ [Thumbnail]  │  │ [Thumbnail]  │         │
│ │ RAG Assistant│  │ Code Review  │         │
│ │ by @user123  │  │ by @devguru  │         │
│ │ ❤️ 45  👁 234 │  │ ❤️ 23  👁 156 │         │
│ │ [View] [Fork]│  │ [View] [Fork]│         │
│ └──────────────┘  └──────────────┘         │
│                                             │
│ (More workflows...)                         │
└─────────────────────────────────────────────┘
```

**Complexity:** Medium
**Files:** `components/gallery/index.tsx`

---

#### Task 5.2.3: Workflow Detail Page
- [ ] Full workflow preview (read-only canvas)
- [ ] Description and instructions
- [ ] Author info
- [ ] Fork/Like buttons
- [ ] Usage stats
- [ ] Comments (optional)

**Complexity:** Medium
**Files:** `app/workflow/[id]/page.tsx`

---

#### Task 5.2.4: Fork Workflow
- [ ] Fork button creates copy
- [ ] Linked to original (for attribution)
- [ ] Track fork count
- [ ] User can edit forked copy

**Complexity:** Low
**Files:** `lib/supabase/workflows.ts`

---

#### Task 5.2.5: Like/Bookmark
- [ ] Like button (heart icon)
- [ ] Bookmark for later
- [ ] My Likes page
- [ ] My Bookmarks page

**Complexity:** Low
**Files:** `lib/supabase/likes.ts`, `components/gallery/workflow-card.tsx`

---

## 5.3 Real-time Collaboration (Stretch Goal)

### Technology Options

| Option | Pros | Cons |
|--------|------|------|
| **Liveblocks** | Easy setup, great DX, built for collaboration | Paid (free tier limited) |
| **PartyKit** | Serverless, modern, good pricing | Newer, less battle-tested |
| **Supabase Real-time** | Already using Supabase | Manual CRDT implementation |
| **Yjs + y-websocket** | Open source, powerful | Complex setup |

**Recommendation:** Start with Liveblocks for MVP, consider PartyKit for production

### Tasks

#### Task 5.3.1: Liveblocks Setup (Optional)
- [ ] Install `@liveblocks/client` and `@liveblocks/react`
- [ ] Create Liveblocks room per workflow
- [ ] Configure authentication
- [ ] Set up presence (who's online)

**Complexity:** Medium
**Files:** `lib/liveblocks/client.ts`

---

#### Task 5.3.2: Live Cursors (Optional)
- [ ] Show other users' cursors
- [ ] Cursor color per user
- [ ] User name tooltip
- [ ] Smooth cursor animations

**Complexity:** Medium
**Files:** `components/viewport/live-cursors.tsx`

---

#### Task 5.3.3: Presence Indicators (Optional)
- [ ] User avatars in header
- [ ] Online count
- [ ] Typing indicators (in properties panel)

**Complexity:** Low
**Files:** `components/presence/index.tsx`

---

#### Task 5.3.4: Collaborative Editing (Optional)
- [ ] CRDT-based node/edge sync
- [ ] Conflict resolution
- [ ] Optimistic updates
- [ ] Offline support with sync

**Complexity:** Very High
**Skip for MVP unless critical**

---

## 5.4 Workflow Versioning (Optional)

### Architecture

```sql
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  commit_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tasks

#### Task 5.4.1: Version History
- [ ] Save version on manual save
- [ ] Version list in UI
- [ ] Compare versions (diff view)
- [ ] Restore to previous version

**Complexity:** High
**Files:** `components/version-history/index.tsx`

---

## Testing Strategy

### Authentication
- [ ] Login/logout flow
- [ ] Session persistence
- [ ] Unauthorized access prevention

### Workflow Persistence
- [ ] Save/load workflows
- [ ] Auto-save functionality
- [ ] Thumbnail generation
- [ ] Search and filter

### Gallery
- [ ] Public/private visibility
- [ ] Fork workflow
- [ ] Like/unlike
- [ ] View counts accurate

### Real-time (if implemented)
- [ ] Multi-user cursors
- [ ] Presence accuracy
- [ ] No conflicts during concurrent edits

---

## Success Criteria

### Demo Scenario 1: Sharing Workflow
1. User creates workflow
2. Clicks "Publish"
3. Workflow appears in gallery
4. Other users can view and fork
5. Original author sees fork count increase

### Demo Scenario 2: Gallery Discovery
1. User opens gallery
2. Filters by "RAG" category
3. Finds interesting workflow
4. Forks to own account
5. Modifies and re-publishes

### Performance Targets
- Workflow save: < 1s
- Workflow load: < 2s
- Gallery page load: < 3s (20 workflows)
- Thumbnail generation: < 500ms

---

## Security Considerations

- [ ] RLS policies prevent unauthorized access
- [ ] API keys never stored in public workflows
- [ ] Sanitize user input (XSS prevention)
- [ ] Rate limiting on workflow creation
- [ ] Abuse reporting system (flag inappropriate workflows)

---

## Documentation

- [ ] Sharing workflow guide
- [ ] Gallery usage guide
- [ ] Privacy settings explanation
- [ ] Fork vs duplicate explanation
- [ ] Collaboration features (if implemented)
