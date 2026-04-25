# Testing Guide — Inference Sandbox

**Covers all phases through Phase 4 (Templates)**
**Last updated:** 2026-04-25

---

## Prerequisites

### Start the Dev Server

```bash
pnpm install   # if not already done
pnpm dev       # starts at http://localhost:3000
```

### Get API Keys (for live execution tests)

At least one key is needed to test live execution. Mock mode tests require no keys.

| Provider | Where to get it | Cost per test |
|----------|----------------|---------------|
| OpenAI | platform.openai.com/api-keys | ~$0.001 (gpt-4o-mini) |
| Anthropic | console.anthropic.com | ~$0.003 (claude-haiku-4) |
| Google AI | aistudio.google.com | Free tier available |
| Ollama | ollama.ai (local install) | Free |

Add keys via **Settings** (⚙️ gear icon in toolbar). Click **Test** next to each key, then **Save**.

---

## Node Types Reference

| Node | Purpose |
|------|---------|
| **Prompt** | Initial text input |
| **Document** | File upload (PDF, TXT, MD, JS, TS, PY, JSON) |
| **Chunker** | Splits text into fixed or semantic chunks |
| **Agent** | Calls an LLM (mock or live) |
| **Tool** | Web Search, HTTP, Code Exec, or Database |
| **Router** | Conditional branching |
| **Loop** | Iteration with break conditions |
| **Memory** | Read/write to workflow or global memory |
| **Human Review** | Pauses for manual approval |
| **Result** | Displays terminal output |

All nodes cycle through states: **gray (idle) → blue pulsing (executing) → green (completed) / red (error)**.

---

## Section 1 — Core Setup

### Test 1: Settings & API Keys

1. Click the **Settings** ⚙️ button in the toolbar
2. Enter your OpenAI API key in the OpenAI field
3. Click **Test** — status should update to **✓ Connected**
4. Click **Save** and close

**Expected:** Key is masked (••••), test spinner appears, green checkmark on success.

---

### Test 2: Workflow Name

1. Click the workflow name in the top-left header (defaults to something like "My Workflow")
2. Type a new name
3. Refresh the page (or navigate away and back)

**Expected:** Name persists in the input field.

---

## Section 2 — Basic Execution

### Test 3: Mock Agent (no API key needed)

1. Drag **Agent** from the palette onto the canvas
2. Select it — properties panel opens on the right
3. Set **Mode** to **Mock** (default), enter any prompt
4. Drag **Result** onto the canvas
5. Connect Agent → Result (drag from the blue dot on the Agent to the green dot on Result)
6. Click **Run ▶**

**Expected:**
- Node borders: gray → blue (executing) → green (completed)
- Console shows: `🤖 [Agent name] (mock): [random string]`
- `✅ Done.` at the end

---

### Test 4: Live Agent with Streaming

1. Clear the canvas (**Clear** button)
2. Build: **Prompt → Agent → Result**
3. Set the Prompt text to: `"Explain recursion in one paragraph."`
4. Configure Agent:
   - Model: `openai/gpt-4o-mini`
   - Mode: **Live**
   - Streaming: **on**
5. Click **Run ▶**

**Expected:**
- Console streams tokens in real time with a `▌` cursor
- Node completes with green border
- Cost shown: `💰 Cost: $0.000X | Tokens: XX`

---

### Test 5: Non-Streaming Execution

Same workflow as Test 4, but uncheck **Streaming** on the agent.

**Expected:** Console shows a waiting indicator, then the full response appears at once. No streaming cursor.

---

### Test 6: Pause & Resume

1. Build a 4-agent sequential chain: **Agent 1 → Agent 2 → Agent 3 → Agent 4 → Result**
2. All agents: live mode, prompt `"Count from 1 to 5"`
3. Click **Run ▶**
4. After Agent 1 turns green, click **Pause ⏸️**
5. Wait a few seconds, then click **Resume ▶️**

**Expected:**
- Pause waits for the current node to finish before halting
- Console: `⏸️ Execution paused` then `▶️ Execution resumed`
- Correct buttons appear at each state: Pause+Cancel while running, Resume+Cancel while paused

---

### Test 7: Cancel

1. Same chain as Test 6
2. Click **Run ▶**, then **Cancel** during execution

**Expected:**
- Console: `🛑 Execution cancelled`
- All node borders reset to gray
- Run button reappears

---

## Section 3 — Error Recovery

### Test 8: Retry After Error

1. Open Settings, set an intentionally invalid OpenAI key
2. Build: **Agent (live, gpt-4o-mini) → Result**
3. Click **Run ▶**
4. Error dialog appears — do **not** click anything yet
5. Go to Settings, fix the API key
6. Back in the error dialog, click **Retry**

**Expected:**
- Error dialog shows node name, error message, and three buttons: Retry / Skip / Abort
- After retry with a valid key: node re-executes and completes successfully

---

### Test 9: Skip a Failing Node

Same setup as Test 8, but click **Skip** instead.

**Expected:**
- Console: `⏭️ Skipping node: [name]`
- That node stays red; execution continues to the next node
- Downstream nodes receive no input from the skipped node

---

### Test 10: Abort

Same setup, click **Abort** in the error dialog.

**Expected:** Equivalent to Cancel — all nodes reset to gray, execution stops.

---

## Section 4 — Documents & Chunking

### Test 11: Text File Upload

1. Drag **Document** onto the canvas
2. Select it, click **Choose File**, upload any `.txt` file
3. Check the properties panel

**Expected:** Filename, size, character count, and content preview all populate.

---

### Test 12: PDF Upload

Upload a PDF with text content to a Document node.

**Expected:** Multi-page PDFs extract all text; preview shows the extracted content.

---

### Test 13: Document → Agent Pipeline

Build: **Document → Agent → Result**

Agent prompt: `"Summarize the document in one sentence."`

**Expected:** Agent response is relevant to your document's content.

---

### Test 14: Chunker — Fixed Strategy

Build: **Document → Chunker → Result**

Configure Chunker:
- Strategy: **Fixed**
- Chunk size: 150
- Overlap: 30

**Expected:** Result shows chunks separated by `---CHUNK---`; each chunk ≈150 chars with ~30 char overlap. Chunker node on canvas shows chunk count.

---

### Test 15: Chunker — Semantic Strategy

Same, but switch Chunker to **Semantic** strategy, size 300.

**Expected:** Chunks split at sentence boundaries, no sentence cut in the middle.

---

### Test 16: Multiple Documents → One Agent

1. Create two Document nodes, upload different files to each
2. Connect both to a single Agent node
3. Prompt: `"What topics are covered across both documents?"`

**Expected:** Agent receives content from both documents; response references both files.

---

## Section 5 — Tools

### Test 17: Web Search

Build: **Prompt → Tool (Web Search) → Agent → Result**

- Prompt: `"latest advances in quantum computing"`
- Tool: kind = **Web Search**, max results = 5
- Agent prompt: `"Summarize the search results"`

**Expected:** Tool output shows formatted search results (title, URL, snippet). Agent summarizes them.

> **Note:** Requires a Brave Search API key configured on the server. If not set up, the tool will error with a clear message.

---

### Test 18: HTTP Request

Build: **Tool (HTTP) → Result**

Configure:
- Method: **GET**
- URL: `https://jsonplaceholder.typicode.com/users`

**Expected:** Result shows a JSON array of user objects.

---

### Test 19: Code Execution

Build: **Prompt → Agent → Tool (Code Exec) → Result**

- Prompt: `"Write a Node.js program to print the first 10 Fibonacci numbers"`
- Agent: returns raw JavaScript code
- Tool: Code Exec, timeout 10s

**Expected:** Tool executes the generated code; Result shows the printed Fibonacci sequence.

---

### Test 20: Database Query (Mock)

Build: **Tool (Database) → Result**

Configure:
- Connection string: any string (mock, not real)
- Query: `"SELECT * FROM users LIMIT 5"`

**Expected:** Result shows a markdown table with mock user data.

---

## Section 6 — Advanced Orchestration

### Test 21: Router — Keyword Strategy

Build: **Prompt → Router → Agent A → Result A**
                              **→ Agent B → Result B**

Configure Router:
- Strategy: **Keyword**
- Route 1: label "Weather", keywords: `weather, sunny, rain`, match mode: any
- Route 2: label "Travel", keywords: `travel, hotel, flight`, match mode: any

Set Prompt to: `"The weather today is sunny and perfect for a walk."`

**Expected:** Only Agent A ("Weather" route) executes. Console shows the route taken.

Change Prompt to: `"I need to book a hotel for my trip."` and re-run.

**Expected:** Only Agent B ("Travel" route) executes.

---

### Test 22: Router — LLM Judge Strategy

Same topology, but set Strategy to **LLM Judge**.

- Route 1 judge prompt: `"Is this message about weather or nature?"`
- Route 2 judge prompt: `"Is this message about travel or transportation?"`

**Expected:** LLM evaluates both route conditions and routes to the appropriate agent.

---

### Test 23: Router — Sentiment Strategy

Build: **Prompt → Router → Agent A (Positive) → Result A**
                             **→ Agent B (Negative) → Result B**

- Route 1: target **Positive**, threshold 0.5
- Route 2: target **Negative**, threshold 0.5

Prompt 1: `"This is absolutely wonderful! I love it!"`  
Prompt 2: `"This is terrible. I hate every part of it."`

**Expected:** Each prompt routes to the matching sentiment branch.

---

### Test 24: Router — JSON Field Strategy

Build: **Prompt → Agent (returns JSON) → Router → Result A / Result B**

Agent prompt:
```
Return a JSON object: { "priority": "high" } or { "priority": "low" }.
Return only raw JSON, no markdown.
```

Configure Router:
- Strategy: **JSON Field**
- Route 1: field `priority`, operator `equals`, value `high`
- Route 2: field `priority`, operator `equals`, value `low`

**Expected:** Routes to the correct branch based on the JSON value.

---

### Test 25: Loop Node

Build: **Prompt → Loop → Agent → (back to Loop)**
Loop exits to → **Result**

Configure Loop:
- Max iterations: 3
- Break condition: **Keyword Match**, keyword: `DONE`

Agent prompt:
```
Iteration {{iteration}}: If this is the 2nd iteration, end your response with the word DONE.
Otherwise write one sentence.
```

**Expected:** Loop runs up to 3 times; breaks early on iteration 2 when "DONE" is found. Console shows each iteration.

---

### Test 26: Loop — LLM Judge Break

Configure Loop with break condition **LLM Judge**, prompt:
`"Does this response contain a complete conclusion? Answer only YES or NO."`

**Expected:** Loop continues until the LLM decides the output is complete.

---

### Test 27: Memory Node — Workflow Scope

Build: **Prompt → Memory (write, key: "topic") → Agent → Memory (read, key: "topic") → Result**

- First Memory node: scope **Workflow**, write "topic" from input
- Second Memory node: read "topic", inject into downstream context
- Agent prompt: `"Generate a haiku about {{memory:topic}}"`

**Expected:**
- Memory Inspector (right panel, "Memory" tab) shows the stored key
- Agent output references the stored topic
- Memory resets on next run

---

### Test 28: Memory — Global vs Workflow Scope

1. Run a workflow that writes a key with **Global** scope
2. Run a different workflow
3. Check the Memory Inspector — the global key should still be present

**Expected:** Global keys persist across runs; Workflow keys clear on each new run.

---

### Test 29: Human Review — Approve/Reject

Build: **Agent → Human Review → Result**

Configure Human Review:
- Mode: **Approve / Reject**
- Instructions: `"Check that the response is appropriate"`

Run the workflow. When the review panel appears:
- Click **Approve** on the first test; verify output flows to Result
- Click **Reject** on a second run; verify execution stops

**Expected:** Node stays blue (paused) until a decision is made.

---

### Test 30: Human Review — Edit & Approve

Configure mode: **Edit & Approve**

When review panel appears, modify the agent's output, then click **Approve**.

**Expected:** Downstream nodes receive the edited content, not the original.

---

### Test 31: Human Review — Multi-Reviewer

Configure:
- Enable multi-review: **on**
- Reviewers: 3
- Approval rule: **M-of-N**, M = 2

When review panel appears, approve with 2 of the 3 reviewers.

**Expected:** Execution proceeds after 2 approvals without waiting for the third.

---

## Section 7 — Compare Mode

### Test 32: Basic Compare Run

1. Click **Compare** in the toolbar (turns active)
2. A second row of controls appears — configure two providers:
   - Provider 1: `openai/gpt-4o-mini`
   - Provider 2: `anthropic/claude-haiku-4-5` (or any second model)
3. Build a simple **Prompt → Agent → Result** workflow
4. Click **Run ▶**

**Expected:**
- Two console columns appear side by side
- Both run in parallel, each showing their logs independently
- Both complete with their respective model outputs

---

### Test 33: Word Diff

With exactly 2 providers and both runs complete:

1. Click the **Diff** dropdown in the compare console header
2. Select **Word diff**

**Expected:** The two outputs are shown with color-highlighted word-level differences. Divergence % shown in a summary bar.

---

### Test 34: Sentence Diff

Switch Diff mode to **Sentence diff**.

**Expected:** Differences highlighted at sentence level, not word level.

---

### Test 35: Flip Baseline

With diff active, click the **Flip** button.

**Expected:** The "Base" and "Compare" labels swap; diff colors invert accordingly.

---

### Test 36: Compare with 3–4 Providers

Add a third provider using the **+** button in compare controls.

**Expected:** Three console columns render. Diff controls are hidden (diff only works with exactly 2 providers).

---

## Section 8 — Run Statistics

### Test 37: Stats Panel

After any completed run (compare or single), the **Stats** button in the toolbar becomes active.

1. Click **Stats**

**Expected:** A collapsible panel opens above the console showing per-node timing, token counts, and cost. Close with **X**.

---

### Test 38: Annotation Bar

After a completed run, each console column shows an annotation bar below the output.

1. Click 👍 or 👎
2. Select a star rating (1–5)
3. Type a note in the text field

**Expected:** Annotations persist in localStorage (visible if you re-open the same run in history).

---

### Test 39: Export Annotations

In the annotation bar, click **Export CSV** (if visible) or the export button.

**Expected:** A CSV file downloads with columns: run ID, provider, thumbs, rating, notes, timestamp.

---

## Section 9 — Run History

### Test 40: History Page — Basic View

1. Complete a few runs (mix of successful and errored ones)
2. Navigate to `/history` (or click History in nav)

**Expected:**
- StatsBar shows total/completed/error/cancelled run counts, average duration, total cost
- Run table lists all runs with name, time, duration, status badge, cost, node count

---

### Test 41: History Filters

1. Type a partial name in the search box
2. Select a status from the dropdown (completed / error / cancelled)

**Expected:** Table filters live as you type; clears when field is emptied.

---

### Test 42: Run Detail Drawer

Click **View** on any row in the run table.

**Expected:** A drawer opens on the right showing run metadata, workflow JSON, and per-node outputs.

---

### Test 43: Export a Run

Click **Export** on a row.

**Expected:** A JSON file downloads with the run data, outputs, and workflow snapshot.

---

### Test 44: Delete a Run

Click **Delete** on a row, confirm the dialog.

**Expected:** Row disappears from the table; stats update.

---

### Test 45: Import a Run

1. Export a run (Test 43)
2. Delete that run
3. Click **Import** at the top of the history page
4. Upload the exported JSON file

**Expected:** Run reappears in the table with the same data.

---

### Test 46: Trend Charts

With 5+ runs in history, scroll down to the charts section.

**Expected:**
- Cost trend line chart shows cost over time
- Status distribution chart shows completed/error/cancelled split
- Model usage bar chart shows which models were used most

---

## Section 10 — Templates

### Test 47: Load a Built-in Template

1. Navigate to `/templates`
2. Find any template (e.g., "Document Summarizer") and click **Load**
3. If the canvas has nodes, a confirmation dialog appears — confirm

**Expected:** Canvas populates with the template's workflow; workflow name updates.

---

### Test 48: All 11 Built-in Templates Load

One by one (or a sample), click **Load** on each of the 11 built-in templates:
- Document Summarizer
- RAG Pipeline
- Multi-Agent Analysis
- Keyword Router
- LLM Judge Router
- Refine Loop
- Web Search Pipeline
- Code Gen + Execute
- API Fetch + Analyze
- DB Query + Report
- Research & Code Pipeline

**Expected:** Each loads a valid workflow with nodes and edges correctly connected. Node count badge on each card matches the actual node count when loaded.

---

### Test 49: Save as Template (from Toolbar)

1. Build any workflow on the main canvas
2. Click **Save as Template** in the toolbar
3. Enter a name and optional description, click **Save Template**
4. Navigate to `/templates`

**Expected:** Your saved template appears under "My Templates" with the correct name, description, node count, and node type badges.

---

### Test 50: Save as Template (from Templates Page)

1. Build a workflow on the main canvas
2. Navigate to `/templates` directly
3. Click **+ Save Current Workflow** (top-right, disabled if canvas empty)

**Expected:** Same save modal appears; template saved and appears in the list.

---

### Test 51: Delete a User Template

On the templates page, click **Delete** on a user template.

**Expected:** Template is removed from "My Templates".

---

### Test 52: Template Load Confirmation

1. Build a workflow on the canvas (several nodes)
2. Navigate to `/templates`, click **Load** on any template

**Expected:** A "Replace current workflow?" confirmation dialog appears. Cancel keeps the existing workflow; Load replaces it.

---

### Test 53: Load Template Generates Fresh IDs

1. Load the same template twice (navigate back and load again)

**Expected:** Both loads work without conflicts — node IDs are regenerated each time, so loading twice doesn't cause collisions.

---

## Section 11 — Import / Export Workflows

### Test 54: Export Workflow JSON

1. Build any workflow
2. Click **Export JSON** in the toolbar

**Expected:** A JSON file downloads containing `{ nodes: [...], edges: [...] }`.

---

### Test 55: Import Workflow JSON

1. Clear the canvas
2. Click **Import JSON** and upload the previously exported file

**Expected:** Canvas restores the workflow exactly as exported.

---

## Section 12 — Audit Trail

### Test 56: Audit Trail Entries

Run a workflow that includes a Router, Memory write, or Human Review node.

After the run, look for the **Audit Trail** panel (bottom area or properties tab).

**Expected:**
- Router decisions logged: shows which route was taken
- Memory writes logged: shows key, old value, new value
- Human Review decisions logged: shows APPROVED/REJECTED/EDITED

---

### Test 57: Audit Trail Search & Export

1. In the audit trail, type a node name in the search box
2. Click **Export** (downloads JSON)

**Expected:** Entries filter by search term; export contains all events.

---

## Section 13 — Edge Cases

### Test 58: Empty Canvas Run

Click **Run ▶** with no nodes on the canvas.

**Expected:** Either nothing happens, or a clear message is shown. No crash.

---

### Test 59: Disconnected Nodes

Place two Agent nodes on the canvas with no edges. Click **Run**.

**Expected:** Execution handles disconnected nodes gracefully (each runs independently, or a clear error is shown).

---

### Test 60: Cycle Detection

Connect Node A → Node B → Node A (forming a cycle).

**Expected:** A cycle detection error is shown; execution does not start.

---

### Test 61: Very Long Streaming Output

Set an agent prompt to: `"Write a 1000-word essay about the history of computing."` with streaming on.

1. Scroll up in the console mid-stream
2. Scroll back to the bottom

**Expected:** Auto-scroll disables when you scroll up; re-enables when you reach the bottom.

---

### Test 62: Max Tokens Truncation

Set agent Max Tokens to **50**, prompt: `"Write a 500-word essay."` 

**Expected:** Response cuts off mid-sentence near the token limit. Token count ≈50 shown in cost line.

---

### Test 63: Multiple Sequential Runs

Run the same workflow three times in a row without clearing.

**Expected:** Each run completes cleanly, nodes reset to idle before re-executing, console shows all three runs' output.

---

### Test 64: Save as Template Disabled State

Navigate to `/templates` with an empty canvas.

**Expected:** "+ Save Current Workflow" button is disabled/grayed out.

---

## Checklist

### Core Setup
- [ ] Test 1: Settings & API Keys
- [ ] Test 2: Workflow Name

### Basic Execution
- [ ] Test 3: Mock Agent
- [ ] Test 4: Live Agent with Streaming
- [ ] Test 5: Non-Streaming
- [ ] Test 6: Pause & Resume
- [ ] Test 7: Cancel

### Error Recovery
- [ ] Test 8: Retry
- [ ] Test 9: Skip
- [ ] Test 10: Abort

### Documents & Chunking
- [ ] Test 11: Text Upload
- [ ] Test 12: PDF Upload
- [ ] Test 13: Document → Agent
- [ ] Test 14: Chunker Fixed
- [ ] Test 15: Chunker Semantic
- [ ] Test 16: Multiple Documents → Agent

### Tools
- [ ] Test 17: Web Search
- [ ] Test 18: HTTP Request
- [ ] Test 19: Code Execution
- [ ] Test 20: Database Query

### Advanced Orchestration
- [ ] Test 21: Router — Keyword
- [ ] Test 22: Router — LLM Judge
- [ ] Test 23: Router — Sentiment
- [ ] Test 24: Router — JSON Field
- [ ] Test 25: Loop — Keyword Break
- [ ] Test 26: Loop — LLM Judge Break
- [ ] Test 27: Memory — Workflow Scope
- [ ] Test 28: Memory — Global Scope
- [ ] Test 29: Human Review — Approve/Reject
- [ ] Test 30: Human Review — Edit & Approve
- [ ] Test 31: Human Review — Multi-Reviewer

### Compare Mode
- [ ] Test 32: Basic Compare Run
- [ ] Test 33: Word Diff
- [ ] Test 34: Sentence Diff
- [ ] Test 35: Flip Baseline
- [ ] Test 36: 3–4 Providers

### Run Statistics
- [ ] Test 37: Stats Panel
- [ ] Test 38: Annotation Bar
- [ ] Test 39: Export Annotations

### Run History
- [ ] Test 40: History Page
- [ ] Test 41: Filters
- [ ] Test 42: Detail Drawer
- [ ] Test 43: Export Run
- [ ] Test 44: Delete Run
- [ ] Test 45: Import Run
- [ ] Test 46: Trend Charts

### Templates
- [ ] Test 47: Load Built-in Template
- [ ] Test 48: All 11 Templates Load
- [ ] Test 49: Save as Template (toolbar)
- [ ] Test 50: Save as Template (templates page)
- [ ] Test 51: Delete User Template
- [ ] Test 52: Load with Confirmation
- [ ] Test 53: Fresh IDs on Reload

### Import / Export
- [ ] Test 54: Export Workflow JSON
- [ ] Test 55: Import Workflow JSON

### Audit Trail
- [ ] Test 56: Audit Entries
- [ ] Test 57: Audit Search & Export

### Edge Cases
- [ ] Test 58: Empty Canvas Run
- [ ] Test 59: Disconnected Nodes
- [ ] Test 60: Cycle Detection
- [ ] Test 61: Long Streaming + Auto-Scroll
- [ ] Test 62: Max Tokens Truncation
- [ ] Test 63: Multiple Sequential Runs
- [ ] Test 64: Save Template Disabled State
