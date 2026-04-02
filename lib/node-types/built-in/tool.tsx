'use client';
import React from 'react';
import { ToolNode } from '@/components/nodes/tool-node';
import { ToolProperties } from '@/components/properties/tool-properties/index';
import type { ToolData } from '@/types/tool';
import { toolExecutor } from '@/lib/execution/executors/tool-executor';
import { registerNodeType } from '../registry';

const ToolPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <ToolProperties
    data={data as unknown as ToolData}
    onChange={onChange as (patch: Partial<ToolData>) => void}
  />
);

registerNodeType({
  type: 'tool',
  palette: {
    label: 'Tool',
    defaultData: { name: 'Tool', kind: 'web-search', config: { maxResults: 5 } },
  },
  executor: toolExecutor,
  canvasComponent: ToolNode,
  propertiesComponent: ToolPropertiesAdapter,
});
