import { topoSort } from "@/lib/topoSort";
import type { Edge } from "@xyflow/react";
import type { TypedNode, Id, RouterData, LoopData } from "@/types";
import type { NodeStats, RunStats } from '@/types'
import { groupNodesByLevel } from "./levels";
import { MemoryManager } from "./memory-manager";
import { AuditLog } from "./audit-log";
import '@/lib/execution/executors/index'; // register all executors
import { getNodeExecutor } from './node-executor';
import { ExecutionEventEmitter } from './events';

/**
 * Filters edges based on router and loop execution decisions.
 * - For router nodes: only keeps edges where sourceHandle matches the selected route.
 * - For loop nodes: only keeps continue or exit edge based on executedExit flag.
 * - For other nodes: keeps all edges.
 *
 * @param allEdges - All edges in the workflow
 * @param nodesById - Map of node IDs to node objects
 * @returns Filtered array of active edges
 */
function getActiveEdges(
  allEdges: Edge[],
  nodesById: Record<Id, TypedNode>,
  loopExited?: Record<Id, boolean>
): Edge[] {
  return allEdges.filter(edge => {
    const sourceNode = nodesById[edge.source as Id];

    // If source node doesn't exist, keep the edge
    if (!sourceNode) {
      return true;
    }

    // Handle router nodes
    if (sourceNode.type === 'router') {
      const routerData = sourceNode.data as RouterData;

      // If router hasn't executed yet, keep the edge (will be filtered later)
      if (!routerData.executedRoute) {
        return true;
      }

      // For backward compatibility: if edge has no sourceHandle, keep it
      if (!edge.sourceHandle) {
        return true;
      }

      // Keep edge only if sourceHandle matches the executed route ID
      const isMatch = edge.sourceHandle === routerData.executedRoute;

      // Add warning if mismatch (helps debug)
      if (!isMatch && edge.sourceHandle && routerData.executedRoute) {
        console.warn(
          `Router ${edge.source}: edge sourceHandle "${edge.sourceHandle}" ` +
          `doesn't match executed route "${routerData.executedRoute}"`
        );
      }

      return isMatch;
    }

    // Handle loop nodes
    if (sourceNode.type === 'loop') {
      // For backward compatibility: if edge has no sourceHandle, keep it
      if (!edge.sourceHandle) {
        return true;
      }

      // Use local loopExited map (authoritative) or fall back to stale node data
      const hasExited = loopExited
        ? !!loopExited[edge.source as Id]
        : !!(sourceNode.data as LoopData).executedExit;

      // If loop has exited, only keep exit edge; otherwise only keep continue edge
      return hasExited
        ? edge.sourceHandle === 'exit'
        : edge.sourceHandle === 'continue';
    }

    // For all other node types, keep the edge
    return true;
  });
}

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'cancelled';

type ReviewDecisionResult = {
  decision: 'approved' | 'rejected';
  editedContent?: string;
};

/**
 * Per-invocation options for runParallel.
 * Intended for compare-mode runs where all agent nodes should use a single provider override.
 * Non-agent nodes (prompt, document, chunker, result, tool, loop) are unaffected by these options.
 */
export interface RunOptions {
  /**
   * When set, all agent nodes use this model string instead of their configured agentData.model.
   * Format: "provider/model-id" (e.g. "anthropic/claude-3-5-sonnet-20241022").
   * Must be a non-empty string with a "/" separator or an error will be thrown.
   */
  providerOverride?: string
}

/**
 * Execution engine: decoupled control objects and event emitter.
 * Callers (UI, store, tests) provide this instead of 11 React setter parameters.
 */
export interface ExecutionEngine {
  emitter: ExecutionEventEmitter;
  control: { current: ExecutionStatus };
  errorRecovery: { current: 'retry' | 'skip' | 'abort' | null };
  reviewDecision: { current: ReviewDecisionResult | null };
}

interface NodeExecutionContext {
  nodesById: Record<Id, TypedNode>;
  incomingEdgesByNode: Record<Id, Id[]>;
  nodeOutputs: Record<Id, string>;
  loopIterations: Record<Id, number>;
  loopExited: Record<Id, boolean>;
  executionControl: { current: ExecutionStatus };
  workflowMemory: MemoryManager;
  auditLog: AuditLog;
  reviewDecisionRef: { current: ReviewDecisionResult | null };
  options?: RunOptions;
  nodeStatsBuffer: NodeStats[];
  nodeTokenData: Record<string, { promptTokens: number; completionTokens: number; costUsd: number }>;
  emitter: ExecutionEventEmitter;
}

/**
 * Execute a single node and return its output
 * Throws an error if execution fails
 */
async function executeNode(
  nodeId: Id,
  context: NodeExecutionContext
): Promise<string> {
  const { nodesById, incomingEdgesByNode, nodeOutputs, loopIterations, loopExited,
          workflowMemory, auditLog, executionControl, options, emitter } = context;
  const node = nodesById[nodeId];

  // Emit start — bridge translates to setNodes executionState: 'executing'
  emitter.emit({ type: 'node:start', nodeId });

  try {
    const executor = getNodeExecutor(node.type!);
    if (!executor) {
      throw new Error(`No executor registered for node type: "${node.type}"`);
    }

    const inputs = (incomingEdgesByNode[nodeId] || [])
      .map(depId => nodeOutputs[depId])
      .filter((v): v is string => v != null && v !== undefined);

    const result = await executor.execute({
      nodeId,
      nodeType: node.type!,
      nodeData: node.data as Record<string, unknown>,
      inputs,
      context: {
        workflowMemory,
        auditLog,
        emitter,
        executionControl,
        loopIterations,
        loopExited,
        reviewDecision: context.reviewDecisionRef,
        options,
      },
    });

    // Apply dataPatch (emits node:data event for bridge to handle)
    if (result.dataPatch) {
      // Extract tokenData for stats tracking before emitting
      const { tokenData, ...nodePatch } = result.dataPatch as { tokenData?: Record<string, { promptTokens: number; completionTokens: number; costUsd: number }>; [key: string]: unknown };

      if (tokenData) {
        // Store token data in context for RunStats calculation
        Object.assign(context.nodeTokenData, tokenData);
      }

      if (Object.keys(nodePatch).length > 0) {
        emitter.emit({ type: 'node:data', nodeId, patch: nodePatch });
      }
    }

    emitter.emit({ type: 'node:complete', nodeId, output: result.output });
    return result.output;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    emitter.emit({ type: 'node:error', nodeId, error: errorMessage });
    throw error;
  }
}

/**
 * Build a RunStats summary from per-node stats collected during execution.
 */
function buildRunStats(buffer: NodeStats[], provider?: string): RunStats {
  const totalLatencyMs = buffer.reduce((sum, n) => sum + n.latencyMs, 0);
  const promptTokens = buffer.reduce((sum, n) => sum + n.promptTokens, 0);
  const completionTokens = buffer.reduce((sum, n) => sum + n.completionTokens, 0);
  const totalCostUsd = buffer.reduce((sum, n) => sum + n.costUsd, 0);
  return {
    provider: provider ?? '',
    totalLatencyMs,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    totalCostUsd,
    nodes: [...buffer],
  };
}

/**
 * Executes the graph using level-based parallel execution.
 * Nodes within the same level (no dependencies on each other) run in parallel.
 * Levels execute sequentially.
 *
 * All React state interaction is removed — callers pass an ExecutionEngine
 * (emitter + control refs) and subscribe to events via the emitter.
 */
export async function runParallel(
  nodes: TypedNode[],
  edges: Edge[],
  engine: ExecutionEngine,
  options?: RunOptions,
): Promise<{ memory: MemoryManager; auditLog: AuditLog; stats: RunStats }> {
  const { emitter, control: executionControl, errorRecovery: errorRecoveryAction, reviewDecision: reviewDecisionRef } = engine;

  // Create a workflow-scoped MemoryManager for this execution run
  const workflowMemory = new MemoryManager('workflow');

  // Create a fresh AuditLog for this execution run
  const auditLog = new AuditLog();

  // Strip loop back-edges before topo-sort. Loop nodes intentionally create cycles
  // (body → loop) for iteration; the runner handles this itself. We find all nodes
  // reachable from each loop node via its "continue" handle, then drop any edge that
  // goes from those body nodes back to the loop node.
  const edgesForSort = (() => {
    const loopNodes = nodes.filter(n => n.type === 'loop');
    if (loopNodes.length === 0) return edges;

    const backEdgeIds = new Set<string>();
    for (const loopNode of loopNodes) {
      // BFS from loop via "continue" outgoing edges
      const bodyNodes = new Set<string>();
      const queue: string[] = [];
      edges
        .filter(e => e.source === loopNode.id && e.sourceHandle === 'continue')
        .forEach(e => { bodyNodes.add(e.target as string); queue.push(e.target as string); });
      while (queue.length > 0) {
        const cur = queue.shift()!;
        edges
          .filter(e => e.source === cur && e.target !== loopNode.id)
          .forEach(e => {
            if (!bodyNodes.has(e.target as string)) {
              bodyNodes.add(e.target as string);
              queue.push(e.target as string);
            }
          });
      }
      // Any edge from a body node back to this loop node is a back-edge
      edges
        .filter(e => bodyNodes.has(e.source as string) && e.target === loopNode.id)
        .forEach(e => backEdgeIds.add(e.id));
    }
    return backEdgeIds.size > 0 ? edges.filter(e => !backEdgeIds.has(e.id)) : edges;
  })();

  // Compute topological ordering and detect cycles
  const { order: topologicalOrder, hasCycle, cycles } = topoSort(nodes, edgesForSort);

  if (hasCycle) {
    // Log remaining cycles (not expected after loop back-edge removal)
    const cycleNodeIds = Array.from(cycles);
    const cycleNames = cycleNodeIds
      .map(id => {
        const node = nodes.find(n => n.id === id);
        const nodeData = node?.data as { name?: string } | undefined;
        return nodeData?.name || node?.type || id;
      })
      .join(', ');

    emitter.emit({ type: 'log:append', message:
      `⚠️ Cycles detected in graph (nodes: ${cycleNames}). ` +
      `Execution will proceed with acyclic nodes.`
    });
  }

  // Build lookup maps
  const nodesById: Record<Id, TypedNode> = nodes.reduce(
    (acc, node) => {
      acc[node.id] = node;
      return acc;
    },
    {} as Record<Id, TypedNode>,
  );

  const incomingEdgesByNode: Record<Id, Id[]> = nodes.reduce(
    (acc, node) => {
      acc[node.id] = [] as Id[];
      return acc;
    },
    {} as Record<Id, Id[]>,
  );

  edges.forEach((edge) => incomingEdgesByNode[edge.target as Id].push(edge.source as Id));

  const nodeOutputs: Record<Id, string> = {};

  // Group nodes by dependency level
  let levels = groupNodesByLevel(topologicalOrder, edgesForSort);

  emitter.emit({ type: 'log:append', message: `🚀 Executing ${levels.length} level(s) with parallel nodes...` });

  const STEP_DELAY_MS = 200;
  const GLOBAL_ITERATION_LIMIT = 1000;

  // Track which nodes have been executed to avoid re-execution
  const executedNodes = new Set<Id>();

  // Track loop iteration counts separately to avoid relying on stale nodesById
  const loopIterations: Record<Id, number> = {};

  // Track whether each loop has exited (authoritative; nodesById goes stale during execution)
  const loopExited: Record<Id, boolean> = {};

  // Track global iteration count to prevent infinite loops
  let globalIterationCount = 0;

  // Per-node stats accumulator (populated after each level's Promise.allSettled)
  const nodeStatsBuffer: NodeStats[] = [];

  // Side channel for token/cost data from agent execution
  const nodeTokenData: Record<string, { promptTokens: number; completionTokens: number; costUsd: number }> = {};

  // Execute each level sequentially
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];

    // Check global iteration limit
    globalIterationCount++;
    if (globalIterationCount > GLOBAL_ITERATION_LIMIT) {
      emitter.emit({ type: 'log:append', message:
        `🚨 Global iteration limit exceeded (${GLOBAL_ITERATION_LIMIT}). ` +
        `This likely indicates an infinite loop. Aborting execution.`
      });
      emitter.emit({ type: 'execution:error', message: 'Global iteration limit exceeded' });
      return { memory: workflowMemory, auditLog, stats: buildRunStats(nodeStatsBuffer, options?.providerOverride) };
    }

    // Skip nodes that have already been executed
    const nodesToExecute = level.filter(nodeId => !executedNodes.has(nodeId));

    if (nodesToExecute.length === 0) {
      continue;
    }

    // Check for cancellation
    if (executionControl.current === 'cancelled') {
      emitter.emit({ type: 'log:append', message: "🛑 Execution cancelled." });
      emitter.emit({ type: 'execution:cancelled' });
      return { memory: workflowMemory, auditLog, stats: buildRunStats(nodeStatsBuffer, options?.providerOverride) };
    }

    // Check for pause
    if (executionControl.current === 'paused') {
      emitter.emit({ type: 'log:append', message: "⏸️  Execution paused." });

      while (executionControl.current === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (executionControl.current === 'cancelled') {
        emitter.emit({ type: 'log:append', message: "🛑 Execution cancelled." });
        emitter.emit({ type: 'execution:cancelled' });
        return { memory: workflowMemory, auditLog, stats: buildRunStats(nodeStatsBuffer, options?.providerOverride) };
      }

      emitter.emit({ type: 'log:append', message: "▶️  Execution resumed." });
    }

    if (nodesToExecute.length > 1) {
      emitter.emit({ type: 'log:append', message: `⚡ Level ${levelIndex + 1}: Executing ${nodesToExecute.length} nodes in parallel...` });
    }

    const context: NodeExecutionContext = {
      nodesById,
      incomingEdgesByNode,
      nodeOutputs,
      loopIterations,
      loopExited,
      executionControl,
      workflowMemory,
      auditLog,
      reviewDecisionRef,
      options,
      nodeStatsBuffer,
      nodeTokenData,
      emitter,
    };

    // Execute all nodes in this level in parallel
    const nodeStartTimes: Record<string, number> = {};
    const results = await Promise.allSettled(
      nodesToExecute.map(async (nodeId) => {
        nodeStartTimes[nodeId] = Date.now();
        return executeNode(nodeId, context);
      })
    );

    // Track if this level contains any router or loop nodes
    let hasRouterInLevel = false;
    let hasLoopInLevel = false;

    // Process results and handle errors
    for (let i = 0; i < nodesToExecute.length; i++) {
      const nodeId = nodesToExecute[i];
      const result = results[i];

      // Mark node as executed
      executedNodes.add(nodeId);

      // Capture per-node stats
      const latencyMs = Date.now() - (nodeStartTimes[nodeId] ?? Date.now());
      const nodeForStats = nodesById[nodeId];
      const tokenData = context.nodeTokenData[nodeId];
      context.nodeStatsBuffer.push({
        nodeId,
        nodeName: (nodeForStats?.data as { name?: string })?.name ?? nodeId,
        nodeType: nodeForStats?.type ?? 'unknown',
        status: result.status === 'fulfilled' ? 'completed' : 'error',
        latencyMs,
        promptTokens: tokenData?.promptTokens ?? 0,
        completionTokens: tokenData?.completionTokens ?? 0,
        costUsd: tokenData?.costUsd ?? 0,
        errorMessage: result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
          : undefined,
      });

      // Check if this node is a router or loop
      const node = nodesById[nodeId];
      if (node.type === 'router') {
        hasRouterInLevel = true;
      } else if (node.type === 'loop') {
        hasLoopInLevel = true;
      }

      if (result.status === 'fulfilled') {
        // Node succeeded, store output
        nodeOutputs[nodeId] = result.value;
      } else {
        // Node failed, handle error
        const node = nodesById[nodeId];
        const nodeData = node.data as { name?: string };
        const nodeName = nodeData.name || node.type || 'Unknown Node';
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);

        emitter.emit({ type: 'log:append', message: `❌ ${nodeName}: ${errorMessage}` });

        // If error recovery is available
        if (errorRecoveryAction) {
          emitter.emit({ type: 'error-recovery:request', nodeId, nodeName, message: errorMessage });

          // Wait for user decision
          while (errorRecoveryAction.current === null) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const action = errorRecoveryAction.current;
          errorRecoveryAction.current = null;

          if (action === 'abort') {
            emitter.emit({ type: 'log:append', message: "🛑 Execution cancelled." });
            emitter.emit({ type: 'execution:cancelled' });
            return { memory: workflowMemory, auditLog, stats: buildRunStats(nodeStatsBuffer, options?.providerOverride) };
          }
          // For skip or retry, continue (retry logic would need level re-execution)
          // For now, we skip failed nodes and continue
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));

    // If this level contained routers or loops, recalculate levels with filtered edges
    if (hasRouterInLevel || hasLoopInLevel) {
      // Get active edges based on router and loop decisions
      const activeEdges = getActiveEdges(edges, nodesById, loopExited);

      // Build set of active edge IDs for quick lookup
      const activeEdgeIds = new Set(activeEdges.map(e => e.id));

      // Emit edge style updates
      type EdgeStyleUpdate = { edgeId: string; style: object; animated: boolean };
      const edgeStyleUpdates: EdgeStyleUpdate[] = [];
      for (const edge of edges) {
        if (activeEdgeIds.has(edge.id)) {
          edgeStyleUpdates.push({ edgeId: edge.id, style: { stroke: '#22c55e', strokeWidth: 2, opacity: 1 }, animated: true });
        } else {
          const sourceNode = nodesById[edge.source as Id];
          if (sourceNode) {
            if (sourceNode.type === 'router') {
              const routerData = sourceNode.data as RouterData;
              if (routerData.executedRoute) {
                edgeStyleUpdates.push({ edgeId: edge.id, style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 }, animated: false });
              }
            } else if (sourceNode.type === 'loop') {
              const loopData = sourceNode.data as LoopData;
              if (edge.sourceHandle === 'continue' && loopData.executedExit) {
                edgeStyleUpdates.push({ edgeId: edge.id, style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 }, animated: false });
              } else if (edge.sourceHandle === 'exit' && !loopData.executedExit) {
                edgeStyleUpdates.push({ edgeId: edge.id, style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 }, animated: false });
              }
            }
          }
        }
      }

      if (edgeStyleUpdates.length > 0) {
        emitter.emit({ type: 'edge:style', updates: edgeStyleUpdates });
      }

      // Update incoming edges map with filtered edges
      // Reset for all nodes first
      for (const nodeId in incomingEdgesByNode) {
        incomingEdgesByNode[nodeId] = [];
      }
      // Rebuild with active edges only
      activeEdges.forEach((edge) => {
        const targetId = edge.target as Id;
        const sourceId = edge.source as Id;
        if (incomingEdgesByNode[targetId]) {
          incomingEdgesByNode[targetId].push(sourceId);
        }
      });

      // For loops that are continuing, need to add loop body nodes back to execution
      if (hasLoopInLevel) {
        // Check if any loops in this level are continuing
        const continuingLoops = nodesToExecute.filter(nodeId => {
          const node = nodesById[nodeId];
          if (node.type !== 'loop') return false;
          // Use local loopExited map (authoritative — nodesById is stale)
          return !loopExited[nodeId];
        });

        if (continuingLoops.length > 0) {
          continuingLoops.forEach(loopNodeId => {
            // Find all nodes reachable from the continue handle
            const loopBodyNodes = new Set<Id>();
            const queue: Id[] = [];

            // Start with nodes directly connected to continue handle
            activeEdges
              .filter(edge => edge.source === loopNodeId && edge.sourceHandle === 'continue')
              .forEach(edge => {
                const targetId = edge.target as Id;
                loopBodyNodes.add(targetId);
                queue.push(targetId);
              });

            // BFS to find all nodes in loop body (stop before the loop node itself)
            while (queue.length > 0) {
              const currentId = queue.shift()!;
              activeEdges
                .filter(edge => edge.source === currentId && edge.target !== loopNodeId)
                .forEach(edge => {
                  const targetId = edge.target as Id;
                  if (!loopBodyNodes.has(targetId)) {
                    loopBodyNodes.add(targetId);
                    queue.push(targetId);
                  }
                });
            }

            // Clear loop body nodes AND the loop node itself so they re-execute
            loopBodyNodes.forEach(nodeId => executedNodes.delete(nodeId));
            executedNodes.delete(loopNodeId);
          });
        }
      }

      // Get remaining nodes (not yet executed)
      const remainingNodes = topologicalOrder.filter(nodeId => !executedNodes.has(nodeId));

      if (remainingNodes.length > 0) {
        // Exclude nodes that have dependencies in the graph but NO active incoming edges —
        // these are waiting on a future loop exit or router decision and should not
        // be scheduled as spurious root nodes.
        const schedulableRemaining = remainingNodes.filter(nodeId => {
          const hasAnyDep = edgesForSort.some(e => e.target === nodeId);
          if (!hasAnyDep) return true; // True root node
          return activeEdges.some(e => e.target === nodeId); // Has at least one active incoming edge
        });

        // Recalculate levels for remaining nodes using filtered edges
        const newLevels = groupNodesByLevel(schedulableRemaining, activeEdges);

        // Replace remaining levels with recalculated ones
        levels = [
          ...levels.slice(0, levelIndex + 1),
          ...newLevels
        ];

        if (hasRouterInLevel && hasLoopInLevel) {
          emitter.emit({ type: 'log:append', message: `🔀 Recalculated execution path based on router and loop decisions` });
        } else if (hasRouterInLevel) {
          emitter.emit({ type: 'log:append', message: `🔀 Recalculated execution path based on router decisions` });
        } else {
          emitter.emit({ type: 'log:append', message: `🔁 Recalculated execution path based on loop decisions` });
        }
      }
    }
  }

  emitter.emit({ type: 'log:append', message: "✅ Done." });

  return { memory: workflowMemory, auditLog, stats: buildRunStats(nodeStatsBuffer, options?.providerOverride) };
}
