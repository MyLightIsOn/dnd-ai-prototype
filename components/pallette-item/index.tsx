import React from "react";
import { Plus } from "lucide-react";

// --- Types ---
type AgentData = {
  name?: string;
  model?: string;
  prompt?: string;
  preview?: string;
};
type ToolData = {
  name?: string;
  kind?: string;
  config?: { endpoint?: string };
};
type OutputData = { name?: string; preview?: string };
type NodeData = AgentData | ToolData | OutputData;

function PaletteItem({
  type,
  label,
  meta,
}: {
  type: "agent" | "tool" | "output";
  label: string;
  meta?: NodeData;
}) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ type, meta }),
    );
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center justify-between w-full px-3 py-2 border rounded-xl hover:bg-gray-50 cursor-grab active:cursor-grabbing"
    >
      <span className="text-sm">{label}</span>
      <Plus size={16} />
    </div>
  );
}

export default PaletteItem;
