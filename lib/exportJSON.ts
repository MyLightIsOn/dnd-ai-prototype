import type { Edge } from "@xyflow/react";
import type { TypedNode } from "@/types";

export function exportJSON({ nodes, edges }: { nodes: TypedNode[]; edges: Edge[] }) {
  const payload = JSON.stringify({ nodes, edges }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "workflow.json";
  a.click();
  URL.revokeObjectURL(url);
}
