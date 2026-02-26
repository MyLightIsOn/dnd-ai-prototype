// lib/tools/defaults.ts
import type { ToolKind, ToolConfig, WebSearchConfig, CodeExecConfig, HttpConfig, DatabaseConfig } from "@/types/tool";

export function defaultConfig(kind: ToolKind): ToolConfig {
  switch (kind) {
    case "web-search":
      return { maxResults: 5 } as WebSearchConfig;
    case "code-exec":
      return { code: "console.log('Hello from WebContainers!');", timeout: 10 } as CodeExecConfig;
    case "http":
      return { method: "GET", url: "", headers: [] } as HttpConfig;
    case "database":
      return { connectionString: "", query: "SELECT * FROM users LIMIT 10;" } as DatabaseConfig;
  }
}
