import { MarkerType, type Edge } from "@xyflow/react";
import type { TypedNode } from "@/types";

/**
 * Sample 1: Document Summarizer
 * Upload PDF → Agent (summarize) → Result
 * Demonstrates: Document upload, PDF extraction, live agent execution
 */
export function addDocumentSummarizer(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const doc: TypedNode = {
    id: crypto.randomUUID(),
    type: "document",
    position: { x: 100, y: 150 },
    data: {
      name: "Research Paper",
      fileName: "",
      fileType: "pdf",
      content: "",
      size: 0,
      uploadedAt: new Date().toISOString(),
    },
  } as TypedNode;

  const agent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 400, y: 150 },
    data: {
      name: "Summarizer",
      model: "openai/gpt-4o-mini",
      prompt: "Summarize the above document in 3-5 clear bullet points. Focus on the key findings and main conclusions.",
      mode: "live",
      streaming: true,
      temperature: 0.3,
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 750, y: 150 },
    data: { name: "Summary", preview: "" },
  } as TypedNode;

  const edges: Edge[] = [
    { id: crypto.randomUUID(), source: doc.id, target: agent.id },
    { id: crypto.randomUUID(), source: agent.id, target: result.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));

  setNodes([doc, agent, result]);
  setEdges(edges);
}

/**
 * Sample 2: RAG Pipeline
 * Upload Doc → Chunker → Agent (analyze) → Result
 * Demonstrates: Document chunking, semantic splitting, context-aware analysis
 */
export function addRAGPipeline(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const doc: TypedNode = {
    id: crypto.randomUUID(),
    type: "document",
    position: { x: 50, y: 150 },
    data: {
      name: "Long Article",
      fileName: "",
      fileType: "txt",
      content: "",
      size: 0,
      uploadedAt: new Date().toISOString(),
    },
  } as TypedNode;

  const chunker: TypedNode = {
    id: crypto.randomUUID(),
    type: "chunker",
    position: { x: 300, y: 150 },
    data: {
      name: "Smart Chunker",
      strategy: "semantic",
      chunkSize: 500,
      overlap: 50,
    },
  } as TypedNode;

  const agent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 600, y: 150 },
    data: {
      name: "Analyzer",
      model: "openai/gpt-4o-mini",
      prompt: "Based on the document chunks above, identify the main themes and provide key insights. What are the most important concepts discussed?",
      mode: "live",
      streaming: true,
      temperature: 0.5,
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 950, y: 150 },
    data: { name: "Analysis", preview: "" },
  } as TypedNode;

  const edges: Edge[] = [
    { id: crypto.randomUUID(), source: doc.id, target: chunker.id },
    { id: crypto.randomUUID(), source: chunker.id, target: agent.id },
    { id: crypto.randomUUID(), source: agent.id, target: result.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));

  setNodes([doc, chunker, agent, result]);
  setEdges(edges);
}

/**
 * Sample 3: Multi-Agent Analysis
 * Doc → Agent 1 (extract) → Agent 2 (synthesize) → Result
 * Demonstrates: Multi-agent workflows, sequential processing, agent collaboration
 */
export function addMultiAgentAnalysis(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const doc: TypedNode = {
    id: crypto.randomUUID(),
    type: "document",
    position: { x: 50, y: 200 },
    data: {
      name: "Source Material",
      fileName: "",
      fileType: "pdf",
      content: "",
      size: 0,
      uploadedAt: new Date().toISOString(),
    },
  } as TypedNode;

  const agent1: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 300, y: 100 },
    data: {
      name: "Extractor",
      model: "openai/gpt-4o-mini",
      prompt: "Extract all key facts, statistics, and data points from the document. List them clearly.",
      mode: "live",
      streaming: false,
      temperature: 0.1,
    },
  } as TypedNode;

  const agent2: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 300, y: 300 },
    data: {
      name: "Contextualizer",
      model: "openai/gpt-4o-mini",
      prompt: "Read the original document and identify the broader context and implications. What's the bigger picture?",
      mode: "live",
      streaming: false,
      temperature: 0.7,
    },
  } as TypedNode;

  const synthesizer: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 650, y: 200 },
    data: {
      name: "Synthesizer",
      model: "openai/gpt-4o-mini",
      prompt: "Combine the factual analysis and contextual insights above into a comprehensive report. Connect the data to the bigger picture.",
      mode: "live",
      streaming: true,
      temperature: 0.5,
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 950, y: 200 },
    data: { name: "Final Report", preview: "" },
  } as TypedNode;

  const edges: Edge[] = [
    { id: crypto.randomUUID(), source: doc.id, target: agent1.id },
    { id: crypto.randomUUID(), source: doc.id, target: agent2.id },
    { id: crypto.randomUUID(), source: agent1.id, target: synthesizer.id },
    { id: crypto.randomUUID(), source: agent2.id, target: synthesizer.id },
    { id: crypto.randomUUID(), source: synthesizer.id, target: result.id },
  ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));

  setNodes([doc, agent1, agent2, synthesizer, result]);
  setEdges(edges);
}

// Legacy function for backward compatibility
export function addSample(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  addDocumentSummarizer(setNodes, setEdges);
}
