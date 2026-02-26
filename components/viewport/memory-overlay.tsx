'use client';

import { useNodes, useReactFlow } from '@xyflow/react';
import { MemoryConnection } from '@/lib/execution/memory-connections';

interface MemoryOverlayProps {
  connections: MemoryConnection[];
  visible: boolean;
}

export function MemoryOverlay({ connections, visible }: MemoryOverlayProps) {
  const rfNodes = useNodes();
  const { getViewport } = useReactFlow();

  if (!visible || connections.length === 0) return null;

  const nodeMap = Object.fromEntries(rfNodes.map((n) => [n.id, n]));
  const { x: vpX, y: vpY, zoom } = getViewport();

  function toScreen(flowX: number, flowY: number) {
    return { x: flowX * zoom + vpX, y: flowY * zoom + vpY };
  }

  function getCenter(nodeId: string) {
    const n = nodeMap[nodeId];
    if (!n) return null;
    const w = (n.measured?.width ?? 200);
    const h = (n.measured?.height ?? 100);
    return toScreen(n.position.x + w / 2, n.position.y + h / 2);
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 1000 }}
    >
      <defs>
        <marker id="mem-arrow-read" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#9333ea" opacity="0.7" />
        </marker>
        <marker id="mem-arrow-write" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#ec4899" opacity="0.7" />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const src = getCenter(conn.source);
        const tgt = getCenter(conn.target);
        if (!src || !tgt) return null;
        const color = conn.type === 'read' ? '#9333ea' : '#ec4899';
        const markerId = conn.type === 'read' ? 'mem-arrow-read' : 'mem-arrow-write';
        const dx = tgt.x - src.x;
        const d = `M${src.x},${src.y} C${src.x + dx * 0.4},${src.y} ${tgt.x - dx * 0.4},${tgt.y} ${tgt.x},${tgt.y}`;
        return (
          <path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6,4"
            fill="none"
            opacity={0.65}
            markerEnd={`url(#${markerId})`}
          />
        );
      })}
    </svg>
  );
}
