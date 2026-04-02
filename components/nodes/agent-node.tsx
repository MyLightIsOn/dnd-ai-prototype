'use client';
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { AgentData } from '@/types';
import { NodeChrome } from './node-chrome';

export const AgentNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as AgentData;

  // Parse provider from model string (format: provider/model-id)
  const modelString = d.model || 'openai/gpt-4o-mini';
  const [provider, modelId] = modelString.split('/');

  // Get provider display info
  const providerInfo = {
    openai: { icon: '🟢', name: 'OpenAI' },
    anthropic: { icon: '🟣', name: 'Anthropic' },
    google: { icon: '🔵', name: 'Google' },
    ollama: { icon: '🟠', name: 'Ollama' },
  }[provider] || { icon: '🤖', name: provider };

  // Get mode badge
  const mode = d.mode || 'mock';
  const modeBadge = mode.toUpperCase();
  const modeBadgeColor = mode === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';

  return (
    <NodeChrome
      title={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>{providerInfo.icon}</span>
            <span>{d.name || 'Agent'}</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${modeBadgeColor} font-semibold`}>
            {modeBadge}
          </span>
        </div>
      }
      subtitle={providerInfo.name}
      color="bg-indigo-500"
      executionState={d.executionState}
    >
      <div className="space-y-1">
        <div className="text-gray-700 font-medium text-sm">
          {modelId || 'gpt-4o-mini'}
        </div>
        {d.temperature !== undefined || d.streaming ? (
          <div className="text-[10px] text-gray-500 flex items-center gap-2">
            {d.temperature !== undefined && <span>temp: {d.temperature.toFixed(1)}</span>}
            {d.temperature !== undefined && d.streaming && <span>•</span>}
            {d.streaming && <span>stream</span>}
          </div>
        ) : null}
        {(d.memoryRead && d.memoryRead.length > 0 || d.memoryWrite) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {d.memoryRead?.map((key) => (
              <span key={key} className="text-[10px] bg-purple-900/50 text-purple-300 rounded px-1">
                📖 {key}
              </span>
            ))}
            {d.memoryWrite && (
              <span className="text-[10px] bg-pink-900/50 text-pink-300 rounded px-1">
                💾 {d.memoryWrite}
              </span>
            )}
          </div>
        )}
      </div>
    </NodeChrome>
  );
};
