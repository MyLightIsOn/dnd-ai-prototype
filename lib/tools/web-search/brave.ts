// lib/tools/web-search/brave.ts
import type { Tool, ToolResult } from "../base";
import type { WebSearchConfig } from "@/types/tool";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

function formatResults(results: SearchResult[]): string {
  if (results.length === 0) return "No results found.";
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}${r.publishedDate ? `\n   Published: ${r.publishedDate}` : ""}`)
    .join("\n\n");
}

export const braveSearchTool: Tool = {
  id: "web-search",
  name: "Web Search",
  category: "search",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as WebSearchConfig;
    const query = input.trim() || "general search";

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          maxResults: cfg.maxResults ?? 5,
          includeDomains: cfg.includeDomains,
          excludeDomains: cfg.excludeDomains,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return { success: false, output: "", error: err.error ?? `HTTP ${response.status}` };
      }

      const data = await response.json();
      const output = formatResults(data.results ?? []);

      return {
        success: true,
        output,
        metadata: { resultCount: data.results?.length ?? 0, query },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
