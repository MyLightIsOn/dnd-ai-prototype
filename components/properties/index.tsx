import React, { useState } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { AgentData, ToolData, OutputData, PromptData, DocumentData, ChunkerData, RouterData, NodeData } from "@/types";
import type { LoopData } from "@/types/loop";
import type { MemoryData } from "@/types/memory";
import type { HumanReviewData } from "@/types/human-review";
import type { TypedNode } from "@/types";
import { getAllModels } from "@/lib/providers";
import { DocumentProperties } from "./document-properties";
import { ChunkerProperties } from "./chunker-properties";
import { RouterProperties } from "./router-properties";
import { LoopProperties } from "./loop-properties";
import { MemoryProperties } from "./memory-properties";
import { HumanReviewProperties } from "./human-review-properties";

function PropertiesPanel({
  selected,
  onChange,
}: {
  selected: TypedNode | null | undefined;
  onChange: (patch: Partial<NodeData>) => void;
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
        <AgentProperties
          data={data as AgentData}
          onChange={onChange}
        />
      )}
      {type === "prompt" && (
        <>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Prompt</label>
            <Textarea
              rows={5}
              value={(data as PromptData).text || ""}
              onChange={(e) => onChange({ text: e.target.value })}
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
      {type === "result" && (
        <>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Label</label>
            <Input
              value={data.name || "Output"}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Output</label>
            <div className="relative w-full">
              <Textarea
                rows={12}
                value={(data as OutputData).preview || "(No output yet)"}
                readOnly
                className="font-mono text-xs bg-gray-50 resize-none"
                placeholder="Output will appear here after execution..."
              />
            </div>
            {(data as OutputData).preview && (
              <div className="text-[10px] text-gray-500">
                {(data as OutputData).preview!.length.toLocaleString()} characters
              </div>
            )}
          </div>
        </>
      )}
      {type === "document" && (
        <DocumentProperties
          data={data as DocumentData}
          onChange={onChange}
        />
      )}
      {type === "chunker" && (
        <ChunkerProperties
          data={data as ChunkerData}
          onChange={onChange}
        />
      )}
      {type === "router" && (
        <RouterProperties
          data={data as RouterData}
          onChange={onChange}
        />
      )}
      {type === "loop" && (
        <LoopProperties
          data={data as LoopData}
          onChange={onChange}
        />
      )}
      {type === "memory" && (
        <MemoryProperties
          data={data as MemoryData}
          onChange={onChange}
        />
      )}
      {type === "human-review" && (
        <HumanReviewProperties
          data={data as HumanReviewData}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function AgentProperties({
  data,
  onChange,
}: {
  data: AgentData;
  onChange: (patch: Partial<AgentData>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const allModels = getAllModels();

  // Group models by provider
  const modelsByProvider = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  // Get current model value (format: provider/model-id)
  const currentModel = data.model || "openai/gpt-4o-mini";
  const mode = data.mode || "mock";
  const streaming = data.streaming || false;
  const temperature = data.temperature ?? 0.7;
  const maxTokens = data.maxTokens ?? 1000;

  return (
    <>
      {/* Model Dropdown */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Model</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={currentModel}
          onChange={(e) => onChange({ model: e.target.value })}
        >
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <optgroup
              key={provider}
              label={provider.charAt(0).toUpperCase() + provider.slice(1)}
            >
              {models.map((model) => (
                <option key={model.id} value={`${provider}/${model.id}`}>
                  {model.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Mode Toggle */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Mode</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="mock"
              checked={mode === "mock"}
              onChange={() => onChange({ mode: "mock" })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Mock</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="live"
              checked={mode === "live"}
              onChange={() => onChange({ mode: "live" })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Live</span>
          </label>
        </div>
      </div>

      {/* Streaming Checkbox */}
      <div className="grid gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={streaming}
            onChange={(e) => onChange({ streaming: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-xs text-gray-600">Streaming</span>
        </label>
      </div>

      {/* Prompt */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Prompt</label>
        <Textarea
          rows={5}
          value={data.prompt || ""}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Enter your prompt here..."
        />
      </div>

      {/* Advanced Settings */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>{showAdvanced ? "▼" : "▶"}</span>
          <span>Advanced Settings</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            {/* Temperature Slider */}
            <div className="grid gap-2">
              <label className="text-xs text-gray-600">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) =>
                  onChange({ temperature: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0 (Deterministic)</span>
                <span>2 (Creative)</span>
              </div>
            </div>

            {/* Max Tokens Input */}
            <div className="grid gap-2">
              <label className="text-xs text-gray-600">Max Tokens</label>
              <Input
                type="number"
                min="1"
                max="100000"
                value={maxTokens}
                onChange={(e) =>
                  onChange({ maxTokens: parseInt(e.target.value) || 1000 })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Memory Configuration */}
      <div className="border-t pt-3 space-y-3">
        <div className="text-xs font-medium text-gray-700">Memory</div>

        {/* Memory Read Keys */}
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Read Keys (comma-separated)</label>
          <Input
            placeholder="key1, key2"
            value={(data.memoryRead ?? []).join(', ')}
            onChange={(e) => {
              const keys = e.target.value
                .split(',')
                .map((k) => k.trim())
                .filter((k) => k.length > 0);
              onChange({ memoryRead: keys });
            }}
          />
          <div className="text-[10px] text-gray-500">
            Keys to read from memory before execution
          </div>
        </div>

        {/* Memory Write Key */}
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Write Key</label>
          <Input
            placeholder="result_key"
            value={data.memoryWrite ?? ''}
            onChange={(e) => onChange({ memoryWrite: e.target.value || undefined })}
          />
          <div className="text-[10px] text-gray-500">
            Key to write this agent&apos;s output into memory
          </div>
        </div>
      </div>
    </>
  );
}

export default PropertiesPanel;
