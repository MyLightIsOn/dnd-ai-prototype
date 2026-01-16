import React from "react";
import { topoSort } from "@/lib/topoSort";
import type { Edge } from "@xyflow/react";
import type { AgentData, ToolData, OutputData, TypedNode, Id } from "@/types";
import { getProvider } from "@/lib/providers";
import { getApiKey } from "@/lib/storage/api-keys";
import type { Message } from "@/lib/providers/base";

/**
 * Build the message array for an LLM completion request.
 * Combines dependency outputs and the agent's prompt into a structured message format.
 */
function buildMessages(agentData: AgentData, inputs: string[]): Message[] {
  const messages: Message[] = [];

  if (inputs.length > 0) {
    messages.push({
      role: 'user',
      content: inputs.join('\n\n')
    });
  }

  messages.push({
    role: 'user',
    content: agentData.prompt
  });

  return messages;
}

// Executes the graph by traversing nodes in topological order and producing log output.
export async function run(
  nodes: TypedNode[],
  edges: Edge[],
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>,
) {
  // Clear previous logs before starting a new run
  setLogs([]);

  // Compute a topological ordering of nodes; detect cycles early
  const { order: topologicalOrder, hasCycle } = topoSort(nodes, edges);
  if (hasCycle) {
    setLogs((logs) => logs.concat("❌ Graph has a cycle. Break loops to run."));
    return;
  }

  // Build a lookup map from node id to node for quick access during execution
  const nodesById: Record<Id, TypedNode> = nodes.reduce(
    (acc, node) => {
      acc[node.id] = node;
      return acc;
    },
    {} as Record<Id, TypedNode>,
  );

  // Prepare a map of incoming edge sources for each node id
  const incomingEdgesByNode: Record<Id, Id[]> = nodes.reduce(
    (acc, node) => {
      acc[node.id] = [] as Id[];
      return acc;
    },
    {} as Record<Id, Id[]>,
  );

  // Fill incoming edges map: for each edge, register its source under the target node
  edges.forEach((edge) => incomingEdgesByNode[edge.target as Id].push(edge.source as Id));

  // Stores the produced string output for each node, keyed by id
  const nodeOutputs: Record<Id, string> = {};

  // Optional small delay between node executions for UX purposes
  const STEP_DELAY_MS = 200;

  // Execute nodes in topological order so dependencies are processed first
  for (const nodeId of topologicalOrder) {
    const node = nodesById[nodeId];

    if (node.type === "agent") {
      // Gather inputs from dependencies (upstream node outputs)
      const agentData = node.data as AgentData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const mode = agentData.mode || 'mock';
      const agentName = agentData.name || "Agent";
      const modelStr = agentData.model || "model";

      if (mode === 'mock') {
        // Mock mode: simulate agent execution
        const combinedInput = dependencyOutputs.join("\n");
        const logText = `🤖 ${agentName} (${modelStr}) [MOCK]\nPrompt: ${agentData.prompt || ""}\nInput: ${combinedInput || "<none>"}\nOutput: ${Math.random()
          .toString(36)
          .slice(2, 8)} …`;

        nodeOutputs[node.id] = logText;
        setLogs((logs) => logs.concat(logText));
      } else {
        // Live mode: call real LLM provider
        if (!agentData.model || !agentData.model.includes('/')) {
          const errorMsg = `❌ ${agentName}: Invalid model format. Expected "provider/model-id"`;
          setLogs((logs) => logs.concat(errorMsg));
          throw new Error(errorMsg);
        }

        const [providerName, modelId] = agentData.model.split('/', 2);
        const provider = getProvider(providerName);

        if (!provider) {
          const errorMsg = `❌ ${agentName}: Provider "${providerName}" not found`;
          setLogs((logs) => logs.concat(errorMsg));
          throw new Error(errorMsg);
        }

        const apiKey = getApiKey(providerName);
        if (!apiKey) {
          const errorMsg = `❌ ${agentName}: No API key found for provider "${providerName}"`;
          setLogs((logs) => logs.concat(errorMsg));
          throw new Error(errorMsg);
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

          try {
            const streamIterator = provider.stream({
              model: modelId,
              messages,
              temperature: agentData.temperature,
              maxTokens: agentData.maxTokens,
              apiKey
            });

            // Convert AsyncIterator to AsyncIterable for for-await-of
            const stream = {
              [Symbol.asyncIterator]() {
                return streamIterator;
              }
            };

            for await (const chunk of stream) {
              accumulatedOutput += chunk.delta;

              // Update the last log entry with accumulated output
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

            nodeOutputs[node.id] = accumulatedOutput;
          } catch (error) {
            const errorMsg = `❌ ${agentName}: Streaming failed - ${error instanceof Error ? error.message : String(error)}`;
            setLogs((logs) => {
              const updated = [...logs];
              updated[logIndex] = errorMsg;
              return updated;
            });
            throw new Error(errorMsg);
          }
        } else {
          // Non-streaming mode
          setLogs((logs) => logs.concat(`🤖 ${agentName} (${modelStr})\n⏳ Waiting for response...`));

          try {
            const response = await provider.complete({
              model: modelId,
              messages,
              temperature: agentData.temperature,
              maxTokens: agentData.maxTokens,
              apiKey
            });

            const cost = provider.calculateCost(modelId, response.usage);
            const logText = `🤖 ${agentName} (${modelStr})\n${response.content}\n💰 Cost: $${cost.toFixed(6)} | Tokens: ${response.usage.totalTokens}`;

            nodeOutputs[node.id] = response.content;
            setLogs((logs) => {
              const updated = [...logs];
              updated[updated.length - 1] = logText;
              return updated;
            });
          } catch (error) {
            const errorMsg = `❌ ${agentName}: Request failed - ${error instanceof Error ? error.message : String(error)}`;
            setLogs((logs) => {
              const updated = [...logs];
              updated[updated.length - 1] = errorMsg;
              return updated;
            });
            throw new Error(errorMsg);
          }
        }
      }
    } else if (node.type === "tool") {
      // Gather inputs from dependencies for tool call
      const toolData = node.data as ToolData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);
      const endpoint = toolData?.config?.endpoint || "(no endpoint)";

      const logText = `🔧 ${toolData.name || "Tool"} [${toolData.kind || "tool"}]\nGET ${endpoint}\nBody: ${dependencyOutputs
        .join("\n")
        .slice(0, 120)}`;

      nodeOutputs[node.id] = logText;
      setLogs((logs) => logs.concat(logText));
    } else if (node.type === "output") {
      // Final output node gathers the last available upstream output
      const outputData = node.data as OutputData;
      const dependencyOutputs = incomingEdgesByNode[node.id]
        .map((depId) => nodeOutputs[depId])
        .filter(Boolean);

      const finalText = `📦 Final: ${dependencyOutputs[dependencyOutputs.length - 1] || dependencyOutputs.join("\n") || "<empty>"}`;

      nodeOutputs[node.id] = finalText;
      setLogs((logs) => logs.concat(finalText));

      // Update the output node preview with a truncated version of the result
      setNodes((currentNodes) =>
        currentNodes.map((mapped) =>
          mapped.id === node.id
            ? { ...mapped, data: { ...mapped.data, preview: finalText.slice(0, 140) } }
            : mapped,
        ),
      );
    }

    // Small delay for visual feedback in the UI
    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
  }

  setLogs((logs) => logs.concat("✅ Done."));
}
