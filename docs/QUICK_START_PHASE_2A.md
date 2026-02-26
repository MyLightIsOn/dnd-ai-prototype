# Quick Start: Phase 2A Testing

**Goal:** Get Phase 2A features running in under 10 minutes

---

## Prerequisites

✅ Phase 1 complete (multi-provider support, document processing)
✅ Development environment set up (`pnpm install` already run)
✅ Optional: API keys configured for live mode testing

---

## Step 1: Verify Build (2 minutes)

```bash
# Navigate to project directory
cd /Users/lawrence/dev/dnd-ai-prototype

# Type check
pnpm typecheck
# Expected: No errors

# Start dev server
pnpm dev
# Expected: Server starts on localhost:3000
```

**If errors occur:** Check implementation summary for troubleshooting.

---

## Step 2: First Test - Parallel Execution (3 minutes)

**Goal:** See two agents execute simultaneously.

### Create Workflow:
1. Open http://localhost:3000
2. Drag **Prompt** node from palette
3. Drag **Agent** node → name it "Agent 1"
4. Drag another **Agent** node → name it "Agent 2"
5. Drag **Result** node

### Connect:
```
Prompt → Agent 1 ──┐
      → Agent 2 ──┴→ Result
```

### Configure:
- Prompt: Any text (e.g., "Test parallel execution")
- Agent 1: Mock mode, prompt: "Analyze this from perspective 1"
- Agent 2: Mock mode, prompt: "Analyze this from perspective 2"

### Run:
1. Click "▶ Run"
2. **Watch for:** Both agents show blue pulsing borders **at the same time**
3. **Console should show:** "⚡ Executing 2 nodes in parallel..."

**✅ Success:** Both agents animate simultaneously, not one after the other.

---

## Step 3: Test Memory (2 minutes)

**Goal:** See one agent write to memory, another read from it.

### Create Workflow:
```
Agent 1 → Memory → Agent 2 → Result
```

### Configure:
- **Agent 1**:
  - Prompt: "Generate a random city name"
  - Write to memory: `cityName` (in properties panel, Memory section)

- **Memory node**: (no config needed, just for visualization)

- **Agent 2**:
  - Read from memory: `cityName`
  - Prompt: `Tell me about ${memory.cityName}`

### Run:
1. Click "▶ Run"
2. **Watch console for:**
   - "🧠 Memory manager initialized"
   - "💾 Agent 1: Wrote to memory key 'cityName'"
   - "📖 Agent 2: Reading from memory: cityName=..."
3. **Check Agent 2 output:** Should mention the actual city name, not the template

**✅ Success:** Agent 2's response contains the city name from Agent 1.

---

## Step 4: Test Human Review (2 minutes)

**Goal:** See execution pause for your approval.

### Create Workflow:
```
Agent → Human Review → Result
```

### Configure:
- **Agent**: Any prompt (mock mode)
- **Human Review**:
  - Review Mode: Approve/Reject
  - Required: Yes
  - Timeout: 0 (no timeout)

### Run:
1. Click "▶ Run"
2. **Wait for:** Modal appears with agent output
3. **Try:** Click "Approve"
4. **Observe:** Execution continues to Result

**✅ Success:** Modal pauses execution; clicking Approve continues workflow.

---

## Step 5: Test Router (3 minutes)

**Goal:** See routing based on keywords.

### Create Workflow:
```
Prompt → Router → Result 1 (for Route 1)
              → Result 2 (for Route 2)
```

### Configure Router:
- Strategy: Keyword
- **Route 1**:
  - Label: "Question"
  - Keywords: `what, how, why`
  - Match Mode: any
- **Route 2**:
  - Label: "Statement"
  - Keywords: `is, are, the`
  - Match Mode: any
- Default Route: Enabled

### Test:
1. Set Prompt text: "What is machine learning?"
2. Run → Verify Route 1 (Question) is highlighted green
3. Change Prompt: "Machine learning is awesome"
4. Run → Verify Route 2 (Statement) is highlighted

**✅ Success:** Router highlights different routes based on input keywords.

---

## Troubleshooting

### "TypeError: Cannot read property 'executionState' of undefined"
- **Cause:** Node data missing execution state field
- **Fix:** Clear workflow and recreate nodes (old cached nodes)

### "Parallel execution not working (nodes run sequentially)"
- **Cause:** Build issue or cache problem
- **Fix:** Stop server, run `pnpm build`, restart `pnpm dev`

### "Memory template not injecting"
- **Cause:** Incorrect syntax in prompt
- **Fix:** Use exact format: `${memory.keyName}` (case-sensitive)

### "Human review modal not appearing"
- **Cause:** State not passed correctly
- **Fix:** Check browser console for errors, refresh page

### Router node missing output handles
- **Cause:** Need to configure routes first
- **Fix:** Open properties panel, add at least one route

---

## Next Steps

After completing these 5 quick tests:

1. **Read Full Testing Guide:** `docs/PHASE_2A_TESTING_GUIDE.md`
   - 29 comprehensive test cases
   - Advanced scenarios
   - Integration tests

2. **Try Demo Workflows:** See `PHASE_2A_IMPLEMENTATION_SUMMARY.md`
   - 4 demo workflows showcasing all features
   - Real-world use cases

3. **Build Your Own:** Experiment with combinations
   - Parallel + Memory
   - Router + Human Review
   - All features together

4. **Report Issues:** If anything doesn't work as expected
   - Include test number
   - Steps to reproduce
   - Console errors
   - Screenshots

---

## Expected Console Output

Successful parallel execution:
```
🧠 Memory manager initialized
⚡ Executing 2 nodes in parallel...
🤖 Agent 1 (model) [MOCK]
🤖 Agent 2 (model) [MOCK]
✅ Done.
```

Successful memory flow:
```
🧠 Memory manager initialized
🤖 Agent 1 (model) [MOCK]
💾 Agent 1: Wrote to memory key "cityName"
🧠 Memory: 1 values stored (cityName)
📖 Agent 2: Reading from memory: cityName=Paris
🤖 Agent 2 (model) [MOCK]
✅ Done.
```

Successful human review:
```
🧠 Memory manager initialized
🤖 Agent (model) [MOCK]
⏸️ Waiting for human review...
✅ Human Review: Approved
📦 Final: ...
✅ Done.
```

---

## Success Metrics

After these 5 quick tests, you should have verified:
- ✅ Parallel execution works (nodes animate together)
- ✅ Memory read/write works (templates inject correctly)
- ✅ Human review pauses execution (modal appears)
- ✅ Router selects routes (visual feedback correct)
- ✅ All new nodes appear in palette

**Total Time:** ~10-15 minutes
**Tests Completed:** 5 basic tests
**Features Verified:** All 4 Phase 2A features

---

## What's Working vs. What's Not

### ✅ Implemented and Ready:
- Parallel execution engine
- Router node UI and configuration
- Memory system with template injection
- Human review with modal UI
- All nodes registered and draggable
- Properties panels for all new nodes
- Error recovery integration

### ⚠️ Not Yet Implemented:
- **Router execution logic:** Router nodes exist but don't actually route execution flow yet
  - Routing logic is written (`lib/execution/route-evaluator.ts`)
  - Integration with `lib/run.ts` execution flow needs to be completed
  - This is a future task (can be added after Phase 2A testing)

**Note:** You can still test router UI, configuration, and route evaluation logic manually. The visual feedback and route selection work; only the actual execution branching is pending.

---

## Ready to Go!

You're now ready to start testing Phase 2A. Begin with these 5 quick tests, then move to the comprehensive testing guide for advanced scenarios.

**Happy Testing! 🚀**
