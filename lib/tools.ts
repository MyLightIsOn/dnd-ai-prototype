// lib/runtime/tools.ts
import { EnvConfig, NodeOutput } from "@/types";

// Generic HTTP tool: POST { input } to config.endpoint, return text/json
async function httpTool({
  endpoint,
  input,
  config,
  signal,
}: {
  endpoint: string;
  input: string;
  config?: Record<string, any>;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  const res = await fetch(endpoint, {
    method: (config?.method as string) || "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(config?.headers || {}),
    },
    body: JSON.stringify({
      input,
      ...(config?.body || {}),
    }),
  });

  const contentType = res.headers.get("content-type") || "";
  const ok = res.ok;

  let body: any;
  try {
    body = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    body = await res.text().catch(() => "");
  }

  if (!ok) {
    throw new Error(
      `HTTP tool error ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }

  const text =
    typeof body === "string"
      ? body
      : (body?.text ?? body?.message ?? JSON.stringify(body, null, 2));

  return { text, meta: { kind: "HTTP", endpoint, raw: body } };
}

// Optional: very light Google Drive example (files.list).
// Requires a Browser OAuth access token with Drive scope and/or API key.
// You can switch to whatever Drive op you need.
async function googleDriveListFiles({
  env,
  q,
  pageSize = 10,
  signal,
}: {
  env: EnvConfig;
  q?: string;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  if (!env.GOOGLE_OAUTH_TOKEN && !env.GOOGLE_API_KEY) {
    throw new Error(
      "Google Drive requires GOOGLE_OAUTH_TOKEN or GOOGLE_API_KEY.",
    );
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("pageSize", String(pageSize));
  if (env.GOOGLE_API_KEY) url.searchParams.set("key", env.GOOGLE_API_KEY);

  const res = await fetch(url.toString(), {
    method: "GET",
    signal,
    headers: env.GOOGLE_OAUTH_TOKEN
      ? { Authorization: `Bearer ${env.GOOGLE_OAUTH_TOKEN}` }
      : {},
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Google Drive error ${res.status}: ${errText || res.statusText}`,
    );
  }

  const json = await res.json();
  const files = json?.files || [];
  const lines = files.map((f: any) => `• ${f.name} (${f.id})`).join("\n");
  return {
    text: lines || "(no files)",
    meta: { kind: "Google Drive", count: files.length, raw: json },
  };
}

export async function runTool({
  kind,
  config,
  input,
  env,
  signal,
}: {
  kind: string;
  config?: Record<string, any>;
  input: string;
  env: EnvConfig;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  // Map common kinds; fallback to HTTP if an endpoint is provided.
  switch (kind) {
    case "HTTP":
      if (!config?.endpoint)
        throw new Error("HTTP tool requires config.endpoint");
      return httpTool({ endpoint: config.endpoint, input, config, signal });

    case "Google Drive":
      // Example: pass config.q to filter files (e.g., "name contains 'report'")
      return googleDriveListFiles({
        env,
        q: config?.q,
        pageSize: config?.pageSize ?? 10,
        signal,
      });

    default:
      if (config?.endpoint) {
        // Treat unknown kinds that provide an endpoint as a generic webhook.
        return httpTool({ endpoint: config.endpoint, input, config, signal });
      }
      throw new Error(
        `Unknown tool kind "${kind}". Provide a handler or an HTTP endpoint.`,
      );
  }
}
