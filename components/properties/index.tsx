'use client';
import React from "react";
import { Input } from "../ui/input";
import type { NodeData } from "@/types";
import { useSelectedNode } from "@/lib/store/selectors";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import '@/lib/node-types/built-in/index';
import { getNodeType } from "@/lib/node-types/registry";

function PropertiesPanel() {
  const selected = useSelectedNode();
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);

  const onChange = (patch: Partial<NodeData>) => {
    if (!selected) return;
    updateNodeData(selected.id, patch);
  };

  if (!selected)
    return (
      <div className="text-sm text-gray-500">
        Select a node to edit its properties.
      </div>
    );
  const { id, type, data } = selected;

  const nodeTypeDef = getNodeType(type ?? '');
  const PropertiesComponent = nodeTypeDef?.propertiesComponent ?? null;

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
      {PropertiesComponent ? (
        <PropertiesComponent
          data={data as Record<string, unknown>}
          onChange={onChange as (patch: Record<string, unknown>) => void}
        />
      ) : (
        <div className="text-sm text-gray-500">No properties available for this node type.</div>
      )}
    </div>
  );
}

export default PropertiesPanel;
