import type { Edge } from "@xyflow/react";
import type { Id, TypedNode } from "@/types";

/**
 * Detects cycles in the graph using DFS-based cycle detection.
 * Returns Set of node IDs that are part of cycles.
 */
function detectCycles(
  nodes: TypedNode[],
  edges: Edge[],
  adjacencyList: Map<Id, Id[]>
): Set<Id> {
  const cycleNodes = new Set<Id>();
  const visited = new Set<Id>();
  const recursionStack = new Set<Id>();

  function dfs(nodeId: Id): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - mark all nodes in recursion stack as cycle nodes
        cycleNodes.add(nodeId);
        cycleNodes.add(neighbor);
      }
    }

    recursionStack.delete(nodeId);
  }

  // Run DFS from each unvisited node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycleNodes;
}

export interface TopoSortResult {
  /** Topological order (partial if cycles exist) */
  order: Id[];
  /** Whether the graph contains cycles */
  hasCycle: boolean;
  /** Set of node IDs that are part of cycles */
  cycles: Set<Id>;
}

/**
 * Performs topological sort on the graph using Kahn's algorithm.
 * If cycles are detected:
 * - Returns partial order for acyclic nodes
 * - Identifies which nodes are in cycles
 * - Sets hasCycle to true
 */
export function topoSort(
  nodes: TypedNode[],
  edges: Edge[],
): TopoSortResult {
  // Build adjacency list and in-degree map
  const inDeg = new Map<Id, number>();
  const adjacencyList = new Map<Id, Id[]>();

  nodes.forEach((n) => {
    inDeg.set(n.id, 0);
    adjacencyList.set(n.id, []);
  });

  edges.forEach((e) => {
    const source = e.source as Id;
    const target = e.target as Id;

    if (!inDeg.has(target)) inDeg.set(target, 0);
    inDeg.set(target, (inDeg.get(target) || 0) + 1);

    if (!adjacencyList.has(source)) adjacencyList.set(source, []);
    adjacencyList.get(source)!.push(target);
  });

  // Kahn's algorithm for topological sort
  const q: Id[] = [];
  inDeg.forEach((v, k) => v === 0 && q.push(k));
  const order: Id[] = [];

  while (q.length) {
    const k = q.shift() as Id;
    order.push(k);

    (adjacencyList.get(k) || []).forEach((t) => {
      inDeg.set(t, (inDeg.get(t) || 0) - 1);
      if (inDeg.get(t) === 0) q.push(t);
    });
  }

  // Check if all nodes were ordered (no cycles)
  if (order.length === nodes.length) {
    return {
      order,
      hasCycle: false,
      cycles: new Set()
    };
  }

  // Cycles detected - identify which nodes are in cycles
  const cycleNodes = detectCycles(nodes, edges, adjacencyList);

  return {
    order, // Partial order (nodes that could be ordered before hitting cycles)
    hasCycle: true,
    cycles: cycleNodes
  };
}
