'use client';
import React from 'react';
import { MemoryNode } from '@/components/nodes/memory-node';
import { MemoryProperties } from '@/components/properties/memory-properties';
import type { MemoryData } from '@/types/memory';
import { memoryExecutor } from '@/lib/execution/executors/memory-executor';
import { registerNodeType } from '../registry';

const MemoryPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <MemoryProperties
    data={data as unknown as MemoryData}
    onChange={onChange as (patch: Partial<MemoryData>) => void}
  />
);

registerNodeType({
  type: 'memory',
  palette: {
    label: 'Memory',
    defaultData: { name: 'Memory', scope: 'workflow', keys: [] },
  },
  executor: memoryExecutor,
  canvasComponent: MemoryNode,
  propertiesComponent: MemoryPropertiesAdapter,
});
