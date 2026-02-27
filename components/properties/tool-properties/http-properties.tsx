// components/properties/tool-properties/http-properties.tsx
"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { HttpConfig } from "@/types/tool";

export function HttpProperties({
  config,
  onChange,
  lastResult,
}: {
  config: HttpConfig;
  onChange: (patch: Partial<HttpConfig>) => void;
  lastResult?: string;
}) {
  const headers = config.headers ?? [];

  function setHeader(index: number, field: "key" | "value", val: string) {
    const updated = headers.map((h, i) => (i === index ? { ...h, [field]: val } : h));
    onChange({ headers: updated });
  }

  function addHeader() {
    onChange({ headers: [...headers, { key: "", value: "" }] });
  }

  function removeHeader(index: number) {
    onChange({ headers: headers.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Method</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={config.method ?? "GET"}
          onChange={(e) => onChange({ method: e.target.value as HttpConfig["method"] })}
        >
          {(["GET", "POST", "PUT", "DELETE"] as const).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">URL</label>
        <Input
          placeholder="https://api.example.com/endpoint"
          value={config.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600">Headers</label>
          <button
            type="button"
            onClick={addHeader}
            className="text-[10px] text-blue-600 hover:text-blue-800"
          >
            + Add
          </button>
        </div>
        {headers.map((h, i) => (
          <div key={i} className="flex gap-1 items-center">
            <Input
              placeholder="Key"
              value={h.key}
              onChange={(e) => setHeader(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={h.value}
              onChange={(e) => setHeader(i, "value", e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeHeader(i)}
              className="text-gray-400 hover:text-red-500 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Auth</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={config.auth?.type ?? "none"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "none") onChange({ auth: undefined });
            else onChange({ auth: { type: v as "bearer" | "apikey", token: config.auth?.token ?? "" } });
          }}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="apikey">API Key Header</option>
        </select>

        {config.auth && (
          <Input
            placeholder={config.auth.type === "bearer" ? "Token" : "API Key value"}
            value={config.auth.token ?? ""}
            onChange={(e) => onChange({ auth: { ...config.auth!, token: e.target.value } })}
          />
        )}
        {config.auth?.type === "apikey" && (
          <Input
            placeholder="Header name (default: X-API-Key)"
            value={config.auth.headerName ?? ""}
            onChange={(e) =>
              onChange({ auth: { ...config.auth!, headerName: e.target.value || undefined } })
            }
          />
        )}
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Body (optional — upstream input used if empty)</label>
        <Textarea
          rows={4}
          placeholder='{"key": "value"}'
          value={config.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value || undefined })}
        />
      </div>

      {lastResult && (
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-1">Last Response</div>
          <div className="text-[11px] font-mono bg-gray-50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {lastResult.slice(0, 600)}{lastResult.length > 600 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
