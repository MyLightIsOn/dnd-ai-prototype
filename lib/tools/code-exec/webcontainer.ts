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

    const code = cfg.code?.trim() || input.trim();
    if (!code) {
      return { success: false, output: "", error: "No code to execute" };
    }

    const timeoutMs = (cfg.timeout ?? 10) * 1000;

    try {
      const wc = await getWebContainer();

      // Mount/overwrite index.js
      await wc.mount({ "index.js": { file: { contents: code } } });

      const process = await wc.spawn("node", ["index.js"]);

      // Collect stdout chunks
      const chunks: string[] = [];
      const collectStream = process.output.pipeTo(
        new WritableStream({
          write(data) { chunks.push(data); },
        })
      );

      // Create timeout that also kills the process
      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => {
          process.kill();
          reject(new Error(`Timeout after ${cfg.timeout ?? 10}s`));
        }, timeoutMs)
      );

      // Race process exit against timeout
      const exitCode = await Promise.race([process.exit, timeoutPromise]);

      // Wait for stream to finish flushing after process exits
      await collectStream.catch(() => {}); // ignore stream errors

      const raw = chunks.join("");
      // Strip ANSI escape codes (color/formatting) from Node.js stdout
      const stdout = raw.replace(/\x1B\[[0-9;]*m/g, "");

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
