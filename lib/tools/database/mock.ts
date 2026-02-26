// lib/tools/database/mock.ts
import type { Tool, ToolResult } from "../base";
import type { DatabaseConfig } from "@/types/tool";

// Generate plausible mock rows based on query keywords
function mockRows(query: string): Record<string, string | number>[] {
  const q = query.toLowerCase();

  if (q.includes("user")) {
    return [
      { id: 1, name: "Alice Johnson", email: "alice@example.com", created_at: "2024-01-15" },
      { id: 2, name: "Bob Smith", email: "bob@example.com", created_at: "2024-02-20" },
      { id: 3, name: "Carol White", email: "carol@example.com", created_at: "2024-03-10" },
    ];
  }

  if (q.includes("order") || q.includes("product")) {
    return [
      { id: 101, product: "Widget A", quantity: 5, total: 49.95, status: "shipped" },
      { id: 102, product: "Widget B", quantity: 2, total: 29.99, status: "pending" },
      { id: 103, product: "Gadget X", quantity: 1, total: 199.00, status: "delivered" },
    ];
  }

  return [
    { id: 1, value: "row_1", timestamp: "2024-01-01T00:00:00Z" },
    { id: 2, value: "row_2", timestamp: "2024-01-02T00:00:00Z" },
  ];
}

function toMarkdownTable(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "(no results)";
  const cols = Object.keys(rows[0]);
  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map(r => `| ${cols.map(c => String(r[c])).join(" | ")} |`).join("\n");
  return [header, sep, body].join("\n");
}

export const databaseMockTool: Tool = {
  id: "database",
  name: "Database Query",
  category: "data",

  async execute(_input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as DatabaseConfig;
    const query = cfg.query?.trim();

    if (!query) {
      return { success: false, output: "", error: "No SQL query provided" };
    }

    // Simulate a small delay
    await new Promise(r => setTimeout(r, 300));

    const rows = mockRows(query);
    const table = toMarkdownTable(rows);
    const output = `[MOCK DATA — ${rows.length} rows]\n\n${table}`;

    return {
      success: true,
      output,
      metadata: { rowCount: rows.length, mock: true },
    };
  },
};
