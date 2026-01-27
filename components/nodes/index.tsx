import React from "react";
import type { NodeProps, NodeTypes } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import type { AgentData, ToolData, OutputData, PromptData } from "@/types";
import { DocumentNode } from "./document-node";
import { ChunkerNode } from "./chunker-node";
import { RouterNode } from "./router-node";

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

export const AgentNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as AgentData;

  // Parse provider from model string (format: provider/model-id)
  const modelString = d.model || "openai/gpt-4o-mini";
  const [provider, modelId] = modelString.split("/");

  // Get provider display info
  const providerInfo = {
    openai: { icon: "🟢", name: "OpenAI" },
    anthropic: { icon: "🟣", name: "Anthropic" },
    google: { icon: "🔵", name: "Google" },
    ollama: { icon: "🟠", name: "Ollama" },
  }[provider] || { icon: "🤖", name: provider };

  // Get mode badge
  const mode = d.mode || "mock";
  const modeBadge = mode.toUpperCase();
  const modeBadgeColor = mode === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";

  return (
    <NodeChrome
      title={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>{providerInfo.icon}</span>
            <span>{d.name || "Agent"}</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${modeBadgeColor} font-semibold`}>
            {modeBadge}
          </span>
        </div>
      }
      subtitle={providerInfo.name}
      color="bg-indigo-500"
      executionState={d.executionState}
    >
      <div className="space-y-1">
        <div className="text-gray-700 font-medium text-sm">
          {modelId || "gpt-4o-mini"}
        </div>
        {d.temperature !== undefined || d.streaming ? (
          <div className="text-[10px] text-gray-500 flex items-center gap-2">
            {d.temperature !== undefined && <span>temp: {d.temperature.toFixed(1)}</span>}
            {d.temperature !== undefined && d.streaming && <span>•</span>}
            {d.streaming && <span>stream</span>}
          </div>
        ) : null}
      </div>
    </NodeChrome>
  );
};

export const ToolNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as ToolData;
  return (
    <NodeChrome
      title={d.name || "Tool"}
      subtitle={d.kind || "HTTP/DB/Code"}
      color="bg-orange-600"
      executionState={d.executionState}
    >
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

export const ResultNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as OutputData;
  return (
    <NodeChrome
      title={d.name || "Result"}
      subtitle="Terminal"
      color="bg-slate-600"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto ">
        {d.preview || "Will show the final result."}
      </div>
    </NodeChrome>
  );
};

export const PromptNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as PromptData;
  return (
    <NodeChrome
      title={d.name || "Prompt"}
      subtitle="Input"
      color="bg-emerald-500"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto ">
        {d.text || "Prompt goes here"}
      </div>
    </NodeChrome>
  );
};

export const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  result: ResultNode,
  prompt: PromptNode,
  document: DocumentNode,
  chunker: ChunkerNode,
  router: RouterNode,
};
