'use client';
import React from 'react';
import { HumanReviewNode } from '@/components/nodes/human-review-node';
import { HumanReviewProperties } from '@/components/properties/human-review-properties';
import type { HumanReviewData } from '@/types/human-review';
import { humanReviewExecutor } from '@/lib/execution/executors/human-review-executor';
import { registerNodeType } from '../registry';

const HumanReviewPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <HumanReviewProperties
    data={data as unknown as HumanReviewData}
    onChange={onChange as (patch: Partial<HumanReviewData>) => void}
  />
);

registerNodeType({
  type: 'human-review',
  palette: {
    label: 'Human Review',
    defaultData: {
      name: 'Human Review',
      reviewMode: 'approve-reject',
      instructions: '',
    },
  },
  executor: humanReviewExecutor,
  canvasComponent: HumanReviewNode,
  propertiesComponent: HumanReviewPropertiesAdapter,
});
