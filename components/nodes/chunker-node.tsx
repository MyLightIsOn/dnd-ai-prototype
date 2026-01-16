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
      {/* Output handles (blue) - drag FROM these to create connections */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ left: '40%', background: '#3b82f6', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ left: '60%', background: '#3b82f6', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ top: '60%', background: '#3b82f6', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ top: '40%', background: '#3b82f6', width: '10px', height: '10px', border: '2px solid white' }}
      />

      {/* Input handles (green) - drag TO these to complete connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ left: '60%', background: '#10b981', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ left: '40%', background: '#10b981', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ top: '40%', background: '#10b981', width: '10px', height: '10px', border: '2px solid white' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ top: '60%', background: '#10b981', width: '10px', height: '10px', border: '2px solid white' }}
      />
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
