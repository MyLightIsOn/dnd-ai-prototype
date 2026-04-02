import type { NodeTypes } from "@xyflow/react";
import { DocumentNode } from "./document-node";
import { ChunkerNode } from "./chunker-node";
import { RouterNode } from "./router-node";
import { LoopNode } from "./loop-node";
import { MemoryNode } from "./memory-node";
import { HumanReviewNode } from "./human-review-node";
import { AgentNode } from "./agent-node";
import { ToolNode } from "./tool-node";
import { ResultNode } from "./result-node";
import { PromptNode } from "./prompt-node";

export { AgentNode } from "./agent-node";
export { ToolNode } from "./tool-node";
export { ResultNode } from "./result-node";
export { PromptNode } from "./prompt-node";
export { NodeChrome } from "./node-chrome";
export { DocumentNode } from "./document-node";
export { ChunkerNode } from "./chunker-node";
export { RouterNode } from "./router-node";
export { LoopNode } from "./loop-node";
export { MemoryNode } from "./memory-node";
export { HumanReviewNode } from "./human-review-node";

export const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  result: ResultNode,
  prompt: PromptNode,
  document: DocumentNode,
  chunker: ChunkerNode,
  router: RouterNode,
  loop: LoopNode,
  memory: MemoryNode,
  humanReview: HumanReviewNode,
};
