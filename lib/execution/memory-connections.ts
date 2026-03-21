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
): MemoryConnection[] {
  // Find memory nodes
  const memoryNodes = nodes.filter((n) => n.type === 'memory');
  if (memoryNodes.length === 0) return [];

  const memoryNodeId = memoryNodes[0].id;
  const connections: MemoryConnection[] = [];

  nodes.forEach((node) => {
    if (node.type !== 'agent') return;
    const data = node.data as AgentData;
    const reads: string[] = data.memoryRead ?? [];
    const writeKey: string | undefined = data.memoryWrite;

    if (reads.length > 0) {
      connections.push({ source: memoryNodeId, target: node.id, type: 'read', keys: reads });
    }
    if (writeKey) {
      connections.push({ source: node.id, target: memoryNodeId, type: 'write', keys: [writeKey] });
    }
  });

  return connections;
}
