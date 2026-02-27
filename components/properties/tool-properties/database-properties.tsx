// components/properties/tool-properties/database-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DatabaseConfig } from "@/types/tool";

export function DatabaseProperties({
  config,
  onChange,
  lastResult,
}: {
  config: DatabaseConfig;
  onChange: (patch: Partial<DatabaseConfig>) => void;
  lastResult?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-[11px] text-yellow-800 flex items-center gap-2">
        <span className="font-bold">MOCK</span>
        <span>Returns simulated data. No real database connection.</span>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Connection String (display only)</label>
        <Input
          placeholder="postgresql://user:password@host/db"
          value={config.connectionString ?? ""}
          onChange={(e) => onChange({ connectionString: e.target.value })}
          className="text-gray-400"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">SQL Query</label>
        <Textarea
          rows={5}
          className="font-mono text-xs"
          placeholder="SELECT * FROM users LIMIT 10;"
          value={config.query ?? ""}
          onChange={(e) => onChange({ query: e.target.value })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Result</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
