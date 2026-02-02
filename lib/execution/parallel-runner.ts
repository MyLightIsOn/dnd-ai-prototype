import React from "react";
import { topoSort } from "@/lib/topoSort";
import type { Edge } from "@xyflow/react";
import type { AgentData, ToolData, TypedNode, Id, ChunkerData, RouterData } from "@/types";
import type { DocumentData } from "@/types/document";
import { getProvider } from "@/lib/providers";
import { getApiKey } from "@/lib/storage/api-keys";
import type { Message } from "@/lib/providers/base";
import { chunkDocument } from "@/lib/document/chunker";
import { groupNodesByLevel } from "./levels";
import { evaluateRoutes } from "./route-evaluator";

/**
 * Filters edges based on router execution decisions.
 * For router nodes: only keeps edges where sourceHandle matches the selected route.
 * For non-router nodes: keeps all edges.
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

    // If source node doesn't exist or is not a router, keep the edge
    if (!sourceNode || sourceNode.type !== 'router') {
      return true;
    }

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

interface NodeExecutionContext {
  nodesById: Record<Id, TypedNode>;
  incomingEdgesByNode: Record<Id, Id[]>;
  nodeOutputs: Record<Id, string>;
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>;
  executionControl?: React.MutableRefObject<ExecutionStatus>;
}

/**
 * Execute a single node and return its output
 * Throws an error if execution fails
 */
async function executeNode(
  nodeId: Id,
  context: NodeExecutionContext
): Promise<string> {
  const { nodesById, incomingEdgesByNode, nodeOutputs, setLogs, setNodes } = context;
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

      // Evaluate routes
      const selectedRouteId = await evaluateRoutes(input, routerData);

      // Determine which route to use
      let executedRoute: string;
      if (selectedRouteId) {
        // A route matched
        executedRoute = selectedRouteId;
        const selectedRoute = routerData.routes?.find(r => r.id === selectedRouteId);
        setLogs(logs => logs.concat(`🔀 ${routerData.name || 'Router'}: Routed to "${selectedRoute?.label || 'Unknown'}"`));
        output = input; // Pass through input to selected route
      } else if (routerData.defaultRoute) {
        // No route matched, but default route is configured
        executedRoute = 'default';
        setLogs(logs => logs.concat(`⚠️ ${routerData.name || 'Router'}: No routes matched, using default route`));
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
) {
  // Clear previous logs
  setLogs([]);

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

  // Track which nodes have been executed to avoid re-execution
  const executedNodes = new Set<Id>();

  // Execute each level sequentially
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];

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
      return;
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
        return;
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
      executionControl
    };

    // Execute all nodes in this level in parallel
    const results = await Promise.allSettled(
      nodesToExecute.map(nodeId => executeNode(nodeId, context))
    );

    // Track if this level contains any router nodes
    let hasRouterInLevel = false;

    // Process results and handle errors
    for (let i = 0; i < nodesToExecute.length; i++) {
      const nodeId = nodesToExecute[i];
      const result = results[i];

      // Mark node as executed
      executedNodes.add(nodeId);

      // Check if this node is a router
      const node = nodesById[nodeId];
      if (node.type === 'router') {
        hasRouterInLevel = true;
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
            return;
          }
          // For skip or retry, continue (retry logic would need level re-execution)
          // For now, we skip failed nodes and continue
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));

    // If this level contained routers, recalculate levels with filtered edges
    if (hasRouterInLevel) {
      // Get active edges based on router decisions
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
          // Check if this edge comes from a router that has executed
          const sourceNode = nodesById[edge.source as Id];
          if (sourceNode && sourceNode.type === 'router') {
            const routerData = sourceNode.data as RouterData;
            if (routerData.executedRoute) {
              // Non-selected path from executed router: gray, thin, dimmed, not animated
              return {
                ...edge,
                style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 0.3 },
                animated: false
              };
            }
          }
          // Edge not from an executed router: keep current style
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

        setLogs((logs) => logs.concat(`🔀 Recalculated execution path based on router decisions`));
      }
    }
  }

  setLogs((logs) => logs.concat("✅ Done."));
}
