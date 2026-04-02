'use client';
import React from 'react';
import { LoopNode } from '@/components/nodes/loop-node';
import { LoopProperties } from '@/components/properties/loop-properties';
import type { LoopData } from '@/types/loop';
import { loopExecutor } from '@/lib/execution/executors/loop-executor';
import { registerNodeType } from '../registry';

const LoopPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <LoopProperties
    data={data as unknown as LoopData}
    onChange={onChange as (patch: Partial<LoopData>) => void}
  />
);

registerNodeType({
  type: 'loop',
  palette: {
    label: 'Loop',
    defaultData: { name: 'Loop', maxIterations: 10, currentIteration: 0 },
  },
  executor: loopExecutor,
  canvasComponent: LoopNode,
  propertiesComponent: LoopPropertiesAdapter,
});
