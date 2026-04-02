import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerNodeType,
  getNodeType,
  getAllNodeTypes,
  getPaletteItems,
  getNodeTypesMap,
  clearAllNodeTypes,
} from '@/lib/node-types/registry';
import { clearAllExecutors, registerNodeExecutor, getNodeExecutor } from '@/lib/execution/node-executor';
import type { NodeTypeDefinition } from '@/lib/node-types/base';
import type { NodeExecutor } from '@/lib/execution/node-executor';

// Minimal stub components (no JSX, no React import needed for type checking in tests)
const MockCanvas = vi.fn();
const MockProperties = vi.fn();

function createMockExecutor(type: string): NodeExecutor {
  return {
    type,
    async execute() {
      return { output: `executed ${type}` };
    },
  };
}

function createMockNodeType(type: string): NodeTypeDefinition {
  const executor = createMockExecutor(type);
  return {
    type,
    palette: {
      label: `${type} label`,
      defaultData: { name: type },
    },
    executor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvasComponent: MockCanvas as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertiesComponent: MockProperties as any,
  };
}

describe('node type registry', () => {
  beforeEach(() => {
    clearAllNodeTypes();
    clearAllExecutors();
  });

  it('registers and retrieves a node type', () => {
    const def = createMockNodeType('prompt');
    registerNodeType(def);
    expect(getNodeType('prompt')).toBe(def);
  });

  it('returns undefined for unknown type', () => {
    expect(getNodeType('nonexistent')).toBeUndefined();
  });

  it('getAllNodeTypes returns all registered types', () => {
    const def1 = createMockNodeType('agent');
    const def2 = createMockNodeType('tool');
    registerNodeType(def1);
    registerNodeType(def2);

    const all = getAllNodeTypes();
    const types = all.map((d) => d.type);
    expect(types).toContain('agent');
    expect(types).toContain('tool');
    expect(all.length).toBe(2);
  });

  it('getPaletteItems returns palette data for all types', () => {
    registerNodeType(createMockNodeType('document'));
    registerNodeType(createMockNodeType('chunker'));

    const items = getPaletteItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      type: 'document',
      label: 'document label',
      defaultData: { name: 'document' },
    });
    expect(items[1]).toEqual({
      type: 'chunker',
      label: 'chunker label',
      defaultData: { name: 'chunker' },
    });
  });

  it('getNodeTypesMap returns a map of type to canvas component', () => {
    registerNodeType(createMockNodeType('result'));
    registerNodeType(createMockNodeType('router'));

    const map = getNodeTypesMap();
    expect(map['result']).toBe(MockCanvas);
    expect(map['router']).toBe(MockCanvas);
  });

  it('does not register executor automatically (executor registry is separate)', () => {
    const def = createMockNodeType('memory');
    registerNodeType(def);

    // Registry does NOT auto-register the executor — that happens via executor file side-effects
    // So the executor should not be in the executor registry yet
    expect(getNodeExecutor('memory')).toBeUndefined();
  });

  it('clearAllNodeTypes removes all registrations', () => {
    registerNodeType(createMockNodeType('loop'));
    expect(getAllNodeTypes().length).toBe(1);

    clearAllNodeTypes();
    expect(getAllNodeTypes().length).toBe(0);
    expect(getNodeType('loop')).toBeUndefined();
  });

  it('registering executor separately makes it available in node executor registry', () => {
    const def = createMockNodeType('human-review');
    registerNodeType(def);

    // Manually register the executor (as executor files do via side-effects)
    registerNodeExecutor(def.executor);

    expect(getNodeExecutor('human-review')).toBe(def.executor);
  });

  it('supports null propertiesComponent for node types without a panel', () => {
    const def: NodeTypeDefinition = {
      ...createMockNodeType('special'),
      propertiesComponent: null,
    };
    registerNodeType(def);

    const retrieved = getNodeType('special');
    expect(retrieved?.propertiesComponent).toBeNull();
  });
});
