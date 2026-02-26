// lib/tools/code-exec/webcontainer.ts
import type { Tool, ToolResult } from "../base";
import type { CodeExecConfig } from "@/types/tool";

// Singleton instance - WebContainer can only be booted once per page
let wcInstance: import("@webcontainer/api").WebContainer | null = null;
let bootPromise: Promise<import("@webcontainer/api").WebContainer> | null = null;

async function getWebContainer() {
  if (wcInstance) return wcInstance;
  if (bootPromise) return bootPromise;

  const { WebContainer } = await import("@webcontainer/api");
  bootPromise = WebContainer.boot();
  wcInstance = await bootPromise;
  return wcInstance;
}

export const codeExecTool: Tool = {
  id: "code-exec",
  name: "Code Execution",
  category: "code",

  async execute(input: string, config: unknown): Promise<ToolResult> {
    const cfg = config as CodeExecConfig;

    // Use config code, fallback to upstream input if empty
    const code = cfg.code?.trim() || input.trim();
    if (!code) {
      return { success: false, output: "", error: "No code to execute" };
    }

    const timeoutMs = (cfg.timeout ?? 10) * 1000;

    try {
      const wc = await getWebContainer();

      // Write the code file
      await wc.mount({ "index.js": { file: { contents: code } } });

      // Run it
      const process = await wc.spawn("node", ["index.js"]);

      let stdout = "";

      process.output.pipeTo(
        new WritableStream({
          write(data) { stdout += data; },
        })
      );

      // Race against timeout
      const exitCode = await Promise.race([
        process.exit,
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${cfg.timeout ?? 10}s`)), timeoutMs)
        ),
      ]);

      if (exitCode !== 0) {
        return {
          success: false,
          output: stdout,
          error: `Process exited with code ${exitCode}`,
          metadata: { exitCode },
        };
      }

      return {
        success: true,
        output: stdout || "(no output)",
        metadata: { exitCode: 0 },
      };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
};
