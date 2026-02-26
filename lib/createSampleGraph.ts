import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { TypedNode } from "@/types";

export function createSampleGraph(): {
  nodes: TypedNode[];
  edges: Edge[];
} {
  const a1: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 100, y: 100 },
    data: {
      name: "Researcher",
      model: "gpt-4o-mini",
      prompt: "Summarize docs into 3 bullets.",
    },
  } as TypedNode;
  const t1: TypedNode = {
    id: crypto.randomUUID(),
    type: "tool",
    position: { x: 400, y: 120 },
    data: {
      name: "WebFetch",
      kind: "http",
      config: { endpoint: "https://example.com" },
    },
  } as TypedNode;
  const a2: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 700, y: 100 },
    data: {
      name: "Writer",
      model: "gpt-4o-mini",
      prompt: "Turn bullets into a friendly paragraph.",
    },
  } as TypedNode;
  const out: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 1000, y: 120 },
    data: { name: "Final Output", preview: "" },
  } as TypedNode;
  const es: Edge[] = [
    { id: crypto.randomUUID(), source: a1.id, target: t1.id },
    { id: crypto.randomUUID(), source: t1.id, target: a2.id },
    { id: crypto.randomUUID(), source: a2.id, target: out.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));
  return { nodes: [a1, t1, a2, out], edges: es };
}

/**
 * Web Search Pipeline
 * Prompt → Web Search Tool → Summarizer Agent → Research Report
 * Demonstrates: web search tool, live agent summarization
 */
export function createWebSearchSample(): {
  nodes: TypedNode[];
  edges: Edge[];
} {
  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Search Topic",
      text: "latest advances in quantum computing 2025",
    },
  } as TypedNode;

  const webSearch: TypedNode = {
    id: crypto.randomUUID(),
    type: "tool",
    position: { x: 300, y: 220 },
    data: {
      name: "Web Search",
      kind: "web-search",
      config: { maxResults: 5 },
    },
  } as TypedNode;

  const summarizer: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 580, y: 220 },
    data: {
      name: "Summarizer",
      model: "openai/gpt-4o-mini",
      prompt: "Summarize the following search results into a concise 3-paragraph report:\n\n{{input}}",
      mode: "live",
      streaming: true,
      temperature: 0.4,
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 880, y: 220 },
    data: { name: "Research Report", preview: "" },
  } as TypedNode;

  const edges: Edge[] = [
    { id: crypto.randomUUID(), source: prompt.id, target: webSearch.id },
    { id: crypto.randomUUID(), source: webSearch.id, target: summarizer.id },
    { id: crypto.randomUUID(), source: summarizer.id, target: result.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));

  return { nodes: [prompt, webSearch, summarizer, result], edges };
}
