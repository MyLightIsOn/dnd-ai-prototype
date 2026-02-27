// lib/tools/registry.ts

import type { Tool } from './base';

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  registry.set(tool.id, tool);
}

export function getTool(id: string): Tool | undefined {
  return registry.get(id);
}

export function getAllTools(): Tool[] {
  return Array.from(registry.values());
}
