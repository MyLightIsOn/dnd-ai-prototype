'use client';
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { PromptData } from '@/types';
import { NodeChrome } from './node-chrome';

export const PromptNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as PromptData;
  return (
    <NodeChrome
      title={d.name || 'Prompt'}
      subtitle="Input"
      color="bg-emerald-500"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto ">
        {d.text || 'Prompt goes here'}
      </div>
    </NodeChrome>
  );
};
