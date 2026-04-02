'use client';
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { ToolData } from '@/types';
import { NodeChrome } from './node-chrome';

const TOOL_SUBTITLES: Record<string, string> = {
  'web-search': 'Web Search',
  'code-exec': 'Code Execution',
  'http': 'HTTP Request',
  'database': 'Database (Mock)',
};

export const ToolNode: React.FC<NodeProps> = ({ data }) => {
  const d = (data || {}) as ToolData;
  const kind = d.kind ?? 'web-search';
  const subtitle = TOOL_SUBTITLES[kind] ?? kind;

  // Show a brief config summary
  let detail = 'No config';
  const cfg = d.config as Record<string, unknown> | undefined;
  if (cfg) {
    if (kind === 'web-search' && (cfg as { maxResults?: number }).maxResults) {
      detail = `${(cfg as { maxResults: number }).maxResults} results`;
    } else if (kind === 'http' && (cfg as { url?: string }).url) {
      const url = (cfg as { url: string }).url;
      detail = url.length > 30 ? url.slice(0, 30) + '…' : url;
    } else if (kind === 'code-exec' && (cfg as { code?: string }).code) {
      detail = 'JS code ready';
    } else if (kind === 'database' && (cfg as { query?: string }).query) {
      detail = 'SQL query set';
    }
  }

  return (
    <NodeChrome
      title={d.name || 'Tool'}
      subtitle={subtitle}
      color="bg-orange-600"
      executionState={d.executionState}
    >
      <div className="text-[11px] text-gray-700">{detail}</div>
    </NodeChrome>
  );
};
