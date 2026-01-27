import type { Edge } from "@xyflow/react";
import type { Id } from "@/types";

/**
 * Groups nodes by their dependency depth for parallel execution.
 *
 * Nodes are grouped into levels where:
 * - Level 0: Nodes with no dependencies (no incoming edges)
 * - Level 1: Nodes that depend only on Level 0 nodes
 * - Level 2: Nodes that depend on Level 0 or Level 1 nodes
 * - And so on...
 *
 * Nodes within the same level can be executed in parallel since they don't
 * depend on each other. Levels must be executed sequentially.
 *
 * @param sortedNodes - Array of node IDs in topological order
 * @param edges - Array of edges defining dependencies
 * @returns Array of arrays, where each inner array is a level containing node IDs
 *
 * @example
 * // Given nodes: A -> B, A -> C, B -> D, C -> D
 * // Returns: [[A], [B, C], [D]]
 * // Meaning: A runs first, then B and C run in parallel, then D runs
 */
export function groupNodesByLevel(
  sortedNodes: Id[],
  edges: Edge[]
): Id[][] {
  // Build adjacency map: for each node, track which nodes it depends on (incoming edges)
  const incomingEdges = new Map<Id, Set<Id>>();

  // Initialize all nodes with empty dependency sets
  for (const nodeId of sortedNodes) {
    incomingEdges.set(nodeId, new Set());
  }

  // Populate incoming edges (dependencies)
  for (const edge of edges) {
    const target = edge.target as Id;
    const source = edge.source as Id;

    if (incomingEdges.has(target)) {
      incomingEdges.get(target)!.add(source);
    }
  }

  // Calculate the level (depth) for each node
  const nodeLevels = new Map<Id, number>();

  for (const nodeId of sortedNodes) {
    const dependencies = incomingEdges.get(nodeId)!;

    if (dependencies.size === 0) {
      // No dependencies = Level 0 (root nodes)
      nodeLevels.set(nodeId, 0);
    } else {
      // Level is 1 + max level of all dependencies
      let maxDependencyLevel = -1;

      for (const depId of dependencies) {
        const depLevel = nodeLevels.get(depId);
        if (depLevel !== undefined && depLevel > maxDependencyLevel) {
          maxDependencyLevel = depLevel;
        }
      }

      nodeLevels.set(nodeId, maxDependencyLevel + 1);
    }
  }

  // Group nodes by their level
  const levelGroups: Id[][] = [];
  const maxLevel = Math.max(...Array.from(nodeLevels.values()));

  // Initialize empty arrays for each level
  for (let i = 0; i <= maxLevel; i++) {
    levelGroups[i] = [];
  }

  // Assign nodes to their respective levels
  for (const [nodeId, level] of nodeLevels.entries()) {
    levelGroups[level].push(nodeId);
  }

  // Filter out any empty levels (shouldn't happen, but be safe)
  return levelGroups.filter(level => level.length > 0);
}

/**
 * Helper function to get all nodes that a given node depends on.
 * Useful for debugging and validation.
 */
export function getNodeDependencies(nodeId: Id, edges: Edge[]): Id[] {
  return edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source as Id);
}

/**
 * Helper function to get all nodes that depend on a given node.
 * Useful for determining downstream impact of node changes.
 */
export function getNodeDependents(nodeId: Id, edges: Edge[]): Id[] {
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => edge.target as Id);
}
