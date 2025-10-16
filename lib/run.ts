import React from "react";
import type { Edge } from "@xyflow/react";
import type { TypedNode } from "@/types";
import type { RFNode, RFEdge, SetNodesFn } from "@/types";
import { runFlow } from "@/lib/runFlow";

// Executes the graph by traversing nodes in topological order and producing log output.
export async function run(
  nodes: TypedNode[],
  edges: Edge[],
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>,
  runnable: boolean,
  setRunnable: React.Dispatch<React.SetStateAction<boolean>>,
) {
  // Clear previous logs before starting a new run
  setLogs([]);

  if (!runnable) return;
  setRunnable(false);

  const controller = new AbortController();

  try {
    await runFlow({
      nodes: nodes as unknown as RFNode[],
      edges: edges as unknown as RFEdge[],
      setNodes: setNodes as unknown as SetNodesFn,
      setLogs,
      env: {
        OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        OLLAMA_BASE_URL: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL,
        GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        GOOGLE_OAUTH_TOKEN: undefined,
      },
      signal: controller.signal,
    });
  } finally {
    setRunnable(true);
  }

  setLogs((logs) => logs.concat("✅ Done."));
}
