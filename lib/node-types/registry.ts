import type { NodeTypeDefinition } from './base';
import type { NodeTypes } from '@xyflow/react';

const nodeTypeRegistry = new Map<string, NodeTypeDefinition>();

export function registerNodeType(def: NodeTypeDefinition): void {
  nodeTypeRegistry.set(def.type, def);
  // Note: executor registration is handled separately via side-effect imports
  // in lib/execution/executors/index.ts and individual executor files.
}

export function getNodeType(type: string): NodeTypeDefinition | undefined {
  return nodeTypeRegistry.get(type);
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return Array.from(nodeTypeRegistry.values());
}

export function getNodeTypesMap(): NodeTypes {
  const map: NodeTypes = {};
  nodeTypeRegistry.forEach((def, type) => {
    map[type] = def.canvasComponent;
  });
  return map;
}

export interface PaletteItemData {
  type: string;
  label: string;
  defaultData: Record<string, unknown>;
}

export function getPaletteItems(): PaletteItemData[] {
  return Array.from(nodeTypeRegistry.values()).map(def => ({
    type: def.type,
    label: def.palette.label,
    defaultData: def.palette.defaultData,
  }));
}

export function clearAllNodeTypes(): void {
  nodeTypeRegistry.clear();
}
