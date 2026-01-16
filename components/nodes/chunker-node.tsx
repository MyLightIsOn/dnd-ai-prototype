import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import type { ChunkerData } from "@/types";

function NodeChrome({
  title,
  subtitle,
  color = "",
  children,
  executionState,
}: {
  title: string | React.ReactNode;
  subtitle?: string;
  color?: string;
  children?: React.ReactNode;
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
}) {
  const borderColor =
    executionState === 'executing' ? 'border-blue-500 border-2 animate-pulse' :
    executionState === 'completed' ? 'border-green-500 border-2' :
    executionState === 'error' ? 'border-red-500 border-2' :
    'border';

  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl ${borderColor} shadow-sm min-w-[200px]`}>
      {/* Add handles on all sides - each can be both source and target for flexibility */}
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <div
        className={`px-3 py-2 rounded-t-2xl text-xs font-medium ${color} text-white`}
      >
        {title}
      </div>
      <div className="p-3 space-y-2">
        {subtitle && (
          <div className="text-[11px] text-gray-500">{subtitle}</div>
        )}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export const ChunkerNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as ChunkerData;
  const chunkCount = d.chunks?.length || 0;

  return (
    <NodeChrome
      title={d.name || "Chunker"}
      subtitle={d.strategy?.toUpperCase() || "FIXED"}
      color="bg-purple-500"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700 space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Size:</span>
          <span className="font-medium">{d.chunkSize || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Overlap:</span>
          <span className="font-medium">{d.overlap || 0}</span>
        </div>
        {chunkCount > 0 && (
          <div className="flex justify-between pt-1 border-t">
            <span className="text-gray-500">Chunks:</span>
            <span className="font-medium text-purple-600">{chunkCount}</span>
          </div>
        )}
      </div>
    </NodeChrome>
  );
};
