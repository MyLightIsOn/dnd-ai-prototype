import React from "react";
import type { NodeProps, NodeTypes } from "@xyflow/react";

// --- Types (kept local to avoid repo-wide churn) ---
export type AgentData = {
  name?: string;
  model?: string;
  prompt?: string;
  preview?: string;
};
export type ToolData = {
  name?: string;
  kind?: string;
  config?: { endpoint?: string };
};
export type OutputData = { name?: string; preview?: string };
export type NodeData = AgentData | ToolData | OutputData;

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

export const AgentNode: React.FC<NodeProps<AgentData>> = ({ data }) => {
  return (
    <NodeChrome
      title={data.name || "Agent"}
      subtitle={data.model || "model"}
      color="bg-indigo-500"
    >
      <div className="text-gray-700 line-clamp-3">
        {data.prompt || "Prompt goes here…"}
      </div>
    </NodeChrome>
  );
};

export const ToolNode: React.FC<NodeProps<ToolData>> = ({ data }) => (
  <NodeChrome title={data.name || "Tool"} subtitle={data.kind || "HTTP/DB/Code"} color="bg-emerald-500">
    <div className="text-gray-700">
      {data.config?.endpoint ? (
        <div className="text-[11px] break-all">{data.config.endpoint}</div>
      ) : (
        <div className="text-[11px]">No config</div>
      )}
    </div>
  </NodeChrome>
);

export const OutputNode: React.FC<NodeProps<OutputData>> = ({ data }) => (
  <NodeChrome title={data.name || "Output"} subtitle="Terminal" color="bg-slate-600">
    <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto">
      {data.preview || "Will show the final result."}
    </div>
  </NodeChrome>
);

export const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  output: OutputNode,
};
