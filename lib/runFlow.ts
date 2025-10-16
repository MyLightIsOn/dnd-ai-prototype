// lib/runtime/runFlow.ts
import {
  RFNode,
  RFEdge,
  EnvConfig,
  NodeOutput,
  SetNodesFn,
  SetLogsFn,
} from "@/types";
import { callLLM } from "./providers";
import { runTool } from "./tools";

// --- utils: graph helpers ---
function inEdges(nodeId: string, edges: RFEdge[]) {
  return edges.filter((e) => e.target === nodeId);
}
function outEdges(nodeId: string, edges: RFEdge[]) {
  return edges.filter((e) => e.source === nodeId);
}
function predecessors(nodeId: string, edges: RFEdge[]) {
  return inEdges(nodeId, edges).map((e) => e.source);
}
function successors(nodeId: string, edges: RFEdge[]) {
  return outEdges(nodeId, edges).map((e) => e.target);
}

function topoOrder(nodes: RFNode[], edges: RFEdge[]): string[] {
  // Kahn's algorithm
  const inDeg = new Map<string, number>();
  nodes.forEach((n) => inDeg.set(n.id, 0));
  edges.forEach((e) => inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1));

  const q: string[] = nodes
    .filter((n) => (inDeg.get(n.id) || 0) === 0)
    .map((n) => n.id);
  const order: string[] = [];

  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    outEdges(id, edges).forEach((e) => {
      const t = e.target;
      inDeg.set(t, (inDeg.get(t) || 0) - 1);
      if ((inDeg.get(t) || 0) === 0) q.push(t);
    });
  }

  // If cycle, fall back to node order to avoid hard crash
  if (order.length !== nodes.length) {
    const unresolved = nodes
      .map((n) => n.id)
      .filter((id) => !order.includes(id));
    return [...order, ...unresolved];
  }
  return order;
}

// Merge multiple upstream texts into a single input.
// You can customize this (e.g., JSON with port labels).
function mergeInputs(texts: string[]): string {
  return texts.join("\n\n");
}

// Update a "result" node's preview text
function updateResultPreview(
  setNodes: SetNodesFn,
  nodeId: string,
  text: string,
) {
  setNodes((current) =>
    current.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, preview: (text || "").slice(0, 140) } }
        : n,
    ),
  );
}

// --- main runner ---
export async function runFlow({
  nodes,
  edges,
  setNodes,
  setLogs,
  env,
  signal,
}: {
  nodes: RFNode[];
  edges: RFEdge[];
  setNodes: SetNodesFn;
  setLogs: SetLogsFn;
  env: EnvConfig;
  signal?: AbortSignal;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outputs = new Map<string, NodeOutput>();

  const order = topoOrder(nodes, edges);

  setLogs((logs) =>
    logs.concat(
      `▶️ Run started with ${nodes.length} nodes / ${edges.length} edges.`,
    ),
  );

  // Quick validation
  for (const e of edges) {
    if (!byId.get(e.source) || !byId.get(e.target)) {
      setLogs((logs) =>
        logs.concat(`⚠️ Edge "${e.id}" references missing node(s).`),
      );
    }
  }

  for (const nodeId of order) {
    if (signal?.aborted) throw new Error("Run aborted");

    const node = byId.get(nodeId);
    if (!node) continue;

    const preds = predecessors(nodeId, edges);
    const upstream = preds.map((pid) => outputs.get(pid)?.text || "");
    const input = mergeInputs(upstream);

    try {
      switch (node.type) {
        case "prompt": {
          const text = String(node.data?.text ?? "");
          outputs.set(nodeId, { text, meta: { kind: "prompt" } });
          setLogs((logs) =>
            logs.concat(
              `📝 Prompt[${node.data?.name || node.id}] → (${text.length} chars)`,
            ),
          );
          break;
        }

        case "agent": {
          const model = String(node.data?.model || "gpt-4o-mini");
          const prompt =
            input || String(node.data?.system || "You are a helpful agent.");
          setLogs((logs) =>
            logs.concat(
              `🤖 Agent[${node.data?.name || node.id}] model=${model} …`,
            ),
          );

          const result = await callLLM({ env, model, input: prompt, signal });
          outputs.set(nodeId, result);

          setLogs((logs) =>
            logs.concat(
              `🤖 Agent done (${(result.text || "").length} chars via ${result.meta?.provider}).`,
            ),
          );
          break;
        }

        case "tool": {
          const kind = String(node.data?.kind || "HTTP");
          const config = node.data?.config || {};
          const toolInput = input;
          setLogs((logs) =>
            logs.concat(
              `🧰 Tool[${node.data?.name || node.id}] kind=${kind} …`,
            ),
          );

          const result = await runTool({
            kind,
            config,
            input: toolInput,
            env,
            signal,
          });
          outputs.set(nodeId, result);

          setLogs((logs) =>
            logs.concat(`🧰 Tool done (${(result.text || "").length} chars).`),
          );
          break;
        }

        case "result": {
          const finalText = input;
          outputs.set(nodeId, { text: finalText, meta: { kind: "result" } });
          updateResultPreview(setNodes, nodeId, finalText);
          setLogs((logs) =>
            logs.concat(`📦 Result[${node.data?.name || node.id}] captured.`),
          );
          break;
        }

        default:
          setLogs((logs) =>
            logs.concat(
              `❓ Unknown node type "${node.type}" for ${node.id}. Skipped.`,
            ),
          );
      }
    } catch (err: any) {
      const message = err?.message || String(err);
      outputs.set(nodeId, { text: "", meta: { error: message } });
      setLogs((logs) =>
        logs.concat(
          `💥 Error at node ${node.data?.name || node.id}: ${message}`,
        ),
      );
      // Continue downstream with empty text so the run doesn't hard-stop.
    }
  }

  setLogs((logs) => logs.concat("✅ Done."));
  return outputs; // in case you want to inspect after run
}
