# Testing Guide - Multi-Agent Workflow Studio

**Phase 1 Complete** - Ready for Testing
**Branch:** `phase-1/foundation`
**Date:** January 16, 2026

---

## Prerequisites

### 1. Get API Keys

You'll need at least one API key to test live execution:

- **OpenAI** (Recommended for first test)
  - Go to: https://platform.openai.com/api-keys
  - Click "Create new secret key"
  - Copy the key (starts with `sk-`)
  - Cost: ~$0.001 per test (using gpt-4o-mini)

- **Anthropic** (Optional)
  - Go to: https://console.anthropic.com/
  - Click "Get API Keys"
  - Create a new key
  - Cost: ~$0.003 per test (using claude-haiku-4)

- **Google AI** (Optional)
  - Go to: https://aistudio.google.com/
  - Get API key from settings
  - Cost: Free tier available

- **Ollama** (Optional - Local)
  - Install from: https://ollama.ai
  - Run: `ollama pull llama3.2`
  - No API key needed, runs locally

### 2. Start the Development Server

```bash
# Make sure you're on the correct branch
git checkout phase-1/foundation

# Install dependencies (if not already done)
pnpm install

# Start dev server
pnpm dev
```

Open http://localhost:3000 in your browser.

---

## Test Suite

### Test 1: Settings & API Key Configuration ⚙️

**What it tests:** Settings panel, API key storage, validation

**Steps:**
1. Click the **Settings** icon (⚙️) in the top toolbar
2. Settings modal should open
3. Find the **OpenAI** section
4. Click in the API key input field
5. Paste your OpenAI API key (starts with `sk-`)
6. Click the **Test** button next to the input
7. Wait for validation (~2-3 seconds)
8. Status should change to **✓ Connected**
9. Click **Save** button at bottom
10. Close modal by clicking X or outside

**Expected Results:**
- ✅ Settings modal opens smoothly
- ✅ API key is masked (shows •••• instead of actual key)
- ✅ Test button shows loading spinner during validation
- ✅ Status updates to "Connected" with green checkmark
- ✅ Save button stores the key
- ✅ Modal closes properly

**Troubleshooting:**
- If validation fails: Check API key is correct and has credits
- If "Invalid API key" shows: Key may be incorrect or expired
- If timeout: Check internet connection

---

### Test 2: Basic Agent Node (Mock Mode) 🤖

**What it tests:** Agent nodes, properties panel, mock execution

**Steps:**
1. From the **Palette** (left sidebar), drag **Agent** onto the canvas
2. Click the agent node to select it
3. Properties panel opens on right
4. In the **Prompt** field, type: `"Write a haiku about coding"`
5. Verify **Mode** is set to **Mock** (default)
6. From palette, drag **Result** node onto canvas
7. Connect Agent → Result:
   - Hover over Agent node's **top edge** (source handle appears)
   - Drag from top of Agent to **bottom edge** of Result
   - Arrow should appear connecting them
8. Click the **Run** button (▶) in toolbar
9. Watch the console (bottom panel)

**Expected Results:**
- ✅ Agent node appears on canvas
- ✅ Properties panel shows agent settings
- ✅ Can type in prompt field
- ✅ Connection arrow appears between nodes
- ✅ Console shows: `🤖 Agent 1 (mock) ... [random string]`
- ✅ Execution completes with: `✅ Done.`
- ✅ No errors in console

**Troubleshooting:**
- If can't drag: Make sure you're dragging from the node item, not clicking
- If can't connect: Drag from top handle (source) to bottom handle (target)
- If nothing happens on Run: Check nodes are connected

---

### Test 3: Live Agent Execution with Streaming 🚀

**What it tests:** Real LLM API calls, streaming, cost tracking

**Steps:**
1. Clear canvas: Click **Clear** button in toolbar
2. Drag new **Agent** node onto canvas
3. Select the agent node
4. In properties panel:
   - **Name**: `"Poet"`
   - **Model**: Select `openai/gpt-4o-mini` from dropdown
   - **Mode**: Click **Live** radio button
   - **Streaming**: Check the checkbox
   - **Prompt**: `"Write a haiku about AI and creativity"`
5. Drag **Result** node onto canvas
6. Connect: Poet → Result
7. Click **Run** ▶
8. Watch the console closely

**Expected Results:**
- ✅ Node border turns **blue** and pulses (executing state)
- ✅ Console shows: `🤖 Poet: [streaming text appears character by character]`
- ✅ Text streams in real-time with cursor: `▌`
- ✅ When complete:
  - Full haiku visible
  - Cost displayed: `💰 Cost: $0.0003 | Tokens: 45` (approximate)
  - Node border turns **green** (completed)
- ✅ Console auto-scrolls to show latest output
- ✅ Total execution time: 2-5 seconds

**Troubleshooting:**
- If "Invalid OpenAI API key": Go back to Settings, re-enter key
- If "Rate limit exceeded": Wait 60 seconds and try again
- If no streaming: Verify streaming checkbox is checked
- If very slow: Network latency, normal for first request

---

### Test 4: Non-Streaming Execution 📝

**What it tests:** Non-streaming mode, different models

**Steps:**
1. Select the Poet agent node from Test 3
2. In properties panel:
   - **Streaming**: **Uncheck** the checkbox
   - **Model**: Change to `openai/gpt-4o` (more expensive model)
   - **Temperature**: Drag slider to `0.9` (more creative)
3. Click **Run** ▶
4. Observe different behavior

**Expected Results:**
- ✅ No streaming cursor appears
- ✅ Console shows "waiting..." message
- ✅ After 2-3 seconds, full response appears at once
- ✅ Cost is higher: `💰 Cost: $0.002-0.004` (gpt-4o is more expensive)
- ✅ Response may be more creative (temperature 0.9)

**Troubleshooting:**
- Higher cost is expected for gpt-4o vs gpt-4o-mini
- If timeout: Model may be busy, retry

---

### Test 5: Document Upload (Text File) 📄

**What it tests:** Document node, file upload, text extraction

**Steps:**
1. Create a test file on your computer:
   - Create file named `test.txt`
   - Content: `"This is a test document. It contains multiple sentences. We will use this to test document processing."`
2. Clear canvas
3. Drag **Document** node onto canvas
4. Select document node
5. In properties panel:
   - Click **Choose File** button
   - Select your `test.txt` file
   - Wait for upload
6. Observe the node and properties

**Expected Results:**
- ✅ Node shows filename: `test.txt`
- ✅ Node shows size: `~0.1 KB`
- ✅ Properties show:
  - File name
  - File type: TXT
  - Size in KB
  - Character count
  - Content preview (scrollable)
- ✅ Preview shows: `"This is a test document..."`

**Troubleshooting:**
- If upload fails: Check file size (should be < 10MB)
- If no preview: Refresh page and try again

---

### Test 6: Document Upload (PDF) 📑

**What it tests:** PDF text extraction with pdf-parse

**Steps:**
1. Find or create a simple PDF file
   - Can use: Any PDF with text content (not just images)
   - Or create one by printing a web page to PDF
2. Clear canvas (or use new document node)
3. Drag **Document** node onto canvas
4. Select it
5. Upload your PDF file
6. Wait 2-5 seconds for extraction

**Expected Results:**
- ✅ Node shows PDF filename
- ✅ Node shows size
- ✅ Node shows character count (may be large)
- ✅ Properties show extracted text in preview
- ✅ Text is readable (not garbled)
- ✅ Multi-page PDFs: all pages extracted

**Troubleshooting:**
- If extraction fails: Try a different PDF (some PDFs have image-only text)
- If takes long time: Large PDFs (>100 pages) may take 10-30 seconds
- If garbled text: PDF may have special encoding

---

### Test 7: Document → Agent Workflow 🔗

**What it tests:** Document content flowing to agents, context injection

**Steps:**
1. Use the document node from Test 5 or 6 (with uploaded file)
2. Drag **Agent** node onto canvas
3. Connect: Document → Agent (document's top to agent's bottom)
4. Select agent node, configure:
   - **Model**: `openai/gpt-4o-mini`
   - **Mode**: Live
   - **Prompt**: `"Summarize the above document in one sentence."`
5. Drag **Result** node
6. Connect: Agent → Result
7. Click **Run** ▶

**Expected Results:**
- ✅ Console shows:
  - `📄 Document: test.txt (XXX chars)`
  - `🤖 Agent: [waiting...]`
  - `🤖 Agent: [summary of your document content]`
  - `💰 Cost: $0.00XX | Tokens: XX`
  - `📦 Final: [the summary]`
- ✅ Summary is relevant to document content
- ✅ Node borders: Blue (executing) → Green (completed)
- ✅ Execution completes successfully

**Troubleshooting:**
- If summary is generic: Document content may not be passing - check connection
- If "Context too long": Document is very large, cost may be high
- If agent ignores document: Verify connection exists (arrow visible)

---

### Test 8: Document Chunking 📚

**What it tests:** Chunker node, fixed and semantic chunking

**Steps:**
1. Use existing document node (from Test 7) or upload new file
2. Drag **Chunker** node onto canvas
3. Connect: Document → Chunker
4. Select chunker node, configure:
   - **Strategy**: Fixed
   - **Chunk Size**: 100
   - **Overlap**: 20
5. Drag **Result** node
6. Connect: Chunker → Result
7. Click **Run** ▶

**Expected Results:**
- ✅ Console shows: `📑 Chunker: Created X chunks`
- ✅ Result shows chunks separated by `---CHUNK---`
- ✅ Each chunk is approximately 100 characters
- ✅ Chunks overlap by ~20 characters
- ✅ Chunker node shows: `"X chunks"` on canvas

**Steps for Semantic:**
1. Select chunker node
2. Change **Strategy** to **Semantic**
3. **Chunk Size**: 200
4. Click **Run** ▶

**Expected Results:**
- ✅ Chunks split at sentence boundaries
- ✅ No sentences cut in middle
- ✅ Chunks are closer to 200 chars (but may vary)

---

### Test 9: Complex RAG Workflow 🧠

**What it tests:** Multi-node workflow, document chunking + LLM

**Steps:**
1. Clear canvas
2. Build workflow:
   ```
   Document → Chunker → Agent → Result
   ```
3. Configure:
   - **Document**: Upload a longer text file (500+ words)
   - **Chunker**:
     - Strategy: Semantic
     - Chunk Size: 300
     - Overlap: 50
   - **Agent**:
     - Model: `openai/gpt-4o-mini`
     - Mode: Live
     - Streaming: On
     - Prompt: `"Based on the chunks above, what are the main topics discussed?"`
4. Click **Run** ▶
5. Watch full execution flow

**Expected Results:**
- ✅ Nodes execute in order (left to right)
- ✅ Each node's border:
  - Gray → Blue (executing) → Green (completed)
- ✅ Console shows:
  1. `📄 Document: [filename]`
  2. `📑 Chunker: Created X chunks`
  3. `🤖 Agent: [streaming analysis...]`
  4. `💰 Cost: $0.00XX`
  5. `📦 Final: [analysis]`
- ✅ Agent's response mentions topics from your document
- ✅ Total time: 3-10 seconds depending on document size

---

### Test 10: Multiple Providers 🌐

**What it tests:** Switching between providers, cost comparison

**Steps:**
1. If you have multiple API keys, configure them in Settings:
   - OpenAI
   - Anthropic (optional)
   - Google AI (optional)
2. Clear canvas
3. Create 3 agent nodes side by side
4. Configure each with same prompt but different models:
   - **Agent 1**:
     - Model: `openai/gpt-4o-mini`
     - Prompt: `"What is the meaning of life?"`
   - **Agent 2**:
     - Model: `anthropic/claude-haiku-4`
     - Prompt: `"What is the meaning of life?"`
   - **Agent 3**:
     - Model: `google/gemini-1.5-flash`
     - Prompt: `"What is the meaning of life?"`
5. Set all to Live mode
6. Create 3 Result nodes, connect each agent to its result
7. Click **Run** ▶

**Expected Results:**
- ✅ All three agents execute (may be sequential due to topological sort)
- ✅ Console shows different provider responses
- ✅ Cost varies by provider:
  - OpenAI gpt-4o-mini: ~$0.0003
  - Anthropic claude-haiku-4: ~$0.0005
  - Google gemini-flash: ~$0.0001 (cheapest)
- ✅ Responses have different styles/content
- ✅ All complete successfully

**Troubleshooting:**
- If one provider fails: Check that specific API key
- Sequential execution is expected (workflow runs in topological order)

---

### Test 11: Streaming Auto-Scroll 📜

**What it tests:** Console auto-scroll behavior

**Steps:**
1. Create agent with very long output:
   - Model: `openai/gpt-4o`
   - Streaming: On
   - Prompt: `"Write a 500-word essay about the future of AI"`
2. Click **Run** ▶
3. As text streams:
   - Observe console scrolling automatically
   - Manually scroll UP in console (while still streaming)
   - Observe auto-scroll stops
   - Scroll back to BOTTOM
   - Observe auto-scroll resumes

**Expected Results:**
- ✅ Console auto-scrolls during streaming
- ✅ Scrolling up disables auto-scroll
- ✅ Scrolling to bottom re-enables auto-scroll
- ✅ Never lose sight of streaming text
- ✅ Long output (500 words) renders completely

---

### Test 12: Error Handling - Invalid API Key ❌

**What it tests:** Error states, error messages

**Steps:**
1. Open Settings
2. Change OpenAI API key to invalid value: `sk-invalid123`
3. Save and close
4. Create agent node:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Prompt: `"Test"`
5. Connect to Result
6. Click **Run** ▶

**Expected Results:**
- ✅ Node border turns **red** (error state)
- ✅ Console shows: `❌ [node-id]: Invalid OpenAI API key. Please check your API key and try again.`
- ✅ Execution stops (doesn't continue to result)
- ✅ Error message is clear and actionable

**Troubleshooting:**
- Remember to fix your API key in Settings afterward!

---

### Test 13: Error Handling - Network Error 🔌

**What it tests:** Network error handling

**Steps:**
1. Disconnect from internet (WiFi off) OR use invalid model
2. Create agent node:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
3. Click **Run** ▶

**Expected Results:**
- ✅ Red error border on node
- ✅ Console shows network error message
- ✅ Execution stops gracefully

**Troubleshooting:**
- Reconnect to internet when done
- If using invalid model, change back to valid one

---

### Test 14: Visual States - Execution Progress 🎨

**What it tests:** Node execution state visualization

**Steps:**
1. Create workflow: `Prompt → Agent (Live, Streaming) → Result`
2. Configure agent with longer response:
   - Prompt: `"Count from 1 to 20 with explanations"`
3. Click **Run** ▶
4. Watch the nodes carefully

**Expected Results:**
- ✅ Before execution: All nodes have gray borders
- ✅ During execution:
  - Currently executing node: **Blue animated pulsing border**
  - Completed nodes: **Green solid border**
  - Waiting nodes: Gray border
- ✅ After execution: All nodes green
- ✅ Pulse animation is smooth and visible

---

### Test 15: Multiple Documents → One Agent 📚➡️🤖

**What it tests:** Multiple inputs to one node, context concatenation

**Steps:**
1. Clear canvas
2. Create two document nodes side by side
3. Upload different files to each:
   - Document 1: `file1.txt` with content: `"The sky is blue."`
   - Document 2: `file2.txt` with content: `"The grass is green."`
4. Create one Agent node
5. Connect **both** documents to the agent:
   - Document 1 → Agent
   - Document 2 → Agent
6. Configure agent:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Prompt: `"List all the colors mentioned in the documents."`
7. Connect Agent → Result
8. Click **Run** ▶

**Expected Results:**
- ✅ Both documents execute first
- ✅ Agent receives both documents' content
- ✅ Agent response mentions: "blue" and "green"
- ✅ Documents are separated with `---` in context
- ✅ Execution succeeds

---

### Test 16: Temperature Settings 🌡️

**What it tests:** Temperature parameter effects

**Steps:**
1. Create agent:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Prompt: `"Write a creative opening line for a story."`
2. Run 3 times with different temperatures:
   - **Temperature 0.0**: Click Run, note output
   - **Temperature 1.0**: Click Run, note output
   - **Temperature 2.0**: Click Run, note output

**Expected Results:**
- ✅ Temperature 0.0: Most deterministic, factual, similar on each run
- ✅ Temperature 1.0: Balanced creativity
- ✅ Temperature 2.0: Most creative, varied, potentially less coherent
- ✅ Outputs differ noticeably

---

### Test 17: Max Tokens Limit ✂️

**What it tests:** Max tokens parameter

**Steps:**
1. Create agent:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Streaming: On
   - Prompt: `"Write a 1000-word essay about space exploration."`
   - **Max Tokens**: `50` (very low)
2. Click **Run** ▶

**Expected Results:**
- ✅ Response cuts off mid-sentence after ~50 tokens (~35-40 words)
- ✅ Cost is lower than if no max tokens
- ✅ Token count shown: ~50-60 tokens (includes input)
- ✅ Streaming stops when limit reached

**Test with higher limit:**
1. Change **Max Tokens** to `500`
2. Run again

**Expected Results:**
- ✅ Much longer response (300-400 words)
- ✅ Higher cost
- ✅ Token count: ~500-600

---

### Test 18: Execution Controls - Pause and Resume ⏸️▶️

**What it tests:** Pause/resume functionality during workflow execution

**Steps:**
1. Clear canvas
2. Create a workflow with 4 agent nodes in sequence:
   ```
   Agent 1 → Agent 2 → Agent 3 → Agent 4 → Result
   ```
3. Configure all agents:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Streaming: On
   - Prompts: `"Count to 10 slowly"` (or similar delay-inducing prompts)
4. Click **Run** ▶
5. Watch first agent execute (blue pulsing border)
6. As soon as first agent completes (turns green), click **Pause** ⏸️ button
7. Observe execution state
8. Wait 3-5 seconds
9. Click **Resume** ▶️ button
10. Watch execution continue

**Expected Results:**
- ✅ Run button appears when workflow is idle
- ✅ After clicking Run:
  - Run button disappears
  - **Pause** and **Cancel** buttons appear
- ✅ After clicking Pause:
  - Current node completes execution (doesn't cut off mid-node)
  - Console shows: `⏸️ Execution paused`
  - Pause button disappears
  - **Resume** and **Cancel** buttons appear
  - Node borders remain in their current state (green for completed, gray for not started)
- ✅ After clicking Resume:
  - Console shows: `▶️ Execution resumed`
  - Resume button disappears
  - **Pause** and **Cancel** buttons reappear
  - Next node begins executing (blue pulsing border)
  - Execution continues through remaining nodes
- ✅ All nodes eventually complete (all green borders)

**Troubleshooting:**
- If pause happens mid-node: This is expected - pause waits for current node to finish
- If execution doesn't resume: Check console for errors, try clicking Resume again

---

### Test 19: Execution Controls - Cancel ❌

**What it tests:** Cancel/abort functionality during workflow execution

**Steps:**
1. Use the same 4-agent workflow from Test 18
2. Click **Run** ▶
3. Watch first agent start executing (blue border)
4. Click **Cancel** 🛑 button (appears next to Pause during execution)
5. Observe what happens

**Expected Results:**
- ✅ Console shows: `🛑 Execution cancelled`
- ✅ Execution stops immediately (doesn't continue to next node)
- ✅ All node borders reset to gray (idle state)
- ✅ Cancel and Pause buttons disappear
- ✅ Run button reappears
- ✅ Can click Run again to start fresh execution

**Test Cancel While Paused:**
1. Click **Run** ▶
2. After first node completes, click **Pause** ⏸️
3. While paused, click **Cancel** 🛑

**Expected Results:**
- ✅ Execution cancelled from paused state
- ✅ All nodes reset to gray
- ✅ Console shows cancellation message
- ✅ Run button reappears

**Troubleshooting:**
- Cancellation is irreversible - you'll need to run from start again
- If nodes don't reset: Refresh page and try again

---

### Test 20: Error Recovery - Retry ♻️

**What it tests:** Error dialog and retry functionality

**Steps:**
1. Open Settings
2. Set OpenAI API key to invalid: `sk-invalid-test-key-12345`
3. Click Save and close
4. Clear canvas
5. Create simple workflow:
   ```
   Agent 1 → Agent 2 → Result
   ```
6. Configure Agent 1:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Prompt: `"Say hello"`
7. Configure Agent 2:
   - Model: `openai/gpt-4o-mini`
   - Mode: Live
   - Prompt: `"Say goodbye"`
8. Click **Run** ▶
9. Wait for error dialog to appear
10. Observe the error dialog content
11. Keep dialog open, go to Settings
12. Fix API key (enter valid key)
13. Save and close Settings
14. In error dialog, click **Retry** button

**Expected Results:**
- ✅ Error dialog appears showing:
  - ❌ Icon and "Execution Error" title
  - Node name: "Agent 1"
  - Error message: "Invalid OpenAI API key..."
  - Three buttons: **Retry**, **Skip**, **Abort**
- ✅ Node 1 has red border (error state)
- ✅ Console shows error message
- ✅ After fixing API key and clicking Retry:
  - Dialog closes
  - Node 1 resets to idle (gray border)
  - Node 1 re-executes with valid API key
  - Node 1 completes successfully (green border)
  - Agent 2 executes
  - Workflow completes successfully
- ✅ Console shows: `♻️ Retrying node: Agent 1`

**Troubleshooting:**
- Make sure to actually fix the API key before retrying
- If retry fails again: API key still invalid, check Settings

---

### Test 21: Error Recovery - Skip ⏭️

**What it tests:** Skip functionality to continue past errors

**Steps:**
1. Use the same workflow from Test 20
2. Ensure Agent 1 has invalid API key (will fail)
3. Ensure Agent 2 has valid API key (should succeed if reached)
4. Click **Run** ▶
5. When error dialog appears for Agent 1, click **Skip** button

**Expected Results:**
- ✅ Error dialog closes
- ✅ Console shows: `⏭️ Skipping node: Agent 1`
- ✅ Node 1 remains with red error border (not reset)
- ✅ Execution continues to Agent 2
- ✅ Agent 2 executes successfully (blue → green)
- ✅ Workflow completes with Agent 1 in error state, Agent 2 completed
- ✅ Result node receives output from Agent 2 only

**Use Case:**
Skip is useful when:
- One node in a workflow is non-critical
- You want to see results from other nodes despite one failure
- Testing workflows with partially broken components

---

### Test 22: Error Recovery - Abort 🛑

**What it tests:** Abort functionality from error dialog

**Steps:**
1. Use the same workflow from Test 20
2. Ensure Agent 1 has invalid API key
3. Click **Run** ▶
4. When error dialog appears, click **Abort** button

**Expected Results:**
- ✅ Error dialog closes
- ✅ Console shows: `🛑 Execution cancelled`
- ✅ All nodes reset to gray (idle state)
- ✅ Execution stops completely
- ✅ Run button reappears
- ✅ No further nodes execute

**Comparison:**
- **Abort** from error dialog = same as clicking **Cancel** button
- Both reset all nodes and stop execution
- Abort is just more convenient when error dialog is already open

---

### Test 23: Error Recovery - Multiple Errors 🔄

**What it tests:** Error handling with multiple failing nodes

**Steps:**
1. Configure Settings with invalid API key
2. Create workflow with 3 agents:
   ```
   Agent 1 → Agent 2 → Agent 3 → Result
   ```
3. All agents use the invalid API key
4. Click **Run** ▶
5. When error dialog appears for Agent 1, click **Skip**
6. When error dialog appears for Agent 2, click **Skip**
7. When error dialog appears for Agent 3, click **Retry**
8. Before clicking Retry, fix API key in Settings
9. Click **Retry** in the error dialog

**Expected Results:**
- ✅ Error dialog appears three times (once per failing node)
- ✅ After first skip: Agent 1 stays red, Agent 2 executes
- ✅ After second skip: Agent 2 stays red, Agent 3 executes
- ✅ After fixing key and retry: Agent 3 succeeds
- ✅ Final state:
  - Agent 1: Red (skipped)
  - Agent 2: Red (skipped)
  - Agent 3: Green (completed after retry)
- ✅ Console shows all recovery actions

**Learning:**
- You can mix retry/skip strategies in one workflow
- Skipped nodes remain in error state for debugging
- Retried nodes reset and re-execute fresh

---

## Performance Benchmarks

Document your results:

| Test | Expected Time | Expected Cost | Pass/Fail |
|------|---------------|---------------|-----------|
| Test 3 (Streaming) | 2-5s | ~$0.0003 | ⬜ |
| Test 4 (Non-streaming) | 2-3s | ~$0.002 | ⬜ |
| Test 5 (Text upload) | <1s | Free | ⬜ |
| Test 6 (PDF upload) | 2-5s | Free | ⬜ |
| Test 7 (Doc→Agent) | 3-6s | ~$0.001 | ⬜ |
| Test 8 (Chunking) | <1s | Free | ⬜ |
| Test 9 (RAG workflow) | 5-10s | ~$0.003 | ⬜ |

---

## Known Issues & Limitations

### Expected Behavior (Not Bugs):
- **Execution is sequential**: Nodes run one at a time (not parallel)
- **Cost accumulates**: Each run costs money (use mock mode for free testing)
- **Long documents**: May exceed context window (100k+ characters)
- **Streaming updates all logs**: Previous logs visible while new ones stream
- **Pause waits for node completion**: Pause stops after current node finishes (not mid-node)
- **Error recovery interrupts flow**: Error dialogs appear immediately and pause execution until user responds

### Browser Compatibility:
- **Tested**: Chrome, Firefox, Safari (latest)
- **localStorage required**: Incognito mode may not persist API keys

---

## Troubleshooting Guide

### Issue: "Settings won't save"
- **Cause**: localStorage disabled or incognito mode
- **Fix**: Use regular browser window, check browser settings

### Issue: "Streaming doesn't show"
- **Cause**: Streaming checkbox unchecked
- **Fix**: Select node → Properties → Check "Streaming"

### Issue: "Nodes won't connect"
- **Cause**: Dragging from wrong handle
- **Fix**: Drag from **top** (source) to **bottom** (target) of nodes

### Issue: "Expensive costs"
- **Cause**: Using gpt-4o or claude-sonnet-4 with long prompts
- **Fix**: Switch to gpt-4o-mini or use mock mode

### Issue: "No response from agent"
- **Cause**: API key invalid, network error, or rate limit
- **Fix**: Check Settings → Test key, wait if rate limited

### Issue: "Document preview is empty"
- **Cause**: PDF may have image-only text or special encoding
- **Fix**: Try different PDF or use text file

---

## Testing Checklist

Use this checklist to track your testing progress:

### Core Functionality
- [ ] Test 1: Settings & API Key Configuration
- [ ] Test 2: Basic Agent (Mock Mode)
- [ ] Test 3: Live Agent with Streaming
- [ ] Test 4: Non-Streaming Execution
- [ ] Test 5: Document Upload (Text)
- [ ] Test 6: Document Upload (PDF)
- [ ] Test 7: Document → Agent Workflow
- [ ] Test 8: Document Chunking

### Advanced Features
- [ ] Test 9: Complex RAG Workflow
- [ ] Test 10: Multiple Providers
- [ ] Test 11: Streaming Auto-Scroll
- [ ] Test 12: Error - Invalid API Key
- [ ] Test 13: Error - Network Error
- [ ] Test 14: Visual Execution States
- [ ] Test 15: Multiple Documents → Agent
- [ ] Test 16: Temperature Settings
- [ ] Test 17: Max Tokens Limit

### Execution Controls & Error Recovery
- [ ] Test 18: Execution Controls - Pause and Resume
- [ ] Test 19: Execution Controls - Cancel
- [ ] Test 20: Error Recovery - Retry
- [ ] Test 21: Error Recovery - Skip
- [ ] Test 22: Error Recovery - Abort
- [ ] Test 23: Error Recovery - Multiple Errors

### Edge Cases
- [ ] Large file upload (>5MB)
- [ ] Very long prompt (>1000 words)
- [ ] Multiple sequential runs
- [ ] Disconnecting/reconnecting nodes
- [ ] Deleting nodes mid-workflow
- [ ] Clearing canvas during execution
- [ ] Pausing execution immediately after starting
- [ ] Rapid pause/resume/cancel clicks
- [ ] Error recovery after network disconnection
- [ ] Multiple errors in parallel branches (if applicable)

---

## Reporting Issues

If you find bugs or unexpected behavior:

1. **Note the test number** where issue occurred
2. **Describe what happened** vs what was expected
3. **Check browser console** for errors (F12 → Console tab)
4. **Note any error messages** shown in app console
5. **Document steps to reproduce**

---

## Next Steps After Testing

Once testing is complete:

1. ✅ **If all tests pass**: Ready to merge to main
2. ⚠️ **If minor issues**: Document and continue
3. ❌ **If major issues**: Review implementation, fix critical bugs

**When ready to merge:**
```bash
git checkout main
git merge phase-1/foundation
git push origin main
```

---

**Happy Testing! 🚀**

For questions or issues, refer to:
- `PHASE1_COMPLETE.md` - Implementation summary
- `CLAUDE.md` - Architecture documentation
- `README.md` - Project overview
