# inference-sandbox

A visual, node-based editor for designing, executing, and evaluating multi-agent AI workflows across multiple LLM providers.

Build workflows by connecting nodes on a canvas — Prompt, Agent, Tool, Router, Document, Chunker, Memory, Loop, Human Review, and Result. Run them against real LLM APIs and compare outputs across providers side by side.

**Supported providers:** OpenAI, Anthropic (Claude), Google AI (Gemini), Ollama (local/custom models)

**GitHub:** https://github.com/MyLightIsOn/inference-sandbox

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [API key setup](#api-key-setup)
- [Using the canvas](#using-the-canvas)
- [Node types reference](#node-types-reference)
- [Sample workflows](#sample-workflows)
- [Compare Mode](#compare-mode)
- [Self-hosting with Supabase](#self-hosting-with-supabase-optional)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Visual canvas** — drag-and-drop node editor powered by React Flow
- **Multi-provider execution** — run the same workflow against up to 4 providers in parallel
- **Compare Mode** — view outputs side by side with synchronized scrolling
- **Shadow Test Mode** — diff your local Ollama model against a frontier model
- **Streaming** — real-time token-by-token output display
- **Document processing** — PDF, TXT, MD, and code file support with chunking
- **Cost tracking** — per-run token usage and estimated cost per provider
- **Import/export** — save and share workflows as JSON
- **Sample workflows** — 11 pre-built workflows covering common patterns

---

## Quick start

**Prerequisites:** Node.js 20+, pnpm

```bash
git clone https://github.com/MyLightIsOn/inference-sandbox.git
cd inference-sandbox
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No API keys are required to get started — all agent nodes default to **Mock** mode, which returns placeholder output without making any API calls.

---

## API key setup

To run live LLM calls, click the **Settings** button in the toolbar (the top bar that also contains Run, Samples, Export, and Import). Enter your API keys for any providers you want to use:

| Provider | Where to get a key |
|---|---|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| Google AI | https://aistudio.google.com/app/apikeys |
| Ollama | No key needed — run Ollama locally and it is auto-detected |

Keys are stored in your browser's `localStorage`. They are never sent anywhere except to the respective provider's API. To use live mode, open any Agent node's properties panel and switch **Mode** from Mock to Live.

---

## Using the canvas

### Building a workflow

The **palette** on the left lists all available node types. Drag any node type onto the canvas to create an instance. Nodes can be repositioned by dragging them.

To connect two nodes, hover over a node until connection handles appear. Each node has handles on all four sides — **blue handles are sources** (drag from these to start a connection) and **green handles are targets** (drag to these to complete a connection). You can connect from any side. A visible arrow confirms the connection. Data flows in the direction of the arrow.

To delete a connection, click on the edge arrow and press Backspace or Delete.

### Editing node properties

Click any node to open its **properties panel** on the right sidebar. Changes take effect immediately — there is no save button.

### Running a workflow

Click **Run** in the toolbar. The executor performs a topological sort of the graph, then processes each node in dependency order:

1. Nodes glow **blue** (pulsing) while executing.
2. Nodes turn **green** when complete.
3. Nodes turn **red** if an error occurs.

If a cycle is detected in the graph, execution is blocked and an error is shown.

### Execution controls

| Button | Behavior |
|---|---|
| Run | Start or restart workflow execution |
| Pause | Finish the current node, then hold |
| Resume | Continue from where execution paused |
| Cancel | Stop after the current node finishes and reset all nodes to idle |

### The console

The **console panel** at the bottom displays real-time output from every node. During streaming, tokens appear one by one as they arrive from the API.

The console auto-scrolls to follow new output. If you manually scroll up while a workflow is running, auto-scroll pauses. Scroll back to the bottom to re-enable it.

### Error recovery

When a node fails, an **error dialog** appears with three options:

- **Retry** — re-execute the failed node (useful after fixing a prompt or API key)
- **Skip** — leave the node in an error state and continue with downstream nodes
- **Abort** — cancel the entire run and reset all nodes to idle

### Importing and exporting

Use the **Export** button in the header to download the current workflow as a JSON file. Use **Import** to load a previously saved workflow. Workflows are not persisted automatically — export before closing the tab if you want to keep them.

---

## Node types reference

### Prompt

The Prompt node is an input node. It provides a block of text — a user query, a set of instructions, or any starting content — to whatever nodes are connected downstream. Every workflow that does not start with a Document upload typically starts with a Prompt.

**Properties:**

| Property | Description |
|---|---|
| Name | Optional label shown on the canvas |
| Text | The prompt text (freeform, any length) |

---

### Agent

The Agent node runs an LLM call. It receives text from all connected upstream nodes, combines that context with its own prompt, and sends the result to the configured model. The response is passed to any downstream nodes.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Model | Provider and model, e.g. `openai/gpt-4o-mini`. Grouped dropdown by provider. |
| Mode | **Mock** (free, no API key needed, returns a placeholder) or **Live** (calls real API) |
| Streaming | When enabled, tokens appear in the console one by one as they arrive |
| Prompt | Instructions for the model. Combined with any upstream context. |
| Temperature | 0–2. 0 = deterministic, 2 = highly creative. Default: 0.7 |
| Max Tokens | Maximum response length. Range 1–100,000. Default: 1000 |
| Read Keys | Comma-separated memory keys to read before execution (see [Memory](#memory)) |
| Write Key | Memory key to write the agent's output to after execution |

**Supported models:**

| Provider | Models |
|---|---|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | claude-opus-4, claude-sonnet-4, claude-haiku-4 |
| Google AI | gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash |
| Ollama | Dynamically discovered from your local Ollama installation |

---

### Document

The Document node uploads a file and extracts its text content, passing it to downstream nodes. It supports PDFs (including multi-page documents), plain text, Markdown, and common code file types.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| File | Upload button — accepts .pdf, .txt, .md, .js, .ts, .py, .jsx, .tsx, .json, .csv |
| Preview | First 1,000 characters of extracted content (read-only) |
| File info | Shows filename, type, size, and character count (populated after upload) |

File size limit is 10MB. PDF text extraction uses `pdfjs-dist` and works on most text-based PDFs. Image-only (scanned) PDFs are not supported.

---

### Chunker

The Chunker node splits large text into smaller, overlapping chunks. This is useful when document content exceeds a model's context window, or when you want to process segments of a document independently before aggregating results.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Strategy | **Fixed** — splits at exact character count. **Semantic** — splits at sentence boundaries. |
| Chunk Size | Target size in characters. Range 10–10,000. Default: 500 |
| Overlap | Characters shared between adjacent chunks (provides continuity). Range 0–Chunk Size. Default: 50 |

Output chunks are joined with a `---CHUNK---` delimiter. The canvas node badge shows the number of chunks produced after execution.

---

### Router

The Router node evaluates incoming text against configurable conditions and routes execution to exactly one downstream path. Connect each route's output handle to a different branch of your workflow.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Strategy | How routes are evaluated (see below) |
| Routes | List of named routes, each with a condition |
| Default Route | Optional fallback if no condition matches |

**Strategy: Keyword**

Each route defines a list of keywords, a match mode (Any = any one keyword matches, All = all must match), and optional case sensitivity. Fast and free — no API call required.

**Strategy: Sentiment**

Each route defines a target sentiment (positive, negative, or neutral) and a confidence threshold between 0 and 1. Routes to the path whose sentiment most closely matches at or above the threshold.

**Strategy: LLM Judge**

Each route provides a custom prompt that asks an LLM whether the input matches the route's intent. Set a judge model on the router (format: `provider/model-id`). More flexible than keywords but costs tokens on every evaluation.

**Strategy: JSON Field**

Each route extracts a specific field from a JSON input using dot-notation (e.g. `user.role`) and compares it to a target value using an operator: equals, contains, gt (greater than), or lt (less than).

---

### Loop

The Loop node repeats a section of the workflow up to a maximum number of iterations. It has two output handles: **continue** (feeds back into the loop body on each iteration) and **exit** (routes to downstream nodes when the loop finishes or a break condition is met).

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Max Iterations | Maximum loop count. Range 1–100. Default: 10 |
| Break Condition | When to exit early (see below) |

**Break conditions:**

| Condition | Behavior |
|---|---|
| Always | Loop runs exactly Max Iterations times with no early exit |
| Keyword | Exits early if the loop body's output contains any of the specified keywords |
| LLM Judge | Exits early if an LLM evaluates a custom prompt as true (requires model + provider) |

---

### Memory

The Memory node provides a named key-value store for passing data between nodes that are not directly connected, or for persisting values across loop iterations. Agents read from and write to memory using the **Read Keys** and **Write Key** properties on their properties panel.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Scope | **Workflow** — resets at the start of each run. **Global** — persists across runs within the same browser session. |
| Keys | Comma-separated list of key names this node manages |

To use memory in a workflow: add a Memory node, define your key names on it, then reference those keys in any Agent node's **Read Keys** (to inject stored values as context) or **Write Key** (to store the agent's output).

---

### Human Review

The Human Review node pauses workflow execution and presents the incoming content to a human reviewer. Execution does not continue until the reviewer takes action. Use this for quality gates, safety reviews, or any step that requires human judgment before proceeding.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Instructions | Optional guidance shown to the reviewer explaining what to look for |
| Review Mode | **Approve/Reject** — reviewer approves or rejects the content as-is. **Edit & Approve** — reviewer can modify the content before approving. |
| Multi-Reviewer | Enable to require sign-off from multiple reviewers (2–10 reviewers) |

When Multi-Reviewer is enabled, you also configure the approval rule:

| Rule | Meaning |
|---|---|
| any (1-of-n) | Any single reviewer's approval is sufficient |
| all-required | Every reviewer must approve |
| m-of-n | At least M out of N reviewers must approve |

---

### Tool

The Tool node performs external actions — web searches, HTTP requests, JavaScript execution, or database queries. It receives upstream text as context and passes its output downstream.

**Properties:**

| Property | Description |
|---|---|
| Name | Label shown on canvas |
| Kind | The type of tool action (see below) |

**Kind: Web Search**

Searches the web using Brave Search.

| Option | Description |
|---|---|
| Max Results | Number of results to return. Range 1–10. Default: 5 |
| Include Domains | Optional comma-separated list of domains to restrict results to |
| Exclude Domains | Optional comma-separated list of domains to omit from results |

Requires a `BRAVE_API_KEY` environment variable set in your `.env.local` file.

**Kind: HTTP**

Makes an HTTP request to any URL and returns the response body.

| Option | Description |
|---|---|
| Method | GET, POST, PUT, or DELETE |
| URL | The endpoint to call |
| Headers | Key/value pairs (add or remove as needed) |
| Body | Optional request body (for POST/PUT) |
| Auth | Optional Bearer token or API key header |

**Kind: Code Execution**

Runs JavaScript in a browser-side Node.js environment powered by WebContainers. The sandbox boots on first use — this may take a few seconds.

| Option | Description |
|---|---|
| Code | The JavaScript to execute (textarea) |
| Timeout | Maximum execution time in seconds. Range 1–60. Default: 10 |

**Kind: Database** *(mock only)*

Accepts a SQL query and returns simulated data. No real database connection is made.

| Option | Description |
|---|---|
| Connection String | Display only (no connection is established) |
| Query | SQL query to run against the mock dataset |

---

### Result

The Result node is a terminal node that displays the final output of the workflow. Every workflow should end with at least one Result node.

**Properties:**

| Property | Description |
|---|---|
| Name | Optional label shown on canvas |
| Output | Read-only display of execution output (populated after the workflow runs) |

---

## Sample workflows

Open the **Samples** menu in the toolbar to load any of the pre-built workflows below. Each one loads directly into the canvas as a starting point you can modify.

| Sample | Nodes | Demonstrates |
|---|---|---|
| Document Summarizer | Document → Agent → Result | PDF upload, text extraction, live agent summarization |
| RAG Pipeline | Document → Chunker → Agent → Result | Semantic chunking, context-aware analysis |
| Multi-Agent Analysis | Document → 2 Agents → Synthesizer → Result | Parallel agents feeding one synthesizer |
| Keyword Router | Prompt → Router → 2 Agents → 2 Results | Keyword-based conditional routing |
| LLM Judge Router | Prompt → Router → 2 Agents → 2 Results | AI-evaluated routing conditions |
| Refine Loop | Prompt → Loop → Agent → Result | Iterative refinement with keyword break condition |
| Web Search Pipeline | Prompt → Web Search → Agent → Result | Live web search feeding an agent |
| Code Gen + Execute | Prompt → Agent → Code Exec → Result | Generate JavaScript and run it in the browser |
| API Fetch + Analyze | Prompt + HTTP → Agent → Result | Fetch real API data, analyze with LLM |
| DB Query + Report | Database → Agent → Result | Query mock database, generate report |
| Research & Code Pipeline | Prompt → Web Search → Agent → Code Exec → Result | Full search-to-code pipeline |

### Document Summarizer

Drop in a PDF or text file and get a structured bullet-point summary. This is a good first workflow to run after setting up your API keys — it exercises file upload, PDF extraction, and a live agent call in one short chain.

### RAG Pipeline

Demonstrates the Chunker node splitting a long document into 500-character semantic chunks before passing them to an agent. This is the pattern to use whenever a document might exceed a model's context window, or when you want the agent to reason about the document in segments.

### Multi-Agent Analysis

Two agents process the same source document in parallel with different instructions — one extracts facts and the other provides historical context. A third synthesizer agent receives both outputs and produces a final integrated report. A good demonstration of how a single node's output can fan out to multiple downstream agents.

### Keyword Router

A prompt routes to one of two agents based on whether keywords like "weather" or "travel" appear in the input. Edit the Prompt node's text to trigger different branches. This is the simplest and cheapest form of conditional routing.

### LLM Judge Router

Instead of keywords, a GPT-4o-mini judge evaluates whether the input describes an urgent issue or a standard request, then routes accordingly. Swap in a cheaper model on the router to reduce per-evaluation cost. This pattern handles inputs that keyword matching can not — nuanced language and paraphrasing.

### Refine Loop

An agent iteratively improves a product description up to 3 times. The loop exits early if the agent outputs the word "APPROVED" — demonstrating a keyword break condition. Useful for understanding iterative self-critique patterns before building more complex refinement workflows.

### Web Search Pipeline

Enter a research topic and the workflow searches the web using Brave Search, then an agent synthesizes the results into a summary. Requires a `BRAVE_API_KEY` in your environment. A good test of the Tool node in a real multi-step pipeline.

### Code Gen + Execute

An agent generates JavaScript code based on your prompt, and that code is immediately executed in a browser-side Node.js sandbox. The Result node shows the program's actual stdout output rather than just the generated source. Demonstrates the code execution Tool node and a simple two-step generation → execution pattern.

### API Fetch + Analyze

Uses the HTTP tool to fetch user data from a public API endpoint, then a data-analyst agent receives both your instructions (from a Prompt node) and the API response as combined context. A good template for any workflow that needs to pull in live external data before reasoning about it.

### DB Query + Report

Runs a SQL query against a mock database dataset and passes the results to an agent that formats a readable summary report. A useful starting point for workflows that will eventually connect to a real database.

### Research & Code Pipeline

A full multi-tool chain: web search for a topic, pass results to an agent that generates JavaScript, run the code in the browser sandbox, and display the output. The longest sample in terms of node count — useful for seeing how multiple Tool nodes compose in sequence.

---

## Compare Mode

Compare Mode runs the same workflow against multiple LLM providers simultaneously and shows their outputs side by side. Use it to evaluate quality differences between models, validate that a cheaper model matches a more expensive one, or stress-test a prompt across providers.

### Activating Compare Mode

Click the **Compare** button in the top-right area of the toolbar. The console at the bottom switches to a multi-column layout, and provider pills appear below the toolbar run controls.

### Configuring providers

Each pill represents one parallel run lane.

| Action | How |
|---|---|
| Add a provider | Click **+ Add** (maximum 4 lanes) |
| Remove a provider | Click × on any pill (minimum 2 lanes) |
| Change model | Use the dropdown on each pill to select any supported model |

By default, two provider lanes are shown when Compare Mode is first activated.

### Shadow Test Mode

Click the lock icon on the first pill to engage **Shadow Test Mode**. The locked lane is pinned to your local Ollama model. Use this to compare a local model's output against a frontier model without modifying any Agent nodes in your workflow. The lock icon and "Local" label in the column header distinguish the shadow lane visually.

### Running in Compare Mode

Click **Run** as normal. The workflow executes once per configured lane in parallel. Each lane's output streams into its own column in real time. Execution controls (Pause, Resume, Cancel) apply to all lanes simultaneously.

### Reading the output

Each column shows:

- A header displaying the provider and model name (locked shadow lanes show a lock icon and "Local")
- The full execution log for that lane, with all node outputs in order
- Auto-scroll follows new output during streaming; manually scrolling up pauses auto-scroll until you return to the bottom

### Diff Mode

When exactly 2 provider lanes are configured, diff mode controls appear in the console header. Three options are available:

| Button | Behavior |
|---|---|
| Diff off | Both columns display independently (default) |
| Word diff | Highlights word-level differences between the two outputs |
| Sentence diff | Highlights sentence-level differences between the two outputs |

In diff mode:
- **Purple highlights** indicate content present only in the left (base) output
- **Blue highlights** indicate content present only in the right (compare) output
- The header shows the character count delta between the two outputs and a divergence percentage

Click **Flip** to swap which lane is treated as the baseline for diff calculations.

---

## Self-hosting with Supabase (optional)

Supabase adds persistent run history, annotations, and shareable snapshots. Without it, the app runs fully in-browser with no backend required.

Copy `.env.local.example` to `.env.local`, fill in your Supabase project URL and anon key, then run `docker-compose up`. The app auto-detects the Supabase backend at startup and enables history features when a connection is found.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Canvas | React Flow (`@xyflow/react` 12.x) |
| Styling | Tailwind CSS 4, shadcn/ui |
| LLM SDKs | `openai`, `@anthropic-ai/sdk`, `@google/generative-ai` |
| Document parsing | `pdfjs-dist` |
| Backend (optional) | Supabase (Postgres + auth + storage) |
| Tests | Vitest |
| Package manager | pnpm |
| Deployment | Vercel |

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Compare Mode — run N providers simultaneously | Shipped |
| 1 | Shadow Test Mode — diff local vs frontier models | Shipped |
| 2 | Qualitative Annotation — rate and annotate outputs | Planned |
| 2 | Run Observability — latency, tokens, cost per node | Planned |
| 3 | Run History — persistent log with filters and trends | Planned |
| 3 | Shareable Snapshots — export runs as HTML or URL | Planned |
| 4 | Prompt Versioning — track prompt changes across runs | Planned |
| 4 | Template Library — curated community workflow templates | Planned |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

---

## License

MIT — see [LICENSE](LICENSE)
