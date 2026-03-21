import React from "react";
import { Input } from "../ui/input";
import type { MemoryData } from "@/types/memory";

interface MemoryPropertiesProps {
  data: MemoryData;
  onChange: (patch: Partial<MemoryData>) => void;
}

export function MemoryProperties({ data, onChange }: MemoryPropertiesProps) {
  const scope = data.scope || 'workflow';
  const keys = data.keys || [];

  return (
    <div className="space-y-4">
      {/* Scope Dropdown */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Scope</label>
        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={scope}
          onChange={(e) => onChange({ scope: e.target.value as 'workflow' | 'global' })}
        >
          <option value="workflow">Workflow (resets each run)</option>
          <option value="global">Global (persists across runs)</option>
        </select>
        <div className="text-[11px] text-gray-500">
          {scope === 'workflow' &&
            'Memory is cleared at the start of each workflow run'}
          {scope === 'global' &&
            'Memory persists across multiple workflow runs in the same session'}
        </div>
      </div>

      {/* Keys Input */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Keys (comma-separated)</label>
        <Input
          type="text"
          placeholder="e.g., user_name, context, history"
          value={keys.join(', ')}
          onChange={(e) => {
            const parsed = e.target.value
              .split(',')
              .map((k) => k.trim())
              .filter((k) => k.length > 0);
            onChange({ keys: parsed });
          }}
          className="text-sm"
        />
        <div className="text-[11px] text-gray-500">
          Named slots this node reads from or writes to
        </div>
      </div>
    </div>
  );
}
