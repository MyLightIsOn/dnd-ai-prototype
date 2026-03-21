// components/properties/tool-properties/index.tsx
"use client";
import React from "react";
import type { ToolData, ToolKind, WebSearchConfig, CodeExecConfig, HttpConfig, DatabaseConfig } from "@/types/tool";
import { defaultConfig } from "@/lib/tools/defaults";
import { WebSearchProperties } from "./web-search-properties";
import { HttpProperties } from "./http-properties";
import { CodeExecProperties } from "./code-exec-properties";
import { DatabaseProperties } from "./database-properties";

const KIND_LABELS: Record<ToolKind, string> = {
  "web-search": "🔍 Web Search",
  "code-exec": "⚡ Code Execution",
  "http": "🌐 HTTP Request",
  "database": "🗄️ Database",
};

export function ToolProperties({
  data,
  onChange,
}: {
  data: ToolData;
  onChange: (patch: Partial<ToolData>) => void;
}) {
  const kind = data.kind ?? "web-search";

  function handleKindChange(newKind: ToolKind) {
    onChange({ kind: newKind, config: defaultConfig(newKind) });
  }

  function handleConfigChange(patch: Partial<ToolData["config"]>) {
    onChange({ config: { ...(data.config ?? defaultConfig(kind)), ...patch } as ToolData["config"] });
  }

  return (
    <div className="space-y-3">
      {/* Kind selector */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Tool Type</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={kind}
          onChange={(e) => handleKindChange(e.target.value as ToolKind)}
        >
          {(Object.entries(KIND_LABELS) as [ToolKind, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Per-kind panel */}
      {kind === "web-search" && (
        <WebSearchProperties
          config={(data.config ?? defaultConfig("web-search")) as WebSearchConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "code-exec" && (
        <CodeExecProperties
          config={(data.config ?? defaultConfig("code-exec")) as CodeExecConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "http" && (
        <HttpProperties
          config={(data.config ?? defaultConfig("http")) as HttpConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
      {kind === "database" && (
        <DatabaseProperties
          config={(data.config ?? defaultConfig("database")) as DatabaseConfig}
          onChange={handleConfigChange}
          lastResult={data.lastResult}
        />
      )}
    </div>
  );
}
