import React from "react";
import { topoSort } from "@/lib/topoSort";
import type { Edge } from "@xyflow/react";
import type { AgentData, ToolData, OutputData, TypedNode, Id } from "@/types";

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
      const combinedInput = dependencyOutputs.join("\n");

      // Simulate agent execution and log details
      const logText = `🤖 ${agentData.name || "Agent"} (${agentData.model || "model"})\nPrompt: ${agentData.prompt || ""}\nInput: ${combinedInput || "<none>"}\nOutput: ${Math.random()
        .toString(36)
        .slice(2, 8)} …`;

      nodeOutputs[node.id] = logText;
      setLogs((logs) => logs.concat(logText));
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
