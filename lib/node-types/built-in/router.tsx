'use client';
import React from 'react';
import { RouterNode } from '@/components/nodes/router-node';
import { RouterProperties } from '@/components/properties/router-properties';
import type { RouterData } from '@/types/router';
import { routerExecutor } from '@/lib/execution/executors/router-executor';
import { registerNodeType } from '../registry';

const RouterPropertiesAdapter = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) => (
  <RouterProperties
    data={data as unknown as RouterData}
    onChange={onChange as (patch: Partial<RouterData>) => void}
  />
);

registerNodeType({
  type: 'router',
  palette: {
    label: 'Router',
    defaultData: {
      name: 'Router',
      routes: [{ id: 'route-1', label: 'Route 1', condition: '' }],
      defaultRoute: false,
    },
  },
  executor: routerExecutor,
  canvasComponent: RouterNode,
  propertiesComponent: RouterPropertiesAdapter,
});
