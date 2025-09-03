import type { Node } from "@xyflow/react";
import type { AgentData } from "./agent";
import type { ToolData } from "./tool";
import type { OutputData } from "./output";
import { PromptData } from "@/types/prompt";

export type NodeData = AgentData | ToolData | OutputData | PromptData;
export type TypedNode = Node<NodeData>;
export type Id = string;
