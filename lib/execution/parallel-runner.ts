import React from "react";
import { topoSort } from "@/lib/topoSort";
import type { Edge } from "@xyflow/react";
import type { AgentData, ToolData, TypedNode, Id, ChunkerData, RouterData, LoopData } from "@/types";
import type { DocumentData } from "@/types/document";
import type { MemoryData } from "@/types/memory";
import type { HumanReviewData, ReviewDecision } from "@/types/human-review";
import { getProvider } from "@/lib/providers";
import { getApiKey } from "@/lib/storage/api-keys";
import type { Message } from "@/lib/providers/base";
import { chunkDocument } from "@/lib/document/chunker";
import { groupNodesByLevel } from "./levels";
import { evaluateRoutes } from "./route-evaluator";
import { shouldBreakLoop } from "./loop-evaluator";
import { MemoryManager, globalMemoryInstance } from "./memory-manager";
import { evaluateApprovalRule, canDecideEarly } from "./approval-evaluator";

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
  nodesById: Record<Id, TypedNode>
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
      const loopData = sourceNode.data as LoopData;

      // For backward compatibility: if edge has no sourceHandle, keep it
      if (!edge.sourceHandle) {
        return true;
      }

      // If loop has exited, only keep exit edge
      if (loopData.executedExit) {
        return edge.sourceHandle === 'exit';
      }

      // If loop is continuing, only keep continue edge
      return edge.sourceHandle === 'continue';
    }

    // For all other node types, keep the edge
    return true;
  });
}

/**
 * Build the message array for an LLM completion request.
 */
function buildMessages(agentData: AgentData, inputs: string[]): Message[] {
  const messages: Message[] = [];

  if (inputs.length > 0) {
    messages.push({
      role: 'user',
      content: `Context:\n\n${inputs.join('\n\n---\n\n')}`
    });
  }

  messages.push({
    role: 'user',
    content: agentData.prompt
  });

  return messages;
}

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'cancelled';

type ReviewRequest = {
  reviewerLabel: string;
  nodeName: string;
  instructions?: string;
  content: string;
  mode: 'approve-reject' | 'edit-and-approve';
};

type ReviewDecisionResult = {
  decision: 'approved' | 'rejected';
  editedContent?: string;
};

interface NodeExecutionContext {
  nodesById: Record<Id, TypedNode>;
  incomingEdgesByNode: Record<Id, Id[]>;
  nodeOutputs: Record<Id, string>;
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>;
  executionControl?: React.MutableRefObject<ExecutionStatus>;
  workflowMemory: MemoryManager;
  setReviewRequest?: React.Dispatch<React.SetStateAction<ReviewRequest | null>>;
  reviewDecisionRef?: React.MutableRefObject<ReviewDecisionResult | null>;
}

/**
 * Execute a single node and return its output
 * Throws an error if execution fails
 */
async function executeNode(
  nodeId: Id,
  context: NodeExecutionContext
): Promise<string> {
  const { nodesById, incomingEdgesByNode, nodeOutputs, setLogs, setNodes, executionControl, workflowMemory, setReviewRequest, reviewDecisionRef } = context;
  const node = nodesById[nodeId];

  // Set node to executing state
  setNodes(nodes => nodes.map(n =>
    n.id === nodeId ? { ...n, data: { ...n.data, executionState: 'executing' as const } } : n
  ));

  let output = '';

  try {
    if (node.type === "document") {
      // Document node: store content for downstream agents
      const docData = node.data as DocumentData;
      output = docData.content || '';
      setLogs(logs => logs.concat(`📄 ${docData.name || 'Document'}: ${docData.fileName || 'No file'} (${docData.content?.length || 0} chars)`));
    } else if (node.type === "agent") {
      // Gather inputs from dependencies
      const agentData = node.data as AgentData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const mode = agentData.mode || 'mock';
      const agentName = agentData.name || "Agent";
      const modelStr = agentData.model || "model";

      if (mode === 'mock') {
        // Mock mode
        output = `This is a mock response from ${agentName}. In live mode, this would be the actual LLM output based on the prompt: "${agentData.prompt || 'no prompt'}"`;
        setLogs((logs) => logs.concat(`🤖 ${agentName} (${modelStr}) [MOCK]\n${output}`));
      } else {
        // Live mode: call real LLM provider
        if (!agentData.model || !agentData.model.includes('/')) {
          throw new Error(`Invalid model format. Expected "provider/model-id"`);
        }

        const [providerName, modelId] = agentData.model.split('/', 2);
        const provider = getProvider(providerName);

        if (!provider) {
          throw new Error(`Provider "${providerName}" not found`);
        }

        const apiKey = getApiKey(providerName);
        if (!apiKey) {
          throw new Error(`No API key found for provider "${providerName}"`);
        }

        const messages = buildMessages(agentData, dependencyOutputs);
        const streaming = agentData.streaming || false;

        if (streaming && provider.supportsStreaming) {
          // Streaming mode
          let accumulatedOutput = '';
          let logIndex = -1;

          // Add initial log entry
          setLogs((logs) => {
            logIndex = logs.length;
            return logs.concat(`🤖 ${agentName} (${modelStr})\n⏳ Streaming...`);
          });

          const streamIterator = provider.stream({
            model: modelId,
            messages,
            temperature: agentData.temperature,
            maxTokens: agentData.maxTokens,
            apiKey
          });

          const stream = {
            [Symbol.asyncIterator]() {
              return streamIterator;
            }
          };

          for await (const chunk of stream) {
            accumulatedOutput += chunk.delta;

            setLogs((logs) => {
              const updated = [...logs];
              updated[logIndex] = `🤖 ${agentName} (${modelStr})\n${accumulatedOutput}${chunk.done ? '' : '▌'}`;
              return updated;
            });

            if (chunk.done && chunk.usage) {
              const cost = provider.calculateCost(modelId, chunk.usage);
              setLogs((logs) => {
                const updated = [...logs];
                updated[logIndex] = `🤖 ${agentName} (${modelStr})\n${accumulatedOutput}\n💰 Cost: $${cost.toFixed(6)} | Tokens: ${chunk.usage!.totalTokens}`;
                return updated;
              });
            }
          }

          output = accumulatedOutput;
        } else {
          // Non-streaming mode
          setLogs((logs) => logs.concat(`🤖 ${agentName} (${modelStr})\n⏳ Waiting for response...`));

          const response = await provider.complete({
            model: modelId,
            messages,
            temperature: agentData.temperature,
            maxTokens: agentData.maxTokens,
            apiKey
          });

          const cost = provider.calculateCost(modelId, response.usage);
          const logText = `🤖 ${agentName} (${modelStr})\n${response.content}\n💰 Cost: $${cost.toFixed(6)} | Tokens: ${response.usage.totalTokens}`;

          output = response.content;
          setLogs((logs) => {
            const updated = [...logs];
            updated[updated.length - 1] = logText;
            return updated;
          });
        }
      }
    } else if (node.type === "tool") {
      // Tool execution
      const toolData = node.data as ToolData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);
      const endpoint = toolData?.config?.endpoint || "(no endpoint)";

      const logText = `🔧 ${toolData.name || "Tool"} [${toolData.kind || "tool"}]\nGET ${endpoint}\nBody: ${dependencyOutputs
        .join("\n")
        .slice(0, 120)}`;

      output = logText;
      setLogs((logs) => logs.concat(logText));
    } else if (node.type === "chunker") {
      // Chunker node
      const chunkerData = node.data as ChunkerData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      if (dependencyOutputs.length === 0) {
        throw new Error('No input document');
      }

      const parentContent = dependencyOutputs[0];
      const chunks = chunkDocument(
        parentContent,
        chunkerData.strategy || 'fixed',
        chunkerData.chunkSize || 500,
        chunkerData.overlap || 50
      );

      // Store chunks in node data
      setNodes((currentNodes) =>
        currentNodes.map((mapped) =>
          mapped.id === node.id
            ? { ...mapped, data: { ...mapped.data, chunks } }
            : mapped,
        ),
      );

      output = chunks.join('\n\n---CHUNK---\n\n');
      setLogs(logs => logs.concat(`📑 ${chunkerData.name || 'Chunker'}: Created ${chunks.length} chunks`));
    } else if (node.type === "router") {
      // Router node - evaluate routes and select path
      const routerData = node.data as RouterData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      if (dependencyOutputs.length === 0) {
        throw new Error('No input to router');
      }

      const input = dependencyOutputs.join('\n\n');

      // Track LLM judge results for logging
      let llmJudgeResult: { cost: number; tokens: number; decision: string } | undefined;

      // Evaluate routes
      const selectedRouteId = await evaluateRoutes(input, routerData, (result) => {
        llmJudgeResult = result;
      });

      // Determine which route to use
      let executedRoute: string;
      if (selectedRouteId) {
        // A route matched
        executedRoute = selectedRouteId;
        const selectedRoute = routerData.routes?.find(r => r.id === selectedRouteId);
        let logMessage = `🔀 ${routerData.name || 'Router'}: Routed to "${selectedRoute?.label || 'Unknown'}"`;

        // Add LLM judge cost info if available
        if (llmJudgeResult) {
          logMessage += `\n💰 LLM Judge Cost: $${llmJudgeResult.cost.toFixed(6)} | Tokens: ${llmJudgeResult.tokens} | Decision: "${llmJudgeResult.decision}"`;
        }

        setLogs(logs => logs.concat(logMessage));
        output = input; // Pass through input to selected route
      } else if (routerData.defaultRoute) {
        // No route matched, but default route is configured
        executedRoute = 'default';
        let logMessage = `⚠️ ${routerData.name || 'Router'}: No routes matched, using default route`;

        // Add LLM judge cost info if available
        if (llmJudgeResult) {
          logMessage += `\n💰 LLM Judge Cost: $${llmJudgeResult.cost.toFixed(6)} | Tokens: ${llmJudgeResult.tokens}`;
        }

        setLogs(logs => logs.concat(logMessage));
        output = input;
      } else {
        // No route matched and no default route configured
        throw new Error(
          `Router "${routerData.name || 'Router'}": No routes matched and no default route configured. ` +
          `Either add a default route or adjust route conditions to match the input.`
        );
      }

      // Store selected route in node data
      setNodes((currentNodes) =>
        currentNodes.map((mapped) =>
          mapped.id === node.id
            ? { ...mapped, data: { ...mapped.data, executedRoute } }
            : mapped,
        ),
      );
    } else if (node.type === "loop") {
      // Loop node - manage iteration counting and break conditions
      const loopData = node.data as LoopData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const input = dependencyOutputs.join('\n\n');

      // Increment iteration counter
      const newIteration = loopData.currentIteration + 1;

      // Check if we've reached max iterations
      const maxIterations = loopData.maxIterations || 10;
      const reachedMaxIterations = newIteration >= maxIterations;

      // Check break condition
      const shouldBreak = reachedMaxIterations ||
        await shouldBreakLoop(loopData.breakCondition, input, newIteration);

      // Determine if loop should exit
      const executedExit = shouldBreak;

      // Log iteration status
      if (executedExit) {
        const reason = reachedMaxIterations
          ? `reached max iterations (${maxIterations})`
          : 'break condition met';
        setLogs(logs => logs.concat(
          `🔁 ${loopData.name || 'Loop'}: Iteration ${newIteration} - Exiting (${reason})`
        ));
      } else {
        setLogs(logs => logs.concat(
          `🔁 ${loopData.name || 'Loop'}: Iteration ${newIteration} - Continuing`
        ));
      }

      // Update loop node data with new iteration and exit status
      setNodes((currentNodes) =>
        currentNodes.map((mapped) =>
          mapped.id === node.id
            ? {
                ...mapped,
                data: {
                  ...mapped.data,
                  currentIteration: newIteration,
                  executedExit
                }
              }
            : mapped,
        ),
      );

      // Pass through input to next node
      output = input;
    } else if (node.type === "memory") {
      // Memory node - store inputs in MemoryManager
      const memData = node.data as MemoryData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const input = dependencyOutputs.join('\n\n');

      // Determine correct manager based on scope
      const manager = memData.scope === 'global' ? globalMemoryInstance : workflowMemory;

      // Try to parse input as JSON; store each key-value pair, otherwise store under node name
      let storedCount = 0;
      try {
        const parsed = JSON.parse(input);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) {
            manager.set(k, v);
            storedCount++;
          }
        } else {
          manager.set(memData.name, input);
          storedCount = 1;
        }
      } catch {
        manager.set(memData.name, input);
        storedCount = 1;
      }

      setLogs(logs => logs.concat(`🧠 Memory [${memData.name || 'Memory'}]: stored ${storedCount} key(s)`));

      // Pass through input to downstream nodes
      output = input;
    } else if (node.type === "human-review") {
      const reviewData = node.data as HumanReviewData;
      const multi = reviewData.multiReview;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);
      const input = dependencyOutputs.join('\n\n');
      let finalContent = input;
      let finalDecision: 'approved' | 'rejected' = 'approved';

      if (multi?.enabled) {
        const decisions: ReviewDecision[] = [];

        for (let i = 0; i < multi.reviewerCount; i++) {
          if (reviewDecisionRef) reviewDecisionRef.current = null;
          if (setReviewRequest) {
            setReviewRequest({
              reviewerLabel: `Reviewer ${i + 1}`,
              nodeName: reviewData.name,
              instructions: reviewData.instructions,
              content: finalContent,
              mode: reviewData.reviewMode,
            });
          }

          // Poll for decision (same pattern as error recovery)
          while (reviewDecisionRef && reviewDecisionRef.current === null) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Check if execution was cancelled
            if (executionControl?.current === 'cancelled') break;
          }

          if (executionControl?.current === 'cancelled') break;

          const { decision, editedContent } = reviewDecisionRef!.current!;
          decisions.push({ reviewer: `Reviewer ${i + 1}`, decision, timestamp: Date.now() });
          if (editedContent) finalContent = editedContent;

          if (canDecideEarly(decisions, multi.approvalRule, multi.reviewerCount)) break;
        }

        if (executionControl?.current !== 'cancelled') {
          finalDecision = evaluateApprovalRule(decisions, multi.approvalRule);
        }

        // Update node with decisions
        setNodes((current) =>
          current.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, multiReview: { ...multi, decisions }, lastDecision: finalDecision } }
              : n,
          ),
        );
      } else {
        // Single reviewer
        if (reviewDecisionRef) reviewDecisionRef.current = null;
        if (setReviewRequest) {
          setReviewRequest({
            reviewerLabel: 'Reviewer',
            nodeName: reviewData.name,
            instructions: reviewData.instructions,
            content: input,
            mode: reviewData.reviewMode,
          });
        }

        while (reviewDecisionRef && reviewDecisionRef.current === null) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (executionControl?.current === 'cancelled') break;
        }

        if (executionControl?.current !== 'cancelled') {
          const { decision, editedContent } = reviewDecisionRef!.current!;
          if (editedContent) finalContent = editedContent;
          finalDecision = decision;

          setNodes((current) =>
            current.map((n) =>
              n.id === node.id ? { ...n, data: { ...n.data, lastDecision: finalDecision } } : n,
            ),
          );
        }
      }

      if (finalDecision === 'rejected') {
        throw new Error(`Content rejected by reviewer`);
      }

      output = finalContent;
      setLogs((logs) => logs.concat(`👤 ${reviewData.name || 'Human Review'}: ${finalDecision}`));
    } else if (node.type === "result") {
      // Result node
      const incomingNodes = incomingEdgesByNode[node.id] || [];
      const dependencyOutputs = incomingNodes
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const finalOutput = dependencyOutputs.length > 0
        ? dependencyOutputs[dependencyOutputs.length - 1]
        : "<empty>";

      const finalText = `📦 Final: ${finalOutput}`;
      output = finalText;
      setLogs((logs) => logs.concat(finalText));

      // Update preview with full output (no truncation)
      setNodes((currentNodes) =>
        currentNodes.map((mapped) =>
          mapped.id === node.id
            ? { ...mapped, data: { ...mapped.data, preview: finalOutput } }
            : mapped,
        ),
      );
    }

    // Mark node as completed
    setNodes(nodes => nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, executionState: 'completed' as const } } : n
    ));

    return output;
  } catch (error) {
    // Mark node as error
    const errorMessage = error instanceof Error ? error.message : String(error);
    setNodes(nodes => nodes.map(n =>
      n.id === nodeId ? {
        ...n,
        data: {
          ...n.data,
          executionState: 'error' as const,
          executionError: errorMessage
        }
      } : n
    ));

    throw error;
  }
}

/**
 * Executes the graph using level-based parallel execution.
 * Nodes within the same level (no dependencies on each other) run in parallel.
 * Levels execute sequentially.
 */
export async function runParallel(
  nodes: TypedNode[],
  edges: Edge[],
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  executionControl?: React.MutableRefObject<ExecutionStatus>,
  errorRecoveryAction?: React.MutableRefObject<'retry' | 'skip' | 'abort' | null>,
  setCurrentError?: React.Dispatch<React.SetStateAction<{ nodeId: string; nodeName: string; message: string } | null>>,
  setReviewRequest?: React.Dispatch<React.SetStateAction<ReviewRequest | null>>,
  reviewDecisionRef?: React.MutableRefObject<ReviewDecisionResult | null>,
): Promise<{ memory: MemoryManager }> {
  // Create a workflow-scoped MemoryManager for this execution run
  const workflowMemory = new MemoryManager('workflow');

  // Clear previous logs
  setLogs([]);

  // Reset all nodes to idle state and clear loop counters
  setNodes(nodes => nodes.map(node => {
    if (node.type === 'loop') {
      const loopData = node.data as LoopData;
      return {
        ...node,
        data: {
          ...loopData,
          currentIteration: 0,
          executedExit: false,
          executionState: 'idle' as const,
          executionError: undefined
        }
      };
    }
    return node;
  }));

  // Reset all edges to default style at start of run
  setEdges(edges => edges.map(edge => ({
    ...edge,
    style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 1 },
    animated: false
  })));

  // Compute topological ordering and detect cycles
  const { order: topologicalOrder, hasCycle, cycles } = topoSort(nodes, edges);

  if (hasCycle) {
    // Log cycle detection but continue execution
    const cycleNodeIds = Array.from(cycles);
    const cycleNames = cycleNodeIds
      .map(id => {
        const node = nodes.find(n => n.id === id);
        const nodeData = node?.data as { name?: string } | undefined;
        return nodeData?.name || node?.type || id;
      })
      .join(', ');

    setLogs((logs) => logs.concat(
      `⚠️ Cycles detected in graph (nodes: ${cycleNames}). ` +
      `Execution will proceed with acyclic nodes.`
    ));
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
  let levels = groupNodesByLevel(topologicalOrder, edges);

  setLogs((logs) => logs.concat(`🚀 Executing ${levels.length} level(s) with parallel nodes...`));

  const STEP_DELAY_MS = 200;
  const GLOBAL_ITERATION_LIMIT = 1000;

  // Track which nodes have been executed to avoid re-execution
  const executedNodes = new Set<Id>();

  // Track global iteration count to prevent infinite loops
  let globalIterationCount = 0;

  // Execute each level sequentially
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];

    // Check global iteration limit
    globalIterationCount++;
    if (globalIterationCount > GLOBAL_ITERATION_LIMIT) {
      setLogs((logs) => logs.concat(
        `🚨 Global iteration limit exceeded (${GLOBAL_ITERATION_LIMIT}). ` +
        `This likely indicates an infinite loop. Aborting execution.`
      ));
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: { ...n.data, executionState: 'idle' as const }
      })));
      return { memory: workflowMemory };
    }

    // Skip nodes that have already been executed
    const nodesToExecute = level.filter(nodeId => !executedNodes.has(nodeId));

    if (nodesToExecute.length === 0) {
      continue;
    }

    // Check for cancellation
    if (executionControl?.current === 'cancelled') {
      setLogs((logs) => logs.concat("🛑 Execution cancelled."));
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: { ...n.data, executionState: 'idle' as const }
      })));
      return { memory: workflowMemory };
    }

    // Check for pause
    if (executionControl?.current === 'paused') {
      setLogs((logs) => logs.concat("⏸️  Execution paused."));

      while (executionControl?.current === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (executionControl?.current === 'cancelled') {
        setLogs((logs) => logs.concat("🛑 Execution cancelled."));
        setNodes(nodes => nodes.map(n => ({
          ...n,
          data: { ...n.data, executionState: 'idle' as const }
        })));
        return { memory: workflowMemory };
      }

      setLogs((logs) => logs.concat("▶️  Execution resumed."));
    }

    if (nodesToExecute.length > 1) {
      setLogs((logs) => logs.concat(`⚡ Level ${levelIndex + 1}: Executing ${nodesToExecute.length} nodes in parallel...`));
    }

    const context: NodeExecutionContext = {
      nodesById,
      incomingEdgesByNode,
      nodeOutputs,
      setLogs,
      setNodes,
      executionControl,
      workflowMemory,
      setReviewRequest,
      reviewDecisionRef,
    };

    // Execute all nodes in this level in parallel
    const results = await Promise.allSettled(
      nodesToExecute.map(nodeId => executeNode(nodeId, context))
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

        setLogs((logs) => logs.concat(`❌ ${nodeName}: ${errorMessage}`));

        // If error recovery is enabled
        if (setCurrentError && errorRecoveryAction) {
          setCurrentError({
            nodeId,
            nodeName,
            message: errorMessage
          });

          // Wait for user decision
          while (errorRecoveryAction.current === null) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const action = errorRecoveryAction.current;
          errorRecoveryAction.current = null;

          if (action === 'abort') {
            setLogs((logs) => logs.concat("🛑 Execution cancelled."));
            setNodes(nodes => nodes.map(n => ({
              ...n,
              data: { ...n.data, executionState: 'idle' as const }
            })));
            return { memory: workflowMemory };
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
      const activeEdges = getActiveEdges(edges, nodesById);

      // Build set of active edge IDs for quick lookup
      const activeEdgeIds = new Set(activeEdges.map(e => e.id));

      // Update edge styles: green/bold/animated for selected paths, gray/thin for non-selected
      setEdges(currentEdges => currentEdges.map(edge => {
        if (activeEdgeIds.has(edge.id)) {
          // Selected path: green, bold, animated, full opacity
          return {
            ...edge,
            style: { stroke: '#22c55e', strokeWidth: 2, opacity: 1 },
            animated: true
          };
        } else {
          // Check if this edge comes from a router or loop that has executed
          const sourceNode = nodesById[edge.source as Id];
          if (sourceNode) {
            if (sourceNode.type === 'router') {
              const routerData = sourceNode.data as RouterData;
              if (routerData.executedRoute) {
                // Non-selected path from executed router: gray, thin, dimmed, not animated
                return {
                  ...edge,
                  style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 },
                  animated: false
                };
              }
            } else if (sourceNode.type === 'loop') {
              const loopData = sourceNode.data as LoopData;
              // Dim the non-selected loop edge
              if (edge.sourceHandle === 'continue' && loopData.executedExit) {
                // Continue edge when loop exited: dimmed
                return {
                  ...edge,
                  style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 },
                  animated: false
                };
              } else if (edge.sourceHandle === 'exit' && !loopData.executedExit) {
                // Exit edge when loop continuing: dimmed
                return {
                  ...edge,
                  style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 },
                  animated: false
                };
              }
            }
          }
          // Edge not from an executed router/loop: keep current style
          return edge;
        }
      }));

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
          if (node.type === 'loop') {
            const loopData = node.data as LoopData;
            return !loopData.executedExit;
          }
          return false;
        });

        if (continuingLoops.length > 0) {
          // For continuing loops, we need to re-add nodes in the loop body to execution
          // Clear executedNodes for loop body nodes so they can execute again
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

            // BFS to find all nodes in loop body (until we reach the loop node again)
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

            // Clear executed status for loop body nodes
            loopBodyNodes.forEach(nodeId => {
              executedNodes.delete(nodeId);
            });
          });
        }
      }

      // Get remaining nodes (not yet executed)
      const remainingNodes = topologicalOrder.filter(nodeId => !executedNodes.has(nodeId));

      if (remainingNodes.length > 0) {
        // Recalculate levels for remaining nodes using filtered edges
        const newLevels = groupNodesByLevel(remainingNodes, activeEdges);

        // Replace remaining levels with recalculated ones
        levels = [
          ...levels.slice(0, levelIndex + 1),
          ...newLevels
        ];

        if (hasRouterInLevel && hasLoopInLevel) {
          setLogs((logs) => logs.concat(`🔀 Recalculated execution path based on router and loop decisions`));
        } else if (hasRouterInLevel) {
          setLogs((logs) => logs.concat(`🔀 Recalculated execution path based on router decisions`));
        } else {
          setLogs((logs) => logs.concat(`🔁 Recalculated execution path based on loop decisions`));
        }
      }
    }
  }

  setLogs((logs) => logs.concat("✅ Done."));

  return { memory: workflowMemory };
}
