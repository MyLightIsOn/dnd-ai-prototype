import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { listTemplates, insertTemplate, type TemplateRow } from '@/lib/db/templates-repo';

export async function GET() {
  try {
    const templates = listTemplates(getDb());
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('[GET /api/templates]', err);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

interface CreateTemplateBody {
  name: string;
  description?: string | null;
  node_count: number;
  node_types: string[];
  workflow: { nodes: unknown[]; edges: unknown[] };
}

export async function POST(req: NextRequest) {
  let body: CreateTemplateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim() || typeof body.node_count !== 'number' || !Array.isArray(body.node_types) || !body.workflow || !Array.isArray(body.workflow.nodes) || !Array.isArray(body.workflow.edges)) {
    return NextResponse.json(
      { error: 'Missing required fields: name, node_count, node_types, workflow' },
      { status: 400 }
    );
  }

  const template: TemplateRow = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description ?? null,
    created_at: Date.now(),
    node_count: body.node_count,
    node_types: JSON.stringify(body.node_types),
    workflow: JSON.stringify(body.workflow),
  };

  try {
    insertTemplate(getDb(), template);
    return NextResponse.json({ id: template.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Template with this ID already exists' }, { status: 409 });
    }
    console.error('[POST /api/templates]', err);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}
