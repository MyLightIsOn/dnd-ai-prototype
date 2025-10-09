import type { Node } from "@xyflow/react";
import type { AgentData } from "./agent";
import type { ToolData } from "./tool";
import type { OutputData } from "./output";

export type NodeData = AgentData | ToolData | OutputData;
export type TypedNode = Node<NodeData>;
export type Id = string;
