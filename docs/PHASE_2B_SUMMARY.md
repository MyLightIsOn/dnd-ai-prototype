# Phase 2B: Quick Reference Summary

**Full Plan:** See `phase-2b-router-loops.md`

---

## What Gets Built

### 1. Router Execution Integration ⭐ CRITICAL
**Current:** Router UI exists but doesn't actually route execution
**After:** Execution flows down selected path only

**Tasks:**
- Route execution logic (2-3 hrs)
- Edge filtering for branches (3-4 hrs)
- Visual path highlighting (2-3 hrs)
- Default route handling (1-2 hrs)

**Impact:** Makes routers actually work (currently broken)

---

### 2. Loop Support
**Current:** Graphs must be acyclic (DAG only)
**After:** Nodes can loop back with iteration limits

**Tasks:**
- Cycle detection (2-3 hrs)
- Loop node component (2-3 hrs)
- Loop execution engine (4-6 hrs) ⭐
- Break condition evaluation (2-3 hrs)
- Loop configuration UI (2-3 hrs)

**Impact:** Enables iterative workflows (research loops, retry logic, refinement)

---

### 3. Advanced Routing Strategies
**Current:** Keyword and sentiment routing only
**After:** LLM-as-judge and JSON-field routing

**Tasks:**
- LLM-as-judge routing (3-4 hrs)
- JSON-field routing (2-3 hrs)

**Impact:** More powerful routing decisions

---

## Timeline

### Week 1: Router Completion (Days 1-4)
- **Day 1-2:** Router execution integration ⭐
- **Day 3-4:** Advanced routing + visual feedback

**Deliverable:** Routers work correctly

### Week 2: Loops (Days 5-10)
- **Day 5-6:** Loop infrastructure (node, UI)
- **Day 7-9:** Loop execution engine ⭐
- **Day 10:** Testing & bug fixes

**Deliverable:** Loops work end-to-end

---

## Effort Estimate

| Component | Time |
|-----------|------|
| Router execution | 8-12 hrs |
| Advanced routing | 5-7 hrs |
| Loop support | 12-17 hrs |
| Testing & docs | 6-9 hrs |
| **Total** | **31-45 hrs** |

**Calendar Time:** 2-3 weeks at 10-15 hrs/week

---

## Critical Path

Must complete in order:
1. Router execution integration (Days 1-2) ⭐
2. Loop execution engine (Days 7-9) ⭐
3. Integration testing (Day 10)

Everything else can be parallelized or deferred.

---

## Demo Workflows After Completion

### Demo 1: Content Moderation with Router
```
Input → Sentiment Router → [Positive] → Auto-Publish
                        → [Negative] → Human Review → Publish
```

### Demo 2: Research Loop
```
Topic → Research Agent → Quality Router → [Good] → Summary
                                       → [Poor] → Loop (max 3) → Research Agent
```

### Demo 3: LLM-as-Judge Routing
```
Customer Feedback → LLM Judge Router → [Bug] → Bug Tracker
                                    → [Feature] → Feature Queue
                                    → [Question] → Support
```

### Demo 4: Iterative Refinement Loop
```
Draft → Critique Agent → Loop (break on "APPROVED") → Final Result
         ↑________________↓
```

---

## Success Criteria

### Router
- ✅ Execution branches based on route selection
- ✅ Non-selected paths completely skipped
- ✅ Visual feedback shows active path
- ✅ Default routes work

### Loops
- ✅ Loops execute N times (configurable)
- ✅ Iteration counter displays
- ✅ Break conditions work
- ✅ Infinite loops prevented

### Integration
- ✅ Routers + loops work together
- ✅ Multiple routers in sequence work
- ✅ Nested loops work (stretch goal)

---

## Risk Items

### High Risk
1. **Loop execution complexity** - Very hard to implement correctly
   - Mitigation: Start simple, expand gradually
   - Fallback: Single loops only (no nesting)

2. **Edge filtering performance** - May be slow with complex graphs
   - Mitigation: Profile and optimize
   - Fallback: Cache calculations

3. **Infinite loops** - Could crash browser
   - Mitigation: Hard limit (100 iterations), watchdog timer
   - Emergency stop button

---

## Quick Start for Implementation

### Day 1: Router Execution (Start Here)
1. Open `lib/run.ts`
2. Find `executeNode()` function
3. Add router case:
```typescript
if (node.type === "router") {
  const selectedRoute = evaluateRoute(...);
  // Store decision
  // Filter edges
  // Return output
}
```
4. Test with simple workflow

### Day 2: Edge Filtering
1. Create `getActiveEdges()` helper
2. Track router decisions
3. Filter edges before level grouping
4. Test cascading routers

### Day 5: Loop Node
1. Create `types/loop.ts`
2. Create `components/nodes/loop-node.tsx`
3. Add to registry
4. Test UI only (no execution yet)

### Day 7-9: Loop Execution
1. Modify `topoSort.ts` to detect cycles
2. Update `run.ts` to allow revisiting nodes
3. Add iteration tracking
4. Implement max iteration check
5. Test simple loop

---

## Testing Checklist

- [ ] Router directs execution (not just UI)
- [ ] Default routes work
- [ ] Cascading routers work
- [ ] LLM-as-judge routing works
- [ ] JSON-field routing works
- [ ] Simple loop (A → B → A) works
- [ ] Max iterations enforced
- [ ] Keyword break condition works
- [ ] LLM break condition works
- [ ] No infinite loops possible
- [ ] Visual feedback clear

---

## After Phase 2B

You'll have **complete orchestration capabilities**:
- ✅ Parallel execution (Phase 2A)
- ✅ Conditional routing with multiple strategies
- ✅ Loops and iteration
- ✅ Memory and state management
- ✅ Human-in-the-loop review

**Next:** Phase 3 (Tools), Phase 4 (Templates), or Phase 2C (Polish)

---

## Questions Before Starting?

**Q: Can I just do router execution and skip loops?**
A: Yes! Router execution is critical. Loops can wait.

**Q: What if loop execution is too hard?**
A: Start with simple loops (A→B→A), skip nested loops.

**Q: Do I need all routing strategies?**
A: No. Keyword + sentiment (already done) may be enough. LLM-as-judge is nice-to-have.

**Q: How long does just the critical path take?**
A: Router execution (8-12 hrs) + basic loops (8-10 hrs) = 16-22 hrs minimum.
