// components/properties/tool-properties/web-search-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import type { WebSearchConfig } from "@/types/tool";

export function WebSearchProperties({
  config,
  onChange,
  lastResult,
}: {
  config: WebSearchConfig;
  onChange: (patch: Partial<WebSearchConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Max Results (1–10)</label>
        <Input
          type="number"
          min={1}
          max={10}
          value={config.maxResults ?? 5}
          onChange={(e) => onChange({ maxResults: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)) })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Include Domains (optional, comma-separated)</label>
        <Input
          placeholder="example.com, docs.python.org"
          value={config.includeDomains ?? ""}
          onChange={(e) => onChange({ includeDomains: e.target.value || undefined })}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Exclude Domains (optional, comma-separated)</label>
        <Input
          placeholder="reddit.com, twitter.com"
          value={config.excludeDomains ?? ""}
          onChange={(e) => onChange({ excludeDomains: e.target.value || undefined })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Result Preview</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
