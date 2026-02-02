# Phase 2B Testing Guide

This guide provides step-by-step instructions for manually testing all Phase 2B features: Router Execution, Loop Support, and Advanced Routing.

## Prerequisites

1. **Dev Server Running:** `pnpm dev` (should be at http://localhost:3000)
2. **API Keys Configured:** For LLM-based features, configure at least one provider's API key in Settings
3. **Clean State:** Start with a fresh canvas or use the provided test workflows

---

## Test 1: Basic Router Execution & Edge Filtering

**Feature:** Routers now control execution flow - only selected paths execute

### Steps

1. **Load Test Workflow:**
   - Click "Import" button
   - Select `test-router-edge-filtering.json`
   - You should see: Prompt → Router → two branches (Toxic/Safe paths)

2. **Test Toxic Path:**
   - Click on the Prompt node
   - In properties panel, change text to: `"This content is toxic and harmful"`
   - Click "Run" button
   - **Watch the execution:**
     - Router node should evaluate and select "Toxic Path"
     - Only the Toxic Handler agent should execute (green border)
     - Safe Handler agent should remain idle (gray border)
     - Result should only receive output from Toxic Handler

3. **Test Safe Path:**
   - Click on Prompt node again
   - Change text to: `"This is wonderful and positive content!"`
   - Click "Run" button
   - **Watch the execution:**
     - Router should select "Safe Path"
     - Only Safe Handler agent should execute
     - Toxic Handler should remain idle
     - Result should receive output from Safe Handler

### Expected Results

✅ **Console Logs:**
```
🚀 Executing 3 level(s) with parallel nodes...
📝 Input Prompt: [your input text]
🔀 Content Moderator: Routed to "Toxic Path"  (or "Safe Path")
🤖 Toxic Handler: [response]  (or Safe Handler)
📦 Final: [final output]
✅ Done.
```

✅ **Visual Feedback:**
- Selected path edges turn **green, bold, animated**
- Non-selected path edges turn **gray, thin, dimmed (30% opacity)**
- Only nodes on selected path show green "completed" border
- Non-selected nodes remain gray "idle"

### Troubleshooting

❌ **Both agents execute:** Edge filtering not working - check console for errors
❌ **No visual highlighting:** setEdges not passed to runParallel - check app/page.tsx
❌ **Router doesn't execute:** Check route conditions in router properties

---

## Test 2: Visual Path Highlighting

**Feature:** Clear visual feedback shows which execution path was taken

### Steps

1. **Create Multi-Branch Router:**
   - Start fresh canvas
   - Add: Prompt → Router → 3 branches → 3 different agents → Result
   - Configure router with 3 routes (e.g., "urgent", "normal", "low")

2. **Configure Routes:**
   - Route 1: keyword "urgent" → Route 1
   - Route 2: keyword "normal" → Route 2
   - Route 3: (default route)

3. **Test Each Path:**
   - Run with input containing "urgent" - watch Route 1 turn green
   - Run with input containing "normal" - watch Route 2 turn green
   - Run with neither keyword - watch Route 3 (default) turn green

### Expected Results

✅ **Edge Styling:**
- Active edges: `stroke: #22c55e` (green), `strokeWidth: 2`, animated
- Inactive edges: `stroke: #e5e7eb` (gray), `strokeWidth: 1`, `opacity: 0.3`

✅ **Multiple Runs:**
- Edge styles reset between runs
- Previous highlights cleared before new execution
- New path highlighted correctly each time

### Troubleshooting

❌ **No highlighting:** Check browser console for React Flow errors
❌ **Wrong edges highlighted:** Check sourceHandle matches route ID
❌ **Styles don't reset:** Refresh page and try again

---

## Test 3: Default Route Handling

**Feature:** Routers fallback to default route when no routes match

### Steps

1. **Load Default Route Test:**
   - Import `test-default-route.json`
   - You should see 3 routes: Toxic, Safe, Default

2. **Test No Match → Default:**
   - Input text that matches neither "toxic" nor "safe"
   - Example: `"This is completely neutral content about weather."`
   - Click "Run"
   - **Expected:** Routes to Default Handler
   - **Console should show:** `⚠️ Content Moderator: Using default route (no matches)`

3. **Test With Default Route Removed:**
   - Select Router node
   - In properties, clear the "Default Route" selection
   - Run with neutral input again
   - **Expected:** Error thrown with message: `"Router: No route matched and no default route configured..."`

### Expected Results

✅ **With Default Route:**
- Neutral input routes to default path
- Console shows ⚠️ warning prefix
- Default path edges highlighted green
- Other paths remain gray

✅ **Without Default Route:**
- Execution stops with clear error message
- Error dialog shows router name and helpful guidance
- Suggests either adding default route or adjusting conditions

### Troubleshooting

❌ **Default route doesn't work:** Check executedRoute is set to 'default' string
❌ **No error when expected:** Check default route field is actually empty
❌ **Wrong route selected:** Verify route conditions don't accidentally match

---

## Test 4: Basic Loop Execution

**Feature:** Iterative workflows that execute nodes multiple times

### Steps

1. **Load Loop Test:**
   - Import `test-loop-workflow.json`
   - You should see: Prompt → Loop → Agent → (back to Loop) → Result

2. **Verify Loop Configuration:**
   - Click Loop node
   - Properties should show:
     - Max Iterations: 5
     - Break Condition: Always
     - Current Iteration: 0

3. **Run the Loop:**
   - Click "Run" button
   - **Watch closely:**
     - Loop node should show "1/5", "2/5", "3/5", "4/5", "5/5"
     - Agent executes 5 times (check console logs)
     - After iteration 5, loop exits
     - Result receives final output

### Expected Results

✅ **Console Logs:**
```
🚀 Executing...
🔁 Counter Loop: Iteration 1 - Continuing
🤖 Counter Agent: [response 1]
🔁 Counter Loop: Iteration 2 - Continuing
🤖 Counter Agent: [response 2]
...
🔁 Counter Loop: Iteration 5 - Exiting (max iterations reached)
📦 Final: [final output]
✅ Done.
```

✅ **Visual Feedback:**
- Loop node counter increments: 0/5 → 1/5 → 2/5 → 3/5 → 4/5 → 5/5
- During iterations: "Continue" edge (left) is green/active
- After exit: "Exit" edge (bottom) is green/active
- Agent node executes multiple times (border flashes green 5 times)

### Troubleshooting

❌ **Loop only runs once:** Check continue edge is connected back to earlier node
❌ **Infinite loop:** Check global iteration limit (should stop at 1000)
❌ **Counter doesn't update:** Check loop execution case in parallel-runner.ts
❌ **Agent doesn't re-execute:** Check executedNodes Set is cleared for loop body

---

## Test 5: Loop Break Conditions

**Feature:** Loops can exit early based on keyword or LLM evaluation

### Test 5A: Keyword Break

1. **Create Keyword Break Loop:**
   - Fresh canvas
   - Add: Prompt → Loop → Agent → (back to Loop) → Result
   - Configure Loop:
     - Max Iterations: 10
     - Break Condition: Keyword
     - Keywords: `COMPLETE, DONE, FINISHED`
     - Case Sensitive: No

2. **Configure Agent:**
   - Set agent to respond with "COMPLETE" after a few iterations
   - Or use mock mode and manually check output

3. **Run and Observe:**
   - Loop should exit early when agent output contains "COMPLETE"
   - Console should show: `🔁 Loop: Exiting (break condition met)`
   - Iteration count should be less than max (e.g., 3/10)

### Test 5B: LLM Judge Break

1. **Create LLM Judge Break:**
   - Same loop structure as above
   - Configure Loop:
     - Break Condition: LLM Judge
     - LLM Prompt: `"Evaluate if the quality is good enough to exit the loop. Respond with BREAK or CONTINUE."`
     - Model: Select any available model (e.g., `openai/gpt-4o-mini`)

2. **Configure API Key:**
   - Click Settings
   - Add API key for chosen provider
   - Save

3. **Run and Observe:**
   - Loop calls LLM on each iteration
   - LLM decides when to break
   - Console shows LLM cost and decision
   - Loop exits when LLM says "BREAK"

### Expected Results

✅ **Keyword Break:**
- Loop exits as soon as keyword is found (case-insensitive)
- Console shows: `🔁 Loop: Exiting (break condition met)`
- Iteration count stops mid-loop

✅ **LLM Judge Break:**
- LLM is called each iteration
- Cost tracked and logged
- Loop exits when LLM responds with "BREAK"
- Decision logged: `💰 LLM Judge: BREAK/CONTINUE | Cost: $X.XXXXXX`

### Troubleshooting

❌ **Keyword break doesn't work:** Check keyword is actually in agent output (view console)
❌ **LLM judge fails:** Check API key is configured and valid
❌ **Break never happens:** Check break condition evaluation in loop-evaluator.ts
❌ **Expensive LLM calls:** Switch to cheaper model (gpt-4o-mini, claude-haiku-4)

---

## Test 6: LLM-as-Judge Routing

**Feature:** Complex routing decisions using LLM classification

### Steps

1. **Create LLM Judge Router:**
   - Fresh canvas
   - Add: Prompt → Router → 3 branches → 3 agents → Result

2. **Configure Router:**
   - Strategy: LLM Judge
   - Judge Model: `openai/gpt-4o-mini` (or your preferred provider)
   - Create 3 routes:
     - **Route 1:** Label "bug", Judge Prompt: "Is this a bug report?"
     - **Route 2:** Label "feature", Judge Prompt: "Is this a feature request?"
     - **Route 3:** Label "question", Judge Prompt: "Is this a general question?"

3. **Test Bug Report:**
   - Input: `"The app crashes when I click the save button"`
   - Run workflow
   - **Expected:** Routes to "bug" path
   - **Console:** Shows LLM cost and decision

4. **Test Feature Request:**
   - Input: `"It would be great to add dark mode support"`
   - Run workflow
   - **Expected:** Routes to "feature" path

5. **Test Question:**
   - Input: `"How do I export my workflow to JSON?"`
   - Run workflow
   - **Expected:** Routes to "question" path

### Expected Results

✅ **Console Logs:**
```
🔀 Feedback Router: Routed to "bug"
💰 LLM Judge Decision: bug | Cost: $0.000123 | Tokens: 45
```

✅ **Routing Accuracy:**
- Bug reports route to bug path
- Feature requests route to feature path
- Questions route to question path
- Costs are tracked and reasonable (< $0.001 per route)

✅ **Error Handling:**
- Invalid API key → clear error message
- Provider unavailable → graceful fallback to default route
- Network error → error logged, execution stops

### Troubleshooting

❌ **Wrong route selected:** LLM might be confused - refine judge prompts
❌ **High costs:** Switch to cheaper model or use keyword routing
❌ **API errors:** Verify API key and provider availability
❌ **No decision logged:** Check onLLMJudgeResult callback in parallel-runner.ts

---

## Test 7: JSON-Field Routing

**Feature:** Route based on structured data from JSON fields

### Steps

1. **Create JSON Router:**
   - Fresh canvas
   - Add: Prompt → Router → 3 branches → 3 agents → Result

2. **Configure Router:**
   - Strategy: JSON Field
   - Create 3 routes:
     - **Route 1:** Field "priority", Operator "equals", Value "high"
     - **Route 2:** Field "priority", Operator "equals", Value "medium"
     - **Route 3:** (default route for "low" priority)

3. **Test High Priority:**
   - Input: `{"priority": "high", "message": "Critical system failure"}`
   - Run workflow
   - **Expected:** Routes to Route 1 (high priority path)

4. **Test Nested Field Access:**
   - Change Route 1 field to: `data.user.role`
   - Input: `{"data": {"user": {"role": "admin", "name": "Alice"}}}`
   - **Expected:** Routes correctly using nested field

5. **Test Numeric Comparison:**
   - Create route with Field "score", Operator "gt", Value "80"
   - Input: `{"score": 95, "status": "pass"}`
   - **Expected:** Routes to high-score path (95 > 80)

6. **Test Invalid JSON:**
   - Input: `This is not valid JSON`
   - Run workflow
   - **Expected:** Router logs error, falls back to default route

### Expected Results

✅ **String Comparison (equals/contains):**
- Case-insensitive matching
- Exact match for "equals"
- Substring match for "contains"

✅ **Numeric Comparison (gt/lt):**
- Numeric values compared correctly
- String values return false for numeric operators

✅ **Nested Fields:**
- Dot notation works: `user.name`, `data.items.0.price`
- Invalid paths return false (no error thrown)

✅ **Error Handling:**
- Invalid JSON → console.error, returns false, uses default route
- Missing field → returns false gracefully
- Wrong type for operator → returns false

### Troubleshooting

❌ **Route not matching:** Check JSON is valid (use online validator)
❌ **Nested field not working:** Verify field path exactly matches JSON structure
❌ **Numeric comparison fails:** Ensure value is actually numeric in JSON
❌ **Case sensitivity issues:** All string comparisons are case-insensitive by design

---

## Test 8: Complex Workflow - Routers + Loops Combined

**Feature:** Routers and loops work together in complex workflows

### Steps

1. **Create Research Loop with Quality Router:**
   ```
   Topic → Loop (max 5) → Research Agent → Quality Router
                ↑                              ↓ ↓
                |                            good bad
                |                              ↓  ↓
                └──────────────────────────continue
                                               ↓
                                             exit → Result
   ```

2. **Configure Quality Router:**
   - Strategy: Keyword or LLM Judge
   - Route 1: "good" (high quality) → exit edge of loop
   - Route 2: "bad" (low quality) → continue edge of loop

3. **Configure Loop:**
   - Max Iterations: 5
   - Break Condition: Always (router controls exit)
   - Connect continue edge back to Research Agent

4. **Run and Observe:**
   - Research agent generates content
   - Router evaluates quality
   - If good: exits loop early
   - If bad: continues loop (up to 5 times)
   - Result shows final high-quality output

### Expected Results

✅ **Early Exit:**
- If quality is good on iteration 2, loop exits at 2/5
- Console shows router decision before loop exit

✅ **Max Iterations:**
- If quality never reaches "good", exits at 5/5
- Result still receives final output

✅ **Combined Visual Feedback:**
- Loop iteration counter updates
- Router path highlighting works
- Both continue and exit edges highlight appropriately

### Troubleshooting

❌ **Loop never exits:** Check router routes connect to loop exit edge
❌ **Loop exits immediately:** Check router default route doesn't go to exit
❌ **Confusing execution:** Use simpler workflow first, then add complexity

---

## Test 9: Multiple Sequential Routers

**Feature:** Router chains for multi-stage decision trees

### Steps

1. **Create Router Chain:**
   ```
   Input → Router 1 (category) → [support/sales/technical]
                                         ↓
                                   Router 2 (priority)
                                         ↓
                                   [high/medium/low]
                                         ↓
                                      Result
   ```

2. **Configure Router 1:**
   - Route 1: "support" keyword
   - Route 2: "sales" keyword
   - Route 3: "technical" keyword

3. **Configure Router 2:**
   - Route 1: "urgent" keyword
   - Route 2: "important" keyword
   - Route 3: (default for normal)

4. **Test Multi-Stage:**
   - Input: `"I need urgent technical support"`
   - **Expected:** Routes through technical → high priority
   - Both routers should execute
   - Final path should be highlighted end-to-end

### Expected Results

✅ **Sequential Execution:**
- Router 1 executes first, selects path
- Only selected branch from Router 1 executes
- Router 2 executes within selected branch
- Final path is combination of both decisions

✅ **Visual Feedback:**
- Complete path from input to result is green
- All non-selected branches are gray
- Clear visual trail through the workflow

---

## Test 10: Performance & Safety

**Feature:** Global iteration limit prevents infinite loops

### Steps

1. **Test Global Iteration Limit:**
   - Create loop with Max Iterations: 100
   - Break Condition: Always (no early exit)
   - Run workflow
   - **Expected:** Execution stops at 1000 total iterations
   - **Console:** `❌ Global iteration limit exceeded (1000). This likely indicates an infinite loop.`

2. **Test Execution Controls with Loops:**
   - Create loop with Max Iterations: 10
   - Click "Run"
   - Immediately click "Pause"
   - **Expected:** Execution pauses after current node
   - Click "Resume" - execution continues
   - Click "Cancel" - execution stops, all nodes reset to idle

### Expected Results

✅ **Safety:**
- Global limit prevents browser freeze
- Clear error message when limit hit
- Execution state properly reset

✅ **Controls:**
- Pause works mid-loop
- Resume continues from same iteration
- Cancel properly resets loop counters

---

## General Testing Tips

### What to Watch For

1. **Console Logs:**
   - Every node execution logged with emoji prefix
   - Router decisions clearly indicated
   - Loop iterations numbered
   - Costs shown for LLM calls
   - Errors have clear messages

2. **Visual Feedback:**
   - Node borders: gray (idle) → blue (executing) → green (completed)
   - Edge colors: green (active) vs gray (inactive)
   - Edge animation: animated (active) vs static (inactive)
   - Loop iteration counter updates in real-time

3. **Performance:**
   - Workflows execute smoothly (no lag)
   - Edge highlighting updates immediately
   - No memory leaks (check browser DevTools)

### Common Issues

**Router doesn't branch:**
- Check sourceHandle on edges matches route IDs
- Verify executedRoute is set in router node data
- Ensure getActiveEdges() is filtering correctly

**Loop doesn't iterate:**
- Check continue edge connects back to earlier node
- Verify executedNodes Set is cleared for loop body
- Ensure shouldContinue flag is set correctly

**Visual feedback missing:**
- Check setEdges is passed to runParallel()
- Verify React Flow version is compatible
- Clear browser cache and reload

**Execution stuck:**
- Check for cycles without loop nodes
- Verify global iteration limit is enforced
- Use Cancel button to reset

### Browser DevTools Tips

Open Chrome DevTools (F12) and check:

1. **Console Tab:**
   - Workflow execution logs
   - Error messages
   - Cost tracking

2. **Network Tab:**
   - LLM API calls (for LLM-judge features)
   - Response times
   - Error codes

3. **Performance Tab:**
   - Record during workflow execution
   - Check for long tasks or memory leaks
   - Verify smooth 60fps rendering

---

## Success Criteria

After completing all tests, you should have verified:

- ✅ Routers control execution flow (edge filtering)
- ✅ Visual path highlighting is clear and correct
- ✅ Default routes work as expected
- ✅ Loops execute correct number of iterations
- ✅ Break conditions (keyword, LLM) work
- ✅ LLM-as-Judge routing classifies correctly
- ✅ JSON-field routing handles structured data
- ✅ Complex workflows (routers + loops) work
- ✅ Safety limits prevent infinite loops
- ✅ Execution controls work during loops

---

## Reporting Issues

If you find bugs during testing:

1. **Note exact steps to reproduce**
2. **Check browser console for errors**
3. **Export workflow as JSON for reference**
4. **Record expected vs actual behavior**
5. **Open GitHub issue with details**

Happy testing! 🧪
