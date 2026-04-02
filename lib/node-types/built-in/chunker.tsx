'use client';
import React from 'react';
import { ChunkerNode } from '@/components/nodes/chunker-node';
import { ChunkerProperties } from '@/components/properties/chunker-properties';
import type { ChunkerData } from '@/types/chunker';
import { chunkerExecutor } from '@/lib/execution/executors/chunker-executor';
import { registerNodeType } from '../registry';

const ChunkerPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <ChunkerProperties
    data={data as unknown as ChunkerData}
    onChange={onChange as (patch: Partial<ChunkerData>) => void}
  />
);

registerNodeType({
  type: 'chunker',
  palette: {
    label: 'Chunker',
    defaultData: { name: 'Chunker', strategy: 'fixed', chunkSize: 500, overlap: 50 },
  },
  executor: chunkerExecutor,
  canvasComponent: ChunkerNode,
  propertiesComponent: ChunkerPropertiesAdapter,
});
