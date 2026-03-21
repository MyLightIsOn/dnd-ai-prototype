// lib/tools/http/client.ts
import type { Tool, ToolResult } from "../base";
import type { HttpConfig } from "@/types/tool";

export const httpTool: Tool = {
  id: "http",
  name: "HTTP Request",
  category: "http",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as HttpConfig;

    if (!cfg.url?.trim()) {
      return { success: false, output: "", error: "URL is required" };
    }

    // Build headers
    const headers: Record<string, string> = {};
    for (const h of cfg.headers ?? []) {
      if (h.key.trim()) headers[h.key] = h.value;
    }

    // Auth
    if (cfg.auth?.token) {
      if (cfg.auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${cfg.auth.token}`;
      } else if (cfg.auth.type === "apikey") {
        headers[cfg.auth.headerName ?? "X-API-Key"] = cfg.auth.token;
      }
    }

    // Body: use upstream input if config body is empty
    const body = cfg.body?.trim() || (["POST", "PUT"].includes(cfg.method) ? input : undefined);

    try {
      const response = await fetch(cfg.url, {
        method: cfg.method,
        headers,
        body: body ?? undefined,
      });

      const text = await response.text();
      let output: string;
      try {
        output = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        output = text;
      }

      if (!response.ok) {
        return {
          success: false,
          output,
          error: `HTTP ${response.status} ${response.statusText}`,
          metadata: { status: response.status },
        };
      }

      return {
        success: true,
        output,
        metadata: { status: response.status, contentType: response.headers.get("content-type") },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
