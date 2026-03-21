// components/properties/tool-properties/code-exec-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CodeExecConfig } from "@/types/tool";

export function CodeExecProperties({
  config,
  onChange,
  lastResult,
}: {
  config: CodeExecConfig;
  onChange: (patch: Partial<CodeExecConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
        Runs JavaScript in a WebContainer (in-browser Node.js). First run may take a few seconds to boot.
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Code (JavaScript)</label>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          placeholder="console.log('Hello from WebContainers!');"
          value={config.code ?? ""}
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Timeout (seconds)</label>
        <Input
          type="number"
          min={1}
          max={60}
          value={config.timeout ?? 10}
          onChange={(e) =>
            onChange({ timeout: Math.min(60, Math.max(1, parseInt(e.target.value) || 10)) })
          }
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Output</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
