import type { Edge, Node } from "@xyflow/react";
import type { Id } from "@/types";

// Utility: simple topological ordering; detects cycles
export function topoSort(
  nodes: Node[],
  edges: Edge[],
): { order: Id[]; hasCycle: boolean } {
  const inDeg = new Map<Id, number>();
  const out = new Map<Id, Id[]>();
  nodes.forEach((n) => {
    inDeg.set(n.id, 0);
    out.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!inDeg.has(e.target as Id)) inDeg.set(e.target as Id, 0);
    inDeg.set(e.target as Id, (inDeg.get(e.target as Id) || 0) + 1);
    if (!out.has(e.source as Id)) out.set(e.source as Id, []);
    out.get(e.source as Id)!.push(e.target as Id);
  });
  const q: Id[] = [];
  inDeg.forEach((v, k) => v === 0 && q.push(k));
  const order: Id[] = [];
  while (q.length) {
    const k = q.shift() as Id;
    order.push(k);
    (out.get(k) || []).forEach((t) => {
      inDeg.set(t, (inDeg.get(t) || 0) - 1);
      if (inDeg.get(t) === 0) q.push(t);
    });
  }
  if (order.length !== nodes.length) return { order: [], hasCycle: true };
  return { order, hasCycle: false };
}
