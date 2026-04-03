import type Database from 'better-sqlite3';

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  created_at: number;     // Unix ms
  node_count: number;
  node_types: string;     // JSON array of all type strings including duplicates, e.g. '["agent","agent","result"]'
  workflow: string;        // JSON string: { nodes: TypedNode[], edges: Edge[] }
}

export function insertTemplate(db: Database.Database, template: TemplateRow): void {
  db.prepare<TemplateRow>(`
    INSERT INTO templates (id, name, description, created_at, node_count, node_types, workflow)
    VALUES (@id, @name, @description, @created_at, @node_count, @node_types, @workflow)
  `).run(template);
}

export function listTemplates(db: Database.Database): TemplateRow[] {
  return db.prepare<[], TemplateRow>(`
    SELECT * FROM templates ORDER BY created_at DESC
  `).all();
}

export function deleteTemplate(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return result.changes > 0;
}
