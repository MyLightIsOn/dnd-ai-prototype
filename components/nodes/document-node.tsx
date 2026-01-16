import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import type { DocumentData } from "@/types";

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

export const DocumentNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as DocumentData;
  const sizeKB = d.size ? (d.size / 1024).toFixed(1) : '0.0';

  return (
    <NodeChrome
      title={d.name || "Document"}
      subtitle={d.fileType?.toUpperCase() || "File"}
      color="bg-emerald-500"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700">
        {d.fileName ? (
          <>
            <div className="font-medium truncate max-w-[180px]">{d.fileName}</div>
            <div className="text-gray-500 mt-1">{sizeKB} KB</div>
            {d.content && (
              <div className="text-gray-500">{d.content.length} characters</div>
            )}
          </>
        ) : (
          <div className="text-gray-500">No file uploaded</div>
        )}
      </div>
    </NodeChrome>
  );
};
