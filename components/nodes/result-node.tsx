'use client';
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { OutputData } from '@/types';
import { NodeChrome } from './node-chrome';

export const ResultNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as OutputData;
  return (
    <NodeChrome
      title={d.name || 'Result'}
      subtitle="Terminal"
      color="bg-slate-600"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto max-w-[300px]">
        {d.preview || 'Will show the final result.'}
      </div>
    </NodeChrome>
  );
};
