'use client';
import React from 'react';
import { DocumentNode } from '@/components/nodes/document-node';
import { DocumentProperties } from '@/components/properties/document-properties';
import type { DocumentData } from '@/types';
import { documentExecutor } from '@/lib/execution/executors/document-executor';
import { registerNodeType } from '../registry';

const DocumentPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <DocumentProperties
    data={data as unknown as DocumentData}
    onChange={onChange as (patch: Partial<DocumentData>) => void}
  />
);

registerNodeType({
  type: 'document',
  palette: {
    label: 'Document',
    defaultData: { name: 'Document' },
  },
  executor: documentExecutor,
  canvasComponent: DocumentNode,
  propertiesComponent: DocumentPropertiesAdapter,
});
