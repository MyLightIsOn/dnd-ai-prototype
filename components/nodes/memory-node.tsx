import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import { Database } from "lucide-react";
import type { MemoryData } from "@/types/memory";

export const MemoryNode: React.FC<NodeProps> = ({ data }) => {
  const memoryData = data as unknown as MemoryData;
  const executionState = memoryData?.executionState || 'idle';

  const borderColor =
    executionState === 'executing' ? 'border-blue-500 border-2 animate-pulse' :
    executionState === 'completed' ? 'border-green-500 border-2' :
    executionState === 'error' ? 'border-red-500 border-2' :
    'border';

  const isGlobal = memoryData.scope === 'global';
  const scopeLabel = isGlobal ? '🌐 Global' : '🔄 Workflow';
  const scopeColor = isGlobal ? 'text-purple-600' : 'text-blue-600';

  const keyCount = memoryData.keys?.length || 0;

  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl ${borderColor} shadow-sm min-w-[200px]`}>
      {/* Input handle - target at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          left: '50%',
          background: '#10b981',
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
      />

      {/* Output handle - source at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{
          left: '50%',
          background: '#3b82f6',
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
      />

      <div className="px-3 py-2 rounded-t-2xl text-xs font-medium bg-violet-500 text-white flex items-center gap-2">
        <Database className="w-3.5 h-3.5" />
        <span>{memoryData.name || 'Memory'}</span>
      </div>

      <div className="p-3 space-y-2">
        {/* Scope indicator */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500">Scope</div>
          <div className={`text-[11px] font-semibold ${scopeColor}`}>
            {scopeLabel}
          </div>
        </div>

        {/* Key count */}
        {keyCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Keys</div>
            <div className="text-[11px] font-mono font-semibold text-gray-700">
              {keyCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
