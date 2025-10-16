export type NodeKind = "prompt" | "agent" | "tool" | "result";

export type RFNode<Data = any> = {
  id: string;
  type: NodeKind;
  data: Data;
};

export type RFEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type EnvConfig = {
  OPENAI_API_KEY?: string; // e.g. process.env.NEXT_PUBLIC_OPENAI_API_KEY
  OLLAMA_BASE_URL?: string; // default http://localhost:11434
  GOOGLE_API_KEY?: string; // optional for Drive
  GOOGLE_OAUTH_TOKEN?: string; // optional for Drive
};

export type NodeOutput = {
  text?: string; // primary text payload passed along edges
  meta?: any; // optional metadata/tool results
};

export type SetNodesFn = (updater: (nodes: RFNode[]) => RFNode[]) => void;
export type SetLogsFn = (updater: (logs: string[]) => string[]) => void;
