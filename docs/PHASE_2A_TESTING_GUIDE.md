# Phase 2A Testing Guide

**Version:** 1.0
**Date:** 2026-01-22
**Scope:** Core Orchestration Features (Parallel Execution, Router, Memory, Human Review)

---

## Overview

This document provides step-by-step testing procedures for all Phase 2A features. Each test includes:
- **Purpose**: What the test verifies
- **Setup**: How to create the test workflow
- **Steps**: Detailed execution steps
- **Expected Results**: What should happen
- **Pass/Fail Criteria**: How to determine success

---

## Table of Contents

1. [Parallel Execution Tests](#1-parallel-execution-tests)
2. [Router Node Tests](#2-router-node-tests)
3. [Memory System Tests](#3-memory-system-tests)
4. [Human Review Tests](#4-human-review-tests)
5. [Integration Tests](#5-integration-tests)
6. [Error Recovery Tests](#6-error-recovery-tests)

---

## 1. Parallel Execution Tests

### Test 1.1: Basic Parallel Execution

**Purpose**: Verify that independent nodes execute simultaneously instead of sequentially.

**Setup**:
1. Create a new workflow
2. Add one Document node (or Prompt node)
3. Add two Agent nodes (Agent1 and Agent2)
4. Add one Result node
5. Connect: Document → Agent1 → Result
6. Connect: Document → Agent2 → Result

**Workflow Structure**:
```
Document
   ├─→ Agent1 ──┐
   └─→ Agent2 ──┴→ Result
```

**Agent Configuration**:
- Agent1: Mock mode, name "Parallel Agent 1"
- Agent2: Mock mode, name "Parallel Agent 2"

**Steps**:
1. Click "Run" button
2. Observe the node borders during execution
3. Watch the console logs

**Expected Results**:
- ✅ Both Agent1 and Agent2 show blue pulsing borders **simultaneously**
- ✅ Console shows: "⚡ Executing 2 nodes in parallel..."
- ✅ Both agent logs appear (order may vary)
- ✅ Result node executes after both agents complete
- ✅ Result receives outputs from both agents

**Pass Criteria**: Both agents execute at the same time (blue borders on both nodes simultaneously).

**Fail Indicators**:
- ❌ Agents execute one after another (only one blue border at a time)
- ❌ No "Executing N nodes in parallel" message in console

---

### Test 1.2: Deep Parallel Workflow

**Purpose**: Verify correct parallel execution across multiple levels.

**Setup**:
```
Level 0: Doc1, Doc2 (parallel)
Level 1: Agent1, Agent2, Agent3 (parallel - depend on Doc1/Doc2)
Level 2: Agent4, Agent5 (parallel - depend on Agent1/2/3)
Level 3: Result (depends on Agent4/5)
```

**Steps**:
1. Create workflow as described above
2. Run workflow
3. Observe execution levels

**Expected Results**:
- ✅ Level 0: Doc1 and Doc2 execute in parallel
- ✅ Level 1: All three agents execute in parallel after docs complete
- ✅ Level 2: Agent4 and Agent5 execute in parallel
- ✅ Level 3: Result executes after all levels complete
- ✅ Console shows multiple "⚡ Executing N nodes in parallel..." messages

**Pass Criteria**: Each level completes before next level starts; nodes within each level execute simultaneously.

---

### Test 1.3: Parallel Execution with Streaming

**Purpose**: Verify streaming works correctly with parallel agents.

**Setup**:
1. Obtain API keys for OpenAI or Anthropic
2. Configure provider in Settings
3. Create workflow: Document → Agent1 + Agent2 → Result
4. Configure both agents:
   - Mode: Live
   - Model: openai/gpt-4o-mini (or anthropic/claude-3-5-haiku-20241022)
   - Streaming: Enabled
   - Prompt: "Write a short poem about [different topic for each]"

**Steps**:
1. Run workflow
2. Watch console logs during streaming

**Expected Results**:
- ✅ Both agents show streaming cursors (▌) simultaneously
- ✅ Console logs interleave (Agent1 chunk, Agent2 chunk, Agent1 chunk, etc.)
- ✅ Both streaming completions finish successfully
- ✅ Final cost/token usage displayed for both agents

**Pass Criteria**: Streaming updates from both agents appear interleaved in console; both complete successfully.

---

### Test 1.4: Execution Controls During Parallel

#### Test 1.4a: Pause During Parallel Execution

**Setup**: Use same workflow as Test 1.1

**Steps**:
1. Click "Run"
2. While both agents show blue borders, click "Pause"
3. Observe behavior
4. Click "Resume"

**Expected Results**:
- ✅ Execution continues until current level completes
- ✅ Console shows: "⏸️ Execution paused" **after** both agents finish
- ✅ All nodes return to idle state (no blue borders)
- ✅ Clicking "Resume" shows: "▶️ Execution resumed"
- ✅ Execution continues to Result node

**Pass Criteria**: Pause waits for level to complete; Resume continues correctly.

#### Test 1.4b: Cancel During Parallel Execution

**Setup**: Use same workflow as Test 1.1

**Steps**:
1. Click "Run"
2. While agents are executing, click "Cancel"
3. Observe behavior

**Expected Results**:
- ✅ Console shows: "🛑 Execution cancelled"
- ✅ All nodes reset to idle state immediately
- ✅ No further execution occurs
- ✅ No error dialogs appear

**Pass Criteria**: Execution stops cleanly; all nodes reset to idle.

---

### Test 1.5: Error Handling in Parallel Branches

**Purpose**: Verify that one failing parallel node doesn't prevent others from completing.

**Setup**:
1. Create workflow: Document → Agent1 + Agent2 → Result
2. Configure Agent1: Live mode, no API key (to force error)
3. Configure Agent2: Mock mode (will succeed)

**Steps**:
1. Run workflow
2. Observe execution
3. When error dialog appears, note Agent2 state

**Expected Results**:
- ✅ Both agents start executing in parallel
- ✅ Agent2 completes successfully (shows green border)
- ✅ Agent1 fails (shows red border)
- ✅ Error dialog appears **after** Agent2 completes
- ✅ Error dialog shows Agent1's failure message
- ✅ Retry option re-executes **both** agents in the level
- ✅ Skip option continues to Result node

**Pass Criteria**: Successful nodes complete before error dialog appears; retry re-executes entire level.

---

## 2. Router Node Tests

### Test 2.1: Keyword Router - ANY Mode

**Purpose**: Verify keyword matching with "any" mode (OR logic).

**Setup**:
1. Add Prompt node with text: "I need urgent help with my account"
2. Add Router node
3. Configure Router:
   - Strategy: Keyword
   - Route 1: Label "Urgent", Keywords "urgent, emergency, asap", Match Mode "any"
   - Route 2: Label "Normal", Keywords "question, inquiry", Match Mode "any"
   - Default route: enabled
4. Add Result nodes for each route
5. Connect: Prompt → Router → (multiple Result nodes via different handles)

**Steps**:
1. Run workflow
2. Observe which route is executed
3. Change Prompt text to "I have a question"
4. Run again

**Expected Results**:
- ✅ First run: "Urgent" route selected (contains "urgent")
- ✅ Router node shows executed route in green
- ✅ Console logs: "Selected route: Urgent"
- ✅ Second run: "Normal" route selected (contains "question")

**Pass Criteria**: Correct route selected based on keyword presence; visual feedback clear.

---

### Test 2.2: Keyword Router - ALL Mode

**Purpose**: Verify keyword matching with "all" mode (AND logic).

**Setup**:
1. Similar to Test 2.1, but:
   - Route 1: Keywords "urgent, help, account", Match Mode "all"

**Steps**:
1. Test with text containing all keywords: "I need urgent help with my account"
2. Test with text missing one keyword: "I need urgent help"

**Expected Results**:
- ✅ First test: Route 1 selected (all keywords present)
- ✅ Second test: Default route selected (missing "account")

**Pass Criteria**: Route only triggers when ALL keywords are present.

---

### Test 2.3: Sentiment Router - Positive

**Purpose**: Verify sentiment detection for positive content.

**Setup**:
1. Add Prompt node with text: "This is amazing! I love it so much. Great work!"
2. Add Router node:
   - Strategy: Sentiment
   - Route 1: Label "Positive", Target Sentiment "positive"
   - Route 2: Label "Negative", Target Sentiment "negative"
   - Route 3: Label "Neutral", Target Sentiment "neutral"
3. Add Result nodes for each route

**Steps**:
1. Run workflow
2. Test with different sentiment texts:
   - Positive: "Excellent! This is wonderful. Thank you!"
   - Negative: "This is terrible. I hate it. Very disappointed."
   - Neutral: "The product arrived on Tuesday. It is blue."

**Expected Results**:
- ✅ Positive text → Positive route
- ✅ Negative text → Negative route
- ✅ Neutral text → Neutral route
- ✅ Console logs sentiment classification

**Pass Criteria**: Sentiment correctly classified for clearly positive/negative/neutral text.

---

### Test 2.4: Router Visual Feedback

**Purpose**: Verify visual indicators on router node.

**Setup**: Use any router workflow from above

**Steps**:
1. Run workflow
2. Observe router node after execution

**Expected Results**:
- ✅ Strategy badge displays (KEYWORD or SENTIMENT)
- ✅ Executed route highlighted in green
- ✅ Non-executed routes remain un-highlighted
- ✅ Output handles color-coded (executed route = green, others = blue)

**Pass Criteria**: Clear visual indication of which route was taken.

---

### Test 2.5: Default Route Fallback

**Purpose**: Verify default route triggers when no routes match.

**Setup**:
1. Router with keyword routes that won't match
2. Enable default route
3. Input text that matches no route

**Steps**:
1. Run workflow
2. Observe which route executes

**Expected Results**:
- ✅ Default route executes
- ✅ Console logs: "Selected route: Default"
- ✅ Default handle highlighted

**Pass Criteria**: Default route triggers when no other route matches.

---

## 3. Memory System Tests

### Test 3.1: Basic Memory Read/Write

**Purpose**: Verify agents can write to and read from memory.

**Setup**:
1. Create workflow: Agent1 → Memory → Agent2 → Result
2. Configure Agent1:
   - Name: "Username Generator"
   - Prompt: "Generate a random username (just the username, no explanation)"
   - Write to memory: "userName"
   - Mode: Mock (or Live)
3. Add Memory node (for visualization)
4. Configure Agent2:
   - Name: "Greeter"
   - Prompt: "Say hello to ${memory.userName} and welcome them to the platform"
   - Read from memory: "userName"
   - Mode: Mock (or Live)

**Steps**:
1. Run workflow
2. Observe console logs
3. Check Memory node display
4. Check Agent2 output

**Expected Results**:
- ✅ Console shows: "🧠 Memory manager initialized"
- ✅ Console shows: "💾 Username Generator: Wrote to memory key 'userName'"
- ✅ Memory node displays: Key "userName" with value
- ✅ Console shows: "📖 Greeter: Reading from memory: userName=<value>"
- ✅ Agent2's prompt contains the actual username (not the template)
- ✅ Result shows welcome message with correct username

**Pass Criteria**: Value written by Agent1 is correctly read and used by Agent2.

---

### Test 3.2: Multiple Memory Keys

**Purpose**: Verify multiple key-value pairs work correctly.

**Setup**:
1. Agent1 writes: "userName", "userAge", "userCity"
2. Agent2 reads all three keys
3. Agent2 prompt: "Write a bio for ${memory.userName}, age ${memory.userAge}, from ${memory.userCity}"

**Steps**:
1. Run workflow
2. Verify all keys stored
3. Verify all keys injected correctly

**Expected Results**:
- ✅ Memory node shows all three key-value pairs
- ✅ Agent2 logs show all three reads
- ✅ Agent2 prompt has all three values injected
- ✅ No template placeholders remain in prompt

**Pass Criteria**: All memory keys stored and retrieved correctly; all templates replaced.

---

### Test 3.3: Memory Persistence During Workflow

**Purpose**: Verify memory persists throughout workflow execution.

**Setup**:
```
Agent1 (writes "step1") → Agent2 (writes "step2") → Agent3 (reads both) → Result
```

**Steps**:
1. Run workflow
2. Check Agent3 receives both values

**Expected Results**:
- ✅ Agent3 successfully reads both "step1" and "step2"
- ✅ Memory node (if added) shows both keys
- ✅ Values persist from earlier in workflow

**Pass Criteria**: Memory values available to all downstream nodes.

---

### Test 3.4: Memory Reset Between Runs

**Purpose**: Verify memory clears between workflow executions.

**Setup**: Use workflow from Test 3.1

**Steps**:
1. Run workflow once (generates username "Alice")
2. Run workflow again (should generate new username "Bob")
3. Check that second run doesn't see "Alice"

**Expected Results**:
- ✅ Console shows: "🧠 Memory manager initialized" at start of each run
- ✅ Second run generates new username
- ✅ Second run doesn't have data from first run
- ✅ Memory starts empty on each execution

**Pass Criteria**: Each workflow run has fresh, empty memory.

---

### Test 3.5: Missing Memory Key

**Purpose**: Verify behavior when reading non-existent key.

**Setup**:
1. Agent reads from memory key "nonexistent"
2. Key was never written

**Steps**:
1. Run workflow
2. Check prompt after template injection

**Expected Results**:
- ✅ No error thrown
- ✅ Template placeholder preserved: `${memory.nonexistent}`
- ✅ Execution continues normally
- ✅ Console shows read attempt

**Pass Criteria**: Missing keys don't break execution; placeholder preserved.

---

## 4. Human Review Tests

### Test 4.1: Approve/Reject Mode - Approve

**Purpose**: Verify approval flow works correctly.

**Setup**:
1. Create workflow: Agent → HumanReview → Result
2. Configure HumanReview:
   - Review Mode: Approve/Reject
   - Required: true
   - Timeout: 0 (no timeout)
3. Configure Agent: Generate some content (mock or live)

**Steps**:
1. Click "Run"
2. Wait for review modal to appear
3. Read the content preview
4. Click "Approve"
5. Observe execution continues

**Expected Results**:
- ✅ Execution pauses at HumanReview node (blue pulsing border)
- ✅ Modal appears with content preview
- ✅ Modal shows "Approve" and "Reject" buttons
- ✅ Clicking "Approve" closes modal
- ✅ HumanReview node shows green border
- ✅ Decision badge shows "APPROVED" in green
- ✅ Execution continues to Result node
- ✅ Result receives original content (unchanged)
- ✅ Console logs: "✅ Human Review: Approved"

**Pass Criteria**: Content passes through to Result unchanged after approval.

---

### Test 4.2: Approve/Reject Mode - Reject

**Purpose**: Verify rejection flow triggers error recovery.

**Setup**: Same as Test 4.1

**Steps**:
1. Run workflow
2. When review modal appears, click "Reject"
3. Observe error dialog

**Expected Results**:
- ✅ Clicking "Reject" closes review modal
- ✅ HumanReview node shows red border (error state)
- ✅ Error dialog appears with rejection message
- ✅ Error dialog offers: Retry, Skip, Abort
- ✅ Retry: Shows review modal again
- ✅ Skip: Continues to Result (Result gets no input from HumanReview)
- ✅ Abort: Cancels entire workflow
- ✅ Console logs: "❌ Human Review: Rejected"

**Pass Criteria**: Rejection triggers error recovery; Retry shows modal again; Skip bypasses node.

---

### Test 4.3: Edit Mode

**Purpose**: Verify content can be modified before passing downstream.

**Setup**:
1. Create workflow: Agent1 → HumanReview → Agent2 → Result
2. Configure HumanReview:
   - Review Mode: Edit
   - Required: true
3. Agent1 generates: "Draft blog post content"
4. Agent2 prompt: "Improve this content: [input from HumanReview]"

**Steps**:
1. Run workflow
2. Review modal shows Agent1 output in **editable** textarea
3. Modify the text (add/remove/change content)
4. Click "Approve"
5. Check Agent2 input

**Expected Results**:
- ✅ Modal has textarea (not read-only preview)
- ✅ Can edit content in textarea
- ✅ Clicking "Approve" saves modifications
- ✅ HumanReview node shows decision: "EDITED"
- ✅ Agent2 receives **modified** content (not original)
- ✅ Original content stored in node data
- ✅ Modified content stored separately
- ✅ Console logs: "✏️ Human Review: Edited"

**Pass Criteria**: Modified content flows to downstream nodes; original preserved in node data.

---

### Test 4.4: Timeout - Auto Approval

**Purpose**: Verify timeout automatically approves after configured seconds.

**Setup**:
1. Configure HumanReview:
   - Timeout: 10 seconds

**Steps**:
1. Run workflow
2. When modal appears, **do nothing**
3. Watch countdown timer
4. Wait 10 seconds

**Expected Results**:
- ✅ Modal shows countdown: "10s"
- ✅ Countdown decrements every second: "9s", "8s", ...
- ✅ At "0s", modal auto-closes
- ✅ Content auto-approved
- ✅ Execution continues automatically
- ✅ Console logs: "⏱️ Human Review: Auto-approved (timeout)"

**Pass Criteria**: Workflow continues automatically after timeout; no manual action required.

---

### Test 4.5: Multiple Reviews in Workflow

**Purpose**: Verify multiple review nodes work independently.

**Setup**:
```
Agent1 → HumanReview1 → Agent2 → HumanReview2 → Result
```

**Steps**:
1. Run workflow
2. Approve first review
3. Approve second review

**Expected Results**:
- ✅ First review modal appears, waits for decision
- ✅ After approval, execution continues to Agent2
- ✅ Second review modal appears, waits for decision
- ✅ After approval, execution continues to Result
- ✅ Each review operates independently
- ✅ Both reviews show correct content

**Pass Criteria**: Multiple reviews work sequentially; each pauses execution correctly.

---

## 5. Integration Tests

### Test 5.1: Parallel + Memory

**Purpose**: Verify parallel agents can write to memory simultaneously.

**Setup**:
```
Document → Agent1 (writes "result1") ──┐
        → Agent2 (writes "result2") ──┴→ Memory → Agent3 (reads both) → Result
```

**Steps**:
1. Run workflow
2. Check that both memory writes succeed
3. Verify Agent3 reads both values

**Expected Results**:
- ✅ Agent1 and Agent2 execute in parallel
- ✅ Both write to memory successfully
- ✅ Memory shows both key-value pairs
- ✅ Agent3 reads both values correctly
- ✅ No race conditions or data loss

**Pass Criteria**: Parallel memory writes don't conflict; all data preserved.

---

### Test 5.2: Router + Memory

**Purpose**: Verify router can route based on memory values.

**Setup**:
1. Agent writes user type to memory: "premium" or "free"
2. Agent2 reads memory and includes in output: "User type: ${memory.userType}"
3. Router routes based on keyword "premium" or "free"

**Steps**:
1. Run with "premium" user
2. Verify premium route taken
3. Run with "free" user
4. Verify free route taken

**Expected Results**:
- ✅ Memory value correctly injected into Agent2 prompt
- ✅ Router correctly reads keyword from Agent2 output
- ✅ Correct route selected based on memory value

**Pass Criteria**: Memory values influence routing decisions.

---

### Test 5.3: Parallel + Router

**Purpose**: Verify router can have multiple parallel inputs.

**Setup**:
```
Document → Agent1 ──┐
        → Agent2 ──┴→ Router → [routes based on combined input]
```

**Steps**:
1. Run workflow
2. Check that router receives both inputs
3. Verify routing decision

**Expected Results**:
- ✅ Router waits for both parallel agents
- ✅ Router receives concatenated input from both
- ✅ Routing decision considers both inputs

**Pass Criteria**: Router correctly handles multiple parallel inputs.

---

### Test 5.4: Human Review + Memory

**Purpose**: Verify human review can write modified content to memory.

**Setup**:
1. Agent1 → HumanReview (edit mode, writes "reviewedContent") → Agent2 (reads "reviewedContent")

**Steps**:
1. Run workflow
2. Edit content in review modal
3. Approve
4. Check that Agent2 uses modified content

**Expected Results**:
- ✅ Modified content written to memory
- ✅ Agent2 reads modified version
- ✅ Original content not used

**Pass Criteria**: Edited content flows through memory to downstream agents.

---

### Test 5.5: All Features Combined

**Purpose**: Stress test with all Phase 2A features together.

**Setup**:
```
Document → Agent1 (parallel) ──┐
        → Agent2 (parallel) ──┴→ Router → [Positive Route] → HumanReview → Agent3 (uses memory) → Result
                                       → [Negative Route] → Agent4 → Result
```

Configure:
- Agent1 & Agent2: Write to memory
- Router: Sentiment-based
- HumanReview: Edit mode
- Agent3: Reads from memory

**Steps**:
1. Run with positive sentiment input
2. Verify all features work together

**Expected Results**:
- ✅ Parallel execution works
- ✅ Memory writes succeed
- ✅ Router selects correct path
- ✅ Human review pauses execution
- ✅ Memory reads work in Agent3
- ✅ Final result correct

**Pass Criteria**: All features work together without conflicts.

---

## 6. Error Recovery Tests

### Test 6.1: Retry Failed Parallel Node

**Purpose**: Verify retry during parallel execution.

**Setup**:
1. Document → Agent1 (will fail) + Agent2 (succeeds) → Result
2. Agent1: Live mode without API key

**Steps**:
1. Run workflow
2. Wait for error dialog
3. Click "Retry"

**Expected Results**:
- ✅ Error dialog shows Agent1 failure
- ✅ Clicking "Retry" re-executes **entire level** (both Agent1 and Agent2)
- ✅ If API key is added before retry, Agent1 succeeds
- ✅ If not added, error appears again

**Pass Criteria**: Retry re-executes all nodes in the failed level.

---

### Test 6.2: Skip Failed Review

**Purpose**: Verify Skip continues execution without failed review node.

**Setup**: Use HumanReview workflow, reject the review

**Steps**:
1. Run workflow
2. Reject review (triggers error)
3. Click "Skip" in error dialog

**Expected Results**:
- ✅ Execution continues to downstream nodes
- ✅ Downstream nodes receive no input from skipped review
- ✅ Workflow completes with "✅ Done"

**Pass Criteria**: Skip bypasses failed node; execution continues.

---

### Test 6.3: Abort During Review

**Purpose**: Verify Abort cancels workflow cleanly.

**Setup**: Any workflow with HumanReview

**Steps**:
1. Run workflow
2. When review modal appears, reject
3. Click "Abort" in error dialog

**Expected Results**:
- ✅ Execution stops immediately
- ✅ All nodes reset to idle state
- ✅ Console shows: "🛑 Execution cancelled"
- ✅ No further execution occurs

**Pass Criteria**: Abort cleanly stops all execution.

---

## Success Criteria Summary

### Parallel Execution
- ✅ Independent nodes execute simultaneously
- ✅ Console shows "⚡ Executing N nodes in parallel..."
- ✅ Level-based execution respected
- ✅ Error in one branch doesn't stop others
- ✅ Execution controls (pause/cancel) work correctly

### Router
- ✅ Keyword matching (any/all modes) works
- ✅ Sentiment analysis classifies correctly
- ✅ Default route fallback works
- ✅ Visual feedback shows executed route
- ✅ Multiple output handles display properly

### Memory
- ✅ Read/write operations succeed
- ✅ Template injection (${memory.key}) works
- ✅ Memory persists during workflow
- ✅ Memory resets between runs
- ✅ Missing keys don't break execution

### Human Review
- ✅ Approve flow passes content through
- ✅ Reject flow triggers error recovery
- ✅ Edit mode allows content modification
- ✅ Timeout auto-approves correctly
- ✅ Multiple reviews work independently

### Integration
- ✅ All features work together
- ✅ No conflicts between features
- ✅ Complex workflows execute correctly

---

## Reporting Issues

If any test fails, report with:
1. Test number and name
2. Steps to reproduce
3. Expected vs actual behavior
4. Console error messages
5. Screenshots (if visual issue)

---

## Test Completion Checklist

### Basic Functionality
- [ ] Test 1.1: Basic Parallel Execution
- [ ] Test 2.1: Keyword Router (ANY mode)
- [ ] Test 2.3: Sentiment Router
- [ ] Test 3.1: Basic Memory Read/Write
- [ ] Test 4.1: Human Review Approve
- [ ] Test 4.3: Human Review Edit Mode

### Advanced Functionality
- [ ] Test 1.2: Deep Parallel Workflow
- [ ] Test 1.3: Parallel with Streaming
- [ ] Test 2.2: Keyword Router (ALL mode)
- [ ] Test 3.2: Multiple Memory Keys
- [ ] Test 4.4: Review Timeout
- [ ] Test 4.5: Multiple Reviews

### Execution Controls
- [ ] Test 1.4a: Pause During Parallel
- [ ] Test 1.4b: Cancel During Parallel
- [ ] Test 6.1: Retry Failed Node
- [ ] Test 6.2: Skip Failed Review
- [ ] Test 6.3: Abort Execution

### Error Handling
- [ ] Test 1.5: Error in Parallel Branch
- [ ] Test 3.5: Missing Memory Key
- [ ] Test 4.2: Review Rejection
- [ ] Test 6.1-6.3: Error Recovery

### Integration
- [ ] Test 5.1: Parallel + Memory
- [ ] Test 5.2: Router + Memory
- [ ] Test 5.3: Parallel + Router
- [ ] Test 5.4: Review + Memory
- [ ] Test 5.5: All Features Combined

---

**Total Tests**: 29
**Estimated Testing Time**: 2-3 hours for complete suite
**Recommended Order**: Basic → Advanced → Controls → Errors → Integration
