import type { Node } from "@xyflow/react";
import type { AgentData } from "./agent";
import type { ToolData } from "./tool";
import type { OutputData } from "./output";
import { PromptData } from "@/types/prompt";
import { DocumentData } from "@/types/document";
import { ChunkerData } from "@/types/chunker";

export type NodeData = AgentData | ToolData | OutputData | PromptData | DocumentData | ChunkerData;
export type TypedNode = Node<NodeData>;
export type Id = string;
