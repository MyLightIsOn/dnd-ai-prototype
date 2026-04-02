'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResultNode } from '@/components/nodes/index';
import type { OutputData } from '@/types/output';
import { resultExecutor } from '@/lib/execution/executors/result-executor';
import { registerNodeType } from '../registry';

const ResultProperties = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => {
  const d = data as unknown as OutputData;
  return (
    <>
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Label</label>
        <Input
          value={d.name || 'Output'}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Output</label>
        <div className="relative w-full">
          <Textarea
            rows={12}
            value={d.preview || '(No output yet)'}
            readOnly
            className="font-mono text-xs bg-gray-50 resize-none"
            placeholder="Output will appear here after execution..."
          />
        </div>
        {d.preview && (
          <div className="text-[10px] text-gray-500">
            {d.preview.length.toLocaleString()} characters
          </div>
        )}
      </div>
    </>
  );
};

registerNodeType({
  type: 'result',
  palette: {
    label: 'Result',
    defaultData: { name: 'Result' },
  },
  executor: resultExecutor,
  canvasComponent: ResultNode,
  propertiesComponent: ResultProperties,
});
