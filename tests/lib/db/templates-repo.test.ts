import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '@/lib/db/index';
import { insertTemplate, listTemplates, deleteTemplate, type TemplateRow } from '@/lib/db/templates-repo';

function makeTemplate(overrides: Partial<TemplateRow> = {}): TemplateRow {
  return {
    id: crypto.randomUUID(),
    name: 'Test Template',
    description: 'A test template',
    created_at: 1000,
    node_count: 2,
    node_types: JSON.stringify(['agent', 'result']),
    workflow: JSON.stringify({ nodes: [], edges: [] }),
    ...overrides,
  };
}

describe('templates-repo', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    migrate(db);
  });

  it('inserts and retrieves a template', () => {
    const t = makeTemplate();
    insertTemplate(db, t);
    const list = listTemplates(db);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(t.id);
    expect(list[0].name).toBe('Test Template');
    expect(list[0].description).toBe('A test template');
  });

  it('lists templates newest first', () => {
    insertTemplate(db, makeTemplate({ id: 'a', name: 'Older', created_at: 1000 }));
    insertTemplate(db, makeTemplate({ id: 'b', name: 'Newer', created_at: 2000 }));
    const list = listTemplates(db);
    expect(list[0].name).toBe('Newer');
    expect(list[1].name).toBe('Older');
  });

  it('deletes a template and returns true', () => {
    const t = makeTemplate();
    insertTemplate(db, t);
    expect(deleteTemplate(db, t.id)).toBe(true);
    expect(listTemplates(db)).toHaveLength(0);
  });

  it('returns false when deleting a nonexistent template', () => {
    expect(deleteTemplate(db, 'no-such-id')).toBe(false);
  });

  it('stores null description', () => {
    insertTemplate(db, makeTemplate({ description: null }));
    expect(listTemplates(db)[0].description).toBeNull();
  });

  it('returns empty array when no templates exist', () => {
    expect(listTemplates(db)).toEqual([]);
  });
});
