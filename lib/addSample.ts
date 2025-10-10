import { MarkerType, type Edge } from "@xyflow/react";
import type { TypedNode } from "@/types";

// Creates and sets a sample graph into the provided setters
export function addSample(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const a1: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 100, y: 100 },
    data: {
      name: "Researcher",
      model: "gpt-4o-mini",
      prompt: "Summarize docs into 3 bullets.",
    },
  } as TypedNode;
  const t1: TypedNode = {
    id: crypto.randomUUID(),
    type: "tool",
    position: { x: 400, y: 120 },
    data: {
      name: "WebFetch",
      kind: "http",
      config: { endpoint: "https://example.com" },
    },
  } as TypedNode;
  const a2: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 700, y: 100 },
    data: {
      name: "Writer",
      model: "gpt-4o-mini",
      prompt: "Turn bullets into a friendly paragraph.",
    },
  } as TypedNode;
  const out: TypedNode = {
    id: crypto.randomUUID(),
    type: "output",
    position: { x: 1000, y: 120 },
    data: { name: "Final Output", preview: "" },
  } as TypedNode;
  const es: Edge[] = [
    { id: crypto.randomUUID(), source: a1.id, target: t1.id },
    { id: crypto.randomUUID(), source: t1.id, target: a2.id },
    { id: crypto.randomUUID(), source: a2.id, target: out.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));
  setNodes([a1, t1, a2, out]);
  setEdges(es);
}
