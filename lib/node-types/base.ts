import type React from 'react';
import type { NodeProps } from '@xyflow/react';
import type { NodeExecutor } from '@/lib/execution/node-executor';

export interface PaletteItemConfig {
  label: string;
  defaultData: Record<string, unknown>;
}

export interface NodeTypeDefinition {
  /** Unique type identifier — matches node.type in the graph */
  type: string;

  /** Display metadata for the palette */
  palette: PaletteItemConfig;

  /** The executor for this node type (already registered via side-effect import) */
  executor: NodeExecutor;

  /** React component for rendering on the canvas */
  canvasComponent: React.ComponentType<NodeProps>;

  /** React component for the properties panel */
  propertiesComponent: React.ComponentType<{
    data: Record<string, unknown>;
    onChange: (patch: Record<string, unknown>) => void;
  }> | null;
}
