import { MarkerType, type Edge } from "@xyflow/react";
import type { TypedNode } from "@/types";

const edge = (source: string, target: string, extra?: Partial<Edge>): Edge => ({
  id: crypto.randomUUID(),
  source,
  target,
  markerEnd: { type: MarkerType.ArrowClosed },
  ...extra,
});

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

/**
 * Sample 4: Keyword Router
 * Prompt → Router [keyword] → Weather Agent or Travel Agent → Result
 * Demonstrates: keyword routing, edge filtering, conditional execution
 */
export function addKeywordRouter(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const routeWeatherId = crypto.randomUUID();
  const routeTravelId = crypto.randomUUID();

  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "User Query",
      text: "The weather today is sunny with a high of 75°F and light winds. Perfect conditions for outdoor activities!",
    },
  } as TypedNode;

  const router: TypedNode = {
    id: crypto.randomUUID(),
    type: "router",
    position: { x: 300, y: 220 },
    data: {
      name: "Topic Router",
      strategy: "keyword",
      routes: [
        {
          id: routeWeatherId,
          label: "Weather Info",
          condition: {
            type: "keyword",
            keywords: ["weather", "forecast", "temperature", "sunny", "rain", "wind"],
            matchMode: "any",
            caseSensitive: false,
          },
        },
        {
          id: routeTravelId,
          label: "Travel Tips",
          condition: {
            type: "keyword",
            keywords: ["travel", "vacation", "trip", "hotel", "flight", "destination"],
            matchMode: "any",
            caseSensitive: false,
          },
        },
      ],
      executionState: "idle",
    },
  } as TypedNode;

  const weatherAgent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 580, y: 100 },
    data: {
      name: "Weather Agent",
      model: "openai/gpt-4o-mini",
      prompt: "Provide a friendly, helpful weather summary and 3 activity recommendations based on the conditions described. Be concise.",
      mode: "live",
      streaming: true,
      temperature: 0.5,
    },
  } as TypedNode;

  const travelAgent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 580, y: 340 },
    data: {
      name: "Travel Agent",
      model: "openai/gpt-4o-mini",
      prompt: "Provide helpful travel tips and 3 destination recommendations based on the travel topic described. Be concise.",
      mode: "live",
      streaming: true,
      temperature: 0.5,
    },
  } as TypedNode;

  const weatherResult: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 870, y: 100 },
    data: { name: "Weather Response", preview: "" },
  } as TypedNode;

  const travelResult: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 870, y: 340 },
    data: { name: "Travel Response", preview: "" },
  } as TypedNode;

  setNodes([prompt, router, weatherAgent, travelAgent, weatherResult, travelResult]);
  setEdges([
    edge(prompt.id, router.id),
    edge(router.id, weatherAgent.id, { sourceHandle: routeWeatherId }),
    edge(router.id, travelAgent.id, { sourceHandle: routeTravelId }),
    edge(weatherAgent.id, weatherResult.id),
    edge(travelAgent.id, travelResult.id),
  ]);
}

/**
 * Sample 5: LLM Judge Router
 * Prompt → Router [llm-judge] → Urgent Agent or Standard Agent → Result
 * Demonstrates: LLM-as-judge routing, AI-evaluated conditions
 */
export function addLLMJudgeRouter(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const routeUrgentId = crypto.randomUUID();
  const routeStandardId = crypto.randomUUID();

  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Support Request",
      text: "URGENT: My account appears to have been compromised. I see logins from unknown locations and cannot access critical files. This needs immediate attention!",
    },
  } as TypedNode;

  const router: TypedNode = {
    id: crypto.randomUUID(),
    type: "router",
    position: { x: 300, y: 220 },
    data: {
      name: "Priority Router",
      strategy: "llm-judge",
      judgeModel: "openai/gpt-4o-mini",
      routes: [
        {
          id: routeUrgentId,
          label: "Urgent Issue",
          condition: {
            type: "llm-judge",
            judgePrompt: "Is this message describing a security emergency, account compromise, or critical incident that requires immediate attention?",
          },
        },
        {
          id: routeStandardId,
          label: "Standard Request",
          condition: {
            type: "llm-judge",
            judgePrompt: "Is this a routine support request or general inquiry that can be handled through normal business process?",
          },
        },
      ],
      executionState: "idle",
    },
  } as TypedNode;

  const urgentAgent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 580, y: 100 },
    data: {
      name: "Urgent Response",
      model: "openai/gpt-4o-mini",
      prompt: "You are an emergency support specialist. Respond to this security incident with immediate action steps. Be direct and reassuring. List 5 specific immediate actions to take.",
      mode: "live",
      streaming: true,
      temperature: 0.3,
    },
  } as TypedNode;

  const standardAgent: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 580, y: 340 },
    data: {
      name: "Standard Response",
      model: "openai/gpt-4o-mini",
      prompt: "You are a helpful support agent. Provide a professional, friendly response to this support request. Include expected response time and next steps.",
      mode: "live",
      streaming: true,
      temperature: 0.5,
    },
  } as TypedNode;

  const urgentResult: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 870, y: 100 },
    data: { name: "Urgent Response", preview: "" },
  } as TypedNode;

  const standardResult: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 870, y: 340 },
    data: { name: "Standard Response", preview: "" },
  } as TypedNode;

  setNodes([prompt, router, urgentAgent, standardAgent, urgentResult, standardResult]);
  setEdges([
    edge(prompt.id, router.id),
    edge(router.id, urgentAgent.id, { sourceHandle: routeUrgentId }),
    edge(router.id, standardAgent.id, { sourceHandle: routeStandardId }),
    edge(urgentAgent.id, urgentResult.id),
    edge(standardAgent.id, standardResult.id),
  ]);
}

/**
 * Sample 6: Refine Loop
 * Prompt → Loop [3 iterations, keyword break] → Agent → back to Loop → Result
 * Demonstrates: iterative refinement, loop counter, break conditions
 */
export function addRefineLoop(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Initial Draft",
      text: "Draft product description: A new smartphone with a 5000mAh battery and triple camera system.",
    },
  } as TypedNode;

  const loop: TypedNode = {
    id: crypto.randomUUID(),
    type: "loop",
    position: { x: 280, y: 220 },
    data: {
      name: "Refine Loop",
      maxIterations: 3,
      currentIteration: 0,
      breakCondition: {
        type: "keyword",
        keywords: ["APPROVED"],
        caseSensitive: true,
      },
      executionState: "idle",
    },
  } as TypedNode;

  const refiner: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 560, y: 220 },
    data: {
      name: "Copy Refiner",
      model: "openai/gpt-4o-mini",
      prompt: "Review the product description above and improve it to be more compelling and professional. Add specific benefits, emotional appeal, and a clear value proposition. Keep it under 100 words. If this draft is already excellent and no further improvement is needed, end your response with the word APPROVED.",
      mode: "live",
      streaming: false,
      temperature: 0.7,
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 280, y: 440 },
    data: { name: "Final Description", preview: "" },
  } as TypedNode;

  setNodes([prompt, loop, refiner, result]);
  setEdges([
    edge(prompt.id, loop.id),
    edge(loop.id, refiner.id, { sourceHandle: "continue" }),
    edge(refiner.id, loop.id),
    edge(loop.id, result.id, { sourceHandle: "exit" }),
  ]);
}

// Legacy function for backward compatibility
export function addSample(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  addDocumentSummarizer(setNodes, setEdges);
}

/**
 * UAT Sample 4: Memory Pipeline
 * Prompt → Agent 1 [write to memory] → Memory Node → Agent 2 [read from memory] → Result
 * Demonstrates: memory node, workflow-scoped memory, memory inspector panel
 */
export function addMemoryPipeline(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Research Topic",
      text: "Key developments in large language models from 2023 to 2024, including major model releases and breakthrough capabilities.",
    },
  } as TypedNode;

  const analyst: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 300, y: 220 },
    data: {
      name: "Research Analyst",
      model: "openai/gpt-4o-mini",
      prompt: 'Analyze the research topic and respond with a JSON object containing these exact keys: "summary" (one sentence overview), "key_points" (array of 3 key findings), "recommendation" (one action item). Respond with only valid JSON, no other text.',
      mode: "live",
      streaming: false,
      temperature: 0.2,
      memoryWrite: "research_analysis",
    },
  } as TypedNode;

  const memoryNode: TypedNode = {
    id: crypto.randomUUID(),
    type: "memory",
    position: { x: 580, y: 220 },
    data: {
      name: "Research Memory",
      scope: "workflow",
      keys: [],
      executionState: "idle",
    },
  } as TypedNode;

  const writer: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 830, y: 220 },
    data: {
      name: "Report Writer",
      model: "openai/gpt-4o-mini",
      prompt: "Using the research analysis provided, write a polished executive summary report (3-4 paragraphs). Include an introduction, key findings, and actionable recommendations.",
      mode: "live",
      streaming: true,
      temperature: 0.5,
      memoryRead: ["summary", "key_points", "recommendation"],
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 1080, y: 220 },
    data: { name: "Executive Report", preview: "" },
  } as TypedNode;

  setNodes([prompt, analyst, memoryNode, writer, result]);
  setEdges([
    edge(prompt.id, analyst.id),
    edge(analyst.id, memoryNode.id),
    edge(memoryNode.id, writer.id),
    edge(writer.id, result.id),
  ]);
}

/**
 * UAT Sample 5: Content Review
 * Prompt → Agent → Human Review [single, edit-and-approve] → Result
 * Demonstrates: human-in-the-loop, single reviewer, edit-and-approve mode, audit trail
 */
export function addContentReview(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Article Brief",
      text: "Write a 150-word press release announcing the launch of our new AI-powered writing assistant tool called 'Quill'.",
    },
  } as TypedNode;

  const writer: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 300, y: 220 },
    data: {
      name: "Press Writer",
      model: "openai/gpt-4o-mini",
      prompt: "Write a professional press release based on the brief provided. Include a headline, dateline, lead paragraph, body, and boilerplate. Keep it under 200 words.",
      mode: "live",
      streaming: false,
      temperature: 0.6,
    },
  } as TypedNode;

  const review: TypedNode = {
    id: crypto.randomUUID(),
    type: "human-review",
    position: { x: 580, y: 220 },
    data: {
      name: "Editorial Review",
      instructions: "Review this press release draft. You may edit the content directly before approving. Reject if it requires a complete rewrite.",
      reviewMode: "edit-and-approve",
      executionState: "idle",
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 860, y: 220 },
    data: { name: "Final Press Release", preview: "" },
  } as TypedNode;

  setNodes([prompt, writer, review, result]);
  setEdges([
    edge(prompt.id, writer.id),
    edge(writer.id, review.id),
    edge(review.id, result.id),
  ]);
}

/**
 * UAT Sample 6: Multi-Reviewer Approval
 * Prompt → Agent → Human Review [3 reviewers, 2-of-3] → Result
 * Demonstrates: multi-reviewer workflow, approval rules, audit trail with multiple decisions
 */
export function addMultiReviewerApproval(
  setNodes: (nodes: TypedNode[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const prompt: TypedNode = {
    id: crypto.randomUUID(),
    type: "prompt",
    position: { x: 50, y: 220 },
    data: {
      name: "Policy Request",
      text: "Draft a remote work policy for a software company of 50 employees. Cover: eligible roles, core hours, equipment stipend, and performance expectations.",
    },
  } as TypedNode;

  const policyWriter: TypedNode = {
    id: crypto.randomUUID(),
    type: "agent",
    position: { x: 300, y: 220 },
    data: {
      name: "Policy Writer",
      model: "openai/gpt-4o-mini",
      prompt: "Draft a clear, comprehensive remote work policy based on the requirements. Use sections with headers. Be specific about expectations and entitlements. Keep it under 400 words.",
      mode: "live",
      streaming: false,
      temperature: 0.4,
    },
  } as TypedNode;

  const boardReview: TypedNode = {
    id: crypto.randomUUID(),
    type: "human-review",
    position: { x: 580, y: 220 },
    data: {
      name: "Board Approval",
      instructions: "Review this remote work policy draft. Approve if the policy is clear, fair, and complete. Reject if significant changes are needed.",
      reviewMode: "approve-reject",
      multiReview: {
        enabled: true,
        reviewerCount: 3,
        approvalRule: { type: "m-of-n", m: 2 },
      },
      executionState: "idle",
    },
  } as TypedNode;

  const result: TypedNode = {
    id: crypto.randomUUID(),
    type: "result",
    position: { x: 860, y: 220 },
    data: { name: "Approved Policy", preview: "" },
  } as TypedNode;

  setNodes([prompt, policyWriter, boardReview, result]);
  setEdges([
    edge(prompt.id, policyWriter.id),
    edge(policyWriter.id, boardReview.id),
    edge(boardReview.id, result.id),
  ]);
}
