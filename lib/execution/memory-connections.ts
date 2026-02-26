import { Edge } from '@xyflow/react';
import { TypedNode } from '@/types/graph';
import { AgentData } from '@/types/agent';

export interface MemoryConnection {
  source: string;
  target: string;
  type: 'read' | 'write';
  keys: string[];
}

export function detectMemoryConnections(
  nodes: TypedNode[],
  _edges: Edge[],
): MemoryConnection[] {
  // Find memory nodes
  const memoryNodes = nodes.filter((n) => n.type === 'memory');
  if (memoryNodes.length === 0) return [];

  const memoryNodeId = memoryNodes[0].id;
  const connections: MemoryConnection[] = [];

  nodes.forEach((node) => {
    if (node.type !== 'agent') return;
    const data = node.data as AgentData;
    const reads: string[] = (data as any).memoryRead ?? [];
    const writeKey: string | undefined = (data as any).memoryWrite;

    if (reads.length > 0) {
      connections.push({ source: memoryNodeId, target: node.id, type: 'read', keys: reads });
    }
    if (writeKey) {
      connections.push({ source: node.id, target: memoryNodeId, type: 'write', keys: [writeKey] });
    }
  });

  return connections;
}
