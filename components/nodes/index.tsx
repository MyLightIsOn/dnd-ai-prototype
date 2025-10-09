import React from "react";
import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { AgentData, ToolData, OutputData } from "@/types";

function NodeChrome({
  title,
  subtitle,
  color = "",
  children,
}: {
  title: string;
  subtitle?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl border shadow-sm min-w-[200px]">
      <div className={`px-3 py-2 rounded-t-2xl text-xs font-medium ${color} text-white`}>
        {title}
      </div>
      <div className="p-3 space-y-2">
        {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export const AgentNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as AgentData;
  return (
    <NodeChrome
      title={d.name || "Agent"}
      subtitle={d.model || "model"}
      color="bg-indigo-500"
    >
      <div className="text-gray-700 line-clamp-3">
        {d.prompt || "Prompt goes here…"}
      </div>
    </NodeChrome>
  );
};

export const ToolNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as ToolData;
  return (
    <NodeChrome title={d.name || "Tool"} subtitle={d.kind || "HTTP/DB/Code"} color="bg-emerald-500">
      <div className="text-gray-700">
        {d.config?.endpoint ? (
          <div className="text-[11px] break-all">{d.config.endpoint}</div>
        ) : (
          <div className="text-[11px]">No config</div>
        )}
      </div>
    </NodeChrome>
  );
};

export const OutputNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as OutputData;
  return (
    <NodeChrome title={d.name || "Output"} subtitle="Terminal" color="bg-slate-600">
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto">
        {d.preview || "Will show the final result."}
      </div>
    </NodeChrome>
  );
};

export const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  output: OutputNode,
};
