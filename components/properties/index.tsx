import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { AgentData, ToolData, OutputData } from "@/types";
import type { TypedNode } from "@/types";

function PropertiesPanel({
  selected,
  onChange,
}: {
  selected: TypedNode | null | undefined;
  onChange: (patch: Partial<AgentData & ToolData & OutputData>) => void;
}) {
  if (!selected)
    return (
      <div className="text-sm text-gray-500">
        Select a node to edit its properties.
      </div>
    );
  const { id, type, data } = selected;
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {id} • {type}
      </div>
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Name</label>
        <Input
          value={data.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      {type === "agent" && (
        <>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Model</label>
            <Input
              value={(data as AgentData).model || "gpt-4o-mini"}
              onChange={(e) => onChange({ model: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Prompt</label>
            <Textarea
              rows={5}
              value={(data as AgentData).prompt || ""}
              onChange={(e) => onChange({ prompt: e.target.value })}
            />
          </div>
        </>
      )}
      {type === "tool" && (
        <>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Kind</label>
            <Input
              value={(data as ToolData).kind || "http"}
              onChange={(e) => onChange({ kind: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Endpoint</label>
            <Input
              value={(data as ToolData).config?.endpoint || ""}
              onChange={(e) =>
                onChange({
                  config: {
                    ...((data as ToolData).config || {}),
                    endpoint: e.target.value,
                  },
                })
              }
            />
          </div>
        </>
      )}
      {type === "output" && (
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Label</label>
          <Input
            value={data.name || "Output"}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export default PropertiesPanel;
