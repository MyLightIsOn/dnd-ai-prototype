'use client';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AgentNode } from '@/components/nodes/agent-node';
import type { AgentData } from '@/types/agent';
import { getAllModels } from '@/lib/providers';
import { agentExecutor } from '@/lib/execution/executors/agent-executor';
import { registerNodeType } from '../registry';

function AgentPropertiesInner({
  data,
  onChange,
}: {
  data: AgentData;
  onChange: (patch: Partial<AgentData>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const allModels = getAllModels();

  const modelsByProvider = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  const currentModel = data.model || 'openai/gpt-4o-mini';
  const mode = data.mode || 'mock';
  const streaming = data.streaming || false;
  const temperature = data.temperature ?? 0.7;
  const maxTokens = data.maxTokens ?? 1000;

  return (
    <>
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

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Mode</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="mock"
              checked={mode === 'mock'}
              onChange={() => onChange({ mode: 'mock' })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Mock</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="live"
              checked={mode === 'live'}
              onChange={() => onChange({ mode: 'live' })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Live</span>
          </label>
        </div>
      </div>

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

      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Prompt</label>
        <Textarea
          rows={5}
          value={data.prompt || ''}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Enter your prompt here..."
        />
      </div>

      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          <span>Advanced Settings</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
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

      <div className="border-t pt-3 space-y-3">
        <div className="text-xs font-medium text-gray-700">Memory</div>

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

const AgentProperties = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <AgentPropertiesInner
    data={data as unknown as AgentData}
    onChange={onChange as (patch: Partial<AgentData>) => void}
  />
);

registerNodeType({
  type: 'agent',
  palette: {
    label: 'Agent',
    defaultData: { name: 'Agent', model: 'openai/gpt-4o-mini' },
  },
  executor: agentExecutor,
  canvasComponent: AgentNode,
  propertiesComponent: AgentProperties,
});
