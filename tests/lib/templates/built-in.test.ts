import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATES } from '@/lib/templates/built-in';

describe('BUILT_IN_TEMPLATES', () => {
  it('has exactly 11 entries', () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(11);
  });

  it('every entry has a unique id', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(11);
  });

  it('every entry has a non-empty name and description', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('every entry has node_count > 0 and node_types matching node_count', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.node_count).toBeGreaterThan(0);
      expect(t.node_types).toHaveLength(t.node_count);
    }
  });

  it('buildWorkflow() returns nodes and edges with consistent IDs', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      const { nodes, edges } = t.buildWorkflow();
      expect(nodes).toHaveLength(t.node_count);
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const e of edges) {
        expect(nodeIds.has(e.source)).toBe(true);
        expect(nodeIds.has(e.target)).toBe(true);
      }
    }
  });

  it('buildWorkflow() generates fresh UUIDs on each call', () => {
    const first = BUILT_IN_TEMPLATES[0].buildWorkflow();
    const second = BUILT_IN_TEMPLATES[0].buildWorkflow();
    expect(first.nodes[0].id).not.toBe(second.nodes[0].id);
  });

  it('node_types matches the actual node types returned by buildWorkflow()', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      const { nodes } = t.buildWorkflow();
      const actual = nodes.map((n) => n.type as string);
      expect(t.node_types).toEqual(actual);
    }
  });
});
