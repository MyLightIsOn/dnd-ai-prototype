'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PromptNode } from '@/components/nodes/index';
import { promptExecutor } from '@/lib/execution/executors/prompt-executor';
import { registerNodeType } from '../registry';

const PromptProperties = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <div className="grid gap-2">
    <label className="text-xs text-gray-600">Prompt</label>
    <Textarea
      rows={5}
      value={(data.text as string) || ''}
      onChange={(e) => onChange({ text: e.target.value })}
    />
  </div>
);

registerNodeType({
  type: 'prompt',
  palette: {
    label: 'Prompt',
    defaultData: { name: 'Prompt', text: 'Your prompt here' },
  },
  executor: promptExecutor,
  canvasComponent: PromptNode,
  propertiesComponent: PromptProperties,
});
