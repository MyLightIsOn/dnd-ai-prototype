/**
 * Example usage and manual tests for level grouping algorithm
 *
 * To run this manually:
 * 1. Uncomment the code at the bottom
 * 2. Run: npx tsx lib/execution/levels.test.example.ts
 *
 * Or import these examples into your own test file
 */

import type { Edge } from "@xyflow/react";
import type { Id } from "@/types";
import { groupNodesByLevel } from "./levels";

/**
 * Example 1: Linear chain (A -> B -> C -> D)
 * Expected: [[A], [B], [C], [D]]
 */
export function testLinearChain() {
  const nodes: Id[] = ["A", "B", "C", "D"];
  const edges: Edge[] = [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "B", target: "C" },
    { id: "e3", source: "C", target: "D" },
  ];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Linear Chain:", levels);
  // Expected: [['A'], ['B'], ['C'], ['D']]
}

/**
 * Example 2: Parallel branches (A -> B, A -> C, B -> D, C -> D)
 * Expected: [[A], [B, C], [D]]
 */
export function testParallelBranches() {
  const nodes: Id[] = ["A", "B", "C", "D"];
  const edges: Edge[] = [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "A", target: "C" },
    { id: "e3", source: "B", target: "D" },
    { id: "e4", source: "C", target: "D" },
  ];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Parallel Branches:", levels);
  // Expected: [['A'], ['B', 'C'], ['D']]
}

/**
 * Example 3: Multiple roots (A -> C, B -> C)
 * Expected: [[A, B], [C]]
 */
export function testMultipleRoots() {
  const nodes: Id[] = ["A", "B", "C"];
  const edges: Edge[] = [
    { id: "e1", source: "A", target: "C" },
    { id: "e2", source: "B", target: "C" },
  ];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Multiple Roots:", levels);
  // Expected: [['A', 'B'], ['C']]
}

/**
 * Example 4: Complex DAG
 *     A
 *    / \
 *   B   C
 *   |\ /|
 *   | X |
 *   |/ \|
 *   D   E
 *    \ /
 *     F
 * Expected: [[A], [B, C], [D, E], [F]]
 */
export function testComplexDAG() {
  const nodes: Id[] = ["A", "B", "C", "D", "E", "F"];
  const edges: Edge[] = [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "A", target: "C" },
    { id: "e3", source: "B", target: "D" },
    { id: "e4", source: "B", target: "E" },
    { id: "e5", source: "C", target: "D" },
    { id: "e6", source: "C", target: "E" },
    { id: "e7", source: "D", target: "F" },
    { id: "e8", source: "E", target: "F" },
  ];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Complex DAG:", levels);
  // Expected: [['A'], ['B', 'C'], ['D', 'E'], ['F']]
}

/**
 * Example 5: Disconnected graph (A -> B, C -> D)
 * Expected: [[A, C], [B, D]]
 */
export function testDisconnectedGraph() {
  const nodes: Id[] = ["A", "B", "C", "D"];
  const edges: Edge[] = [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "C", target: "D" },
  ];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Disconnected Graph:", levels);
  // Expected: [['A', 'C'], ['B', 'D']]
}

/**
 * Example 6: Single node (no edges)
 * Expected: [[A]]
 */
export function testSingleNode() {
  const nodes: Id[] = ["A"];
  const edges: Edge[] = [];

  const levels = groupNodesByLevel(nodes, edges);
  console.log("Single Node:", levels);
  // Expected: [['A']]
}

// Uncomment to run all tests:
/*
console.log("\n=== Level Grouping Algorithm Tests ===\n");
testLinearChain();
testParallelBranches();
testMultipleRoots();
testComplexDAG();
testDisconnectedGraph();
testSingleNode();
*/
