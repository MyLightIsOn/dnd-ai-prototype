// lib/tools/index.ts
import { registerTool } from "./registry";
import { braveSearchTool } from "./web-search/brave";
import { httpTool } from "./http/client";
import { codeExecTool } from "./code-exec/webcontainer";
import { databaseMockTool } from "./database/mock";

export { getTool, getAllTools } from "./registry";

// Register all built-in tools
registerTool(braveSearchTool);
registerTool(httpTool);
registerTool(codeExecTool);
registerTool(databaseMockTool);
