import { MarkerType, type Edge } from '@xyflow/react';
import type { TypedNode } from '@/types';

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  node_count: number;
  node_types: string[]; // all type strings in node order, including duplicates
  buildWorkflow: () => { nodes: TypedNode[]; edges: Edge[] };
}

// Helper used by several samples
const edge = (source: string, target: string, extra?: Partial<Edge>): Edge => ({
  id: crypto.randomUUID(),
  source,
  target,
  markerEnd: { type: MarkerType.ArrowClosed },
  ...extra,
});

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'document-summarizer',
    name: 'Document Summarizer',
    description: 'Upload a PDF and get a concise summary using an LLM agent.',
    node_count: 3,
    node_types: ['document', 'agent', 'result'],
    buildWorkflow: () => {
      const doc: TypedNode = {
        id: crypto.randomUUID(), type: 'document', position: { x: 100, y: 150 },
        data: { name: 'Research Paper', fileName: '', fileType: 'pdf', content: '', size: 0, uploadedAt: new Date().toISOString() },
      } as TypedNode;
      const agent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 400, y: 150 },
        data: { name: 'Summarizer', model: 'openai/gpt-4o-mini', prompt: 'Summarize the above document in 3-5 clear bullet points. Focus on the key findings and main conclusions.', mode: 'live', streaming: true, temperature: 0.3 },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 750, y: 150 },
        data: { name: 'Summary', preview: '' },
      } as TypedNode;
      return {
        nodes: [doc, agent, result],
        edges: [
          edge(doc.id, agent.id),
          edge(agent.id, result.id),
        ],
      };
    },
  },
  {
    id: 'rag-pipeline',
    name: 'RAG Pipeline',
    description: 'Chunk a document and analyze it with a context-aware LLM agent.',
    node_count: 4,
    node_types: ['document', 'chunker', 'agent', 'result'],
    buildWorkflow: () => {
      const doc: TypedNode = {
        id: crypto.randomUUID(), type: 'document', position: { x: 50, y: 150 },
        data: { name: 'Long Article', fileName: '', fileType: 'txt', content: '', size: 0, uploadedAt: new Date().toISOString() },
      } as TypedNode;
      const chunker: TypedNode = {
        id: crypto.randomUUID(), type: 'chunker', position: { x: 300, y: 150 },
        data: { name: 'Smart Chunker', strategy: 'semantic', chunkSize: 500, overlap: 50 },
      } as TypedNode;
      const agent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 600, y: 150 },
        data: { name: 'Analyzer', model: 'openai/gpt-4o-mini', prompt: 'Based on the document chunks above, identify the main themes and provide key insights. What are the most important concepts discussed?', mode: 'live', streaming: true, temperature: 0.5 },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 950, y: 150 },
        data: { name: 'Analysis', preview: '' },
      } as TypedNode;
      return {
        nodes: [doc, chunker, agent, result],
        edges: [
          edge(doc.id, chunker.id),
          edge(chunker.id, agent.id),
          edge(agent.id, result.id),
        ],
      };
    },
  },
  {
    id: 'multi-agent-analysis',
    name: 'Multi-Agent Analysis',
    description: 'Run two agents in parallel on a document, then synthesize their outputs.',
    node_count: 5,
    node_types: ['document', 'agent', 'agent', 'agent', 'result'],
    buildWorkflow: () => {
      const doc: TypedNode = {
        id: crypto.randomUUID(), type: 'document', position: { x: 50, y: 200 },
        data: { name: 'Source Material', fileName: '', fileType: 'pdf', content: '', size: 0, uploadedAt: new Date().toISOString() },
      } as TypedNode;
      const agent1: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 300, y: 100 },
        data: { name: 'Extractor', model: 'openai/gpt-4o-mini', prompt: 'Extract all key facts, statistics, and data points from the document. List them clearly.', mode: 'live', streaming: false, temperature: 0.1 },
      } as TypedNode;
      const agent2: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 300, y: 300 },
        data: { name: 'Contextualizer', model: 'openai/gpt-4o-mini', prompt: "Read the original document and identify the broader context and implications. What's the bigger picture?", mode: 'live', streaming: false, temperature: 0.7 },
      } as TypedNode;
      const synthesizer: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 650, y: 200 },
        data: { name: 'Synthesizer', model: 'openai/gpt-4o-mini', prompt: 'Combine the factual analysis and contextual insights above into a comprehensive report. Connect the data to the bigger picture.', mode: 'live', streaming: true, temperature: 0.5 },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 950, y: 200 },
        data: { name: 'Final Report', preview: '' },
      } as TypedNode;
      return {
        nodes: [doc, agent1, agent2, synthesizer, result],
        edges: [
          { id: crypto.randomUUID(), source: doc.id, target: agent1.id, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: crypto.randomUUID(), source: doc.id, target: agent2.id, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: crypto.randomUUID(), source: agent1.id, target: synthesizer.id, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: crypto.randomUUID(), source: agent2.id, target: synthesizer.id, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: crypto.randomUUID(), source: synthesizer.id, target: result.id, markerEnd: { type: MarkerType.ArrowClosed } },
        ],
      };
    },
  },
  {
    id: 'keyword-router',
    name: 'Keyword Router',
    description: 'Route a prompt to different agents based on keyword matching.',
    node_count: 6,
    node_types: ['prompt', 'router', 'agent', 'agent', 'result', 'result'],
    buildWorkflow: () => {
      const routeWeatherId = crypto.randomUUID();
      const routeTravelId = crypto.randomUUID();
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 50, y: 220 },
        data: { name: 'User Query', text: 'The weather today is sunny with a high of 75°F and light winds. Perfect conditions for outdoor activities!' },
      } as TypedNode;
      const router: TypedNode = {
        id: crypto.randomUUID(), type: 'router', position: { x: 300, y: 220 },
        data: {
          name: 'Topic Router', strategy: 'keyword',
          routes: [
            { id: routeWeatherId, label: 'Weather Info', condition: { type: 'keyword', keywords: ['weather', 'forecast', 'temperature', 'sunny', 'rain', 'wind'], matchMode: 'any', caseSensitive: false } },
            { id: routeTravelId, label: 'Travel Tips', condition: { type: 'keyword', keywords: ['travel', 'vacation', 'trip', 'hotel', 'flight', 'destination'], matchMode: 'any', caseSensitive: false } },
          ],
          executionState: 'idle',
        },
      } as TypedNode;
      const weatherAgent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 580, y: 100 },
        data: { name: 'Weather Agent', model: 'openai/gpt-4o-mini', prompt: 'Provide a friendly, helpful weather summary and 3 activity recommendations based on the conditions described. Be concise.', mode: 'live', streaming: true, temperature: 0.5 },
      } as TypedNode;
      const travelAgent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 580, y: 340 },
        data: { name: 'Travel Agent', model: 'openai/gpt-4o-mini', prompt: 'Provide helpful travel tips and 3 destination recommendations based on the travel topic described. Be concise.', mode: 'live', streaming: true, temperature: 0.5 },
      } as TypedNode;
      const weatherResult: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 870, y: 100 },
        data: { name: 'Weather Response', preview: '' },
      } as TypedNode;
      const travelResult: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 870, y: 340 },
        data: { name: 'Travel Response', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, router, weatherAgent, travelAgent, weatherResult, travelResult],
        edges: [
          edge(prompt.id, router.id),
          edge(router.id, weatherAgent.id, { sourceHandle: routeWeatherId }),
          edge(router.id, travelAgent.id, { sourceHandle: routeTravelId }),
          edge(weatherAgent.id, weatherResult.id),
          edge(travelAgent.id, travelResult.id),
        ],
      };
    },
  },
  {
    id: 'llm-judge-router',
    name: 'LLM Judge Router',
    description: 'Use an LLM to evaluate which route to take based on the input content.',
    node_count: 6,
    node_types: ['prompt', 'router', 'agent', 'agent', 'result', 'result'],
    buildWorkflow: () => {
      const routeUrgentId = crypto.randomUUID();
      const routeStandardId = crypto.randomUUID();
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 50, y: 220 },
        data: { name: 'Support Request', text: 'URGENT: My account appears to have been compromised. I see logins from unknown locations and cannot access critical files. This needs immediate attention!' },
      } as TypedNode;
      const router: TypedNode = {
        id: crypto.randomUUID(), type: 'router', position: { x: 300, y: 220 },
        data: {
          name: 'Priority Router', strategy: 'llm-judge', judgeModel: 'openai/gpt-4o-mini',
          routes: [
            { id: routeUrgentId, label: 'Urgent Issue', condition: { type: 'llm-judge', judgePrompt: 'Is this message describing a security emergency, account compromise, or critical incident that requires immediate attention?' } },
            { id: routeStandardId, label: 'Standard Request', condition: { type: 'llm-judge', judgePrompt: 'Is this a routine support request or general inquiry that can be handled through normal business process?' } },
          ],
          executionState: 'idle',
        },
      } as TypedNode;
      const urgentAgent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 580, y: 100 },
        data: { name: 'Urgent Response', model: 'openai/gpt-4o-mini', prompt: 'You are an emergency support specialist. Respond to this security incident with immediate action steps. Be direct and reassuring. List 5 specific immediate actions to take.', mode: 'live', streaming: true, temperature: 0.3 },
      } as TypedNode;
      const standardAgent: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 580, y: 340 },
        data: { name: 'Standard Response', model: 'openai/gpt-4o-mini', prompt: 'You are a helpful support agent. Provide a professional, friendly response to this support request. Include expected response time and next steps.', mode: 'live', streaming: true, temperature: 0.5 },
      } as TypedNode;
      const urgentResult: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 870, y: 100 },
        data: { name: 'Urgent Response', preview: '' },
      } as TypedNode;
      const standardResult: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 870, y: 340 },
        data: { name: 'Standard Response', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, router, urgentAgent, standardAgent, urgentResult, standardResult],
        edges: [
          edge(prompt.id, router.id),
          edge(router.id, urgentAgent.id, { sourceHandle: routeUrgentId }),
          edge(router.id, standardAgent.id, { sourceHandle: routeStandardId }),
          edge(urgentAgent.id, urgentResult.id),
          edge(standardAgent.id, standardResult.id),
        ],
      };
    },
  },
  {
    id: 'refine-loop',
    name: 'Refine Loop',
    description: 'Iteratively refine a draft using an LLM agent with a break condition.',
    node_count: 4,
    node_types: ['prompt', 'loop', 'agent', 'result'],
    buildWorkflow: () => {
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 50, y: 220 },
        data: { name: 'Initial Draft', text: 'Draft product description: A new smartphone with a 5000mAh battery and triple camera system.' },
      } as TypedNode;
      const loop: TypedNode = {
        id: crypto.randomUUID(), type: 'loop', position: { x: 280, y: 220 },
        data: { name: 'Refine Loop', maxIterations: 3, currentIteration: 0, breakCondition: { type: 'keyword', keywords: ['APPROVED'], caseSensitive: true }, executionState: 'idle' },
      } as TypedNode;
      const refiner: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 560, y: 220 },
        data: { name: 'Copy Refiner', model: 'openai/gpt-4o-mini', prompt: 'Review the product description above and improve it to be more compelling and professional. Add specific benefits, emotional appeal, and a clear value proposition. Keep it under 100 words. If this draft is already excellent and no further improvement is needed, end your response with the word APPROVED.', mode: 'live', streaming: false, temperature: 0.7 },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 280, y: 440 },
        data: { name: 'Final Description', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, loop, refiner, result],
        edges: [
          edge(prompt.id, loop.id),
          edge(loop.id, refiner.id, { sourceHandle: 'continue' }),
          edge(refiner.id, loop.id),
          edge(loop.id, result.id, { sourceHandle: 'exit' }),
        ],
      };
    },
  },
  {
    id: 'web-search',
    name: 'Web Search Pipeline',
    description: 'Search the web and summarize results with an LLM agent.',
    node_count: 4,
    node_types: ['prompt', 'tool', 'agent', 'result'],
    buildWorkflow: () => {
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 50, y: 220 },
        data: { name: 'Search Topic', text: 'latest advances in quantum computing 2025' },
      } as TypedNode;
      const webSearch: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 300, y: 220 },
        data: { name: 'Web Search', kind: 'web-search', config: { maxResults: 5 } },
      } as TypedNode;
      const summarizer: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 580, y: 220 },
        data: { name: 'Summarizer', model: 'openai/gpt-4o-mini', prompt: 'Summarize the following search results into a concise 3-paragraph report:\n\n{{input}}', mode: 'live', streaming: true, temperature: 0.4 },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 880, y: 220 },
        data: { name: 'Research Report', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, webSearch, summarizer, result],
        edges: [edge(prompt.id, webSearch.id), edge(webSearch.id, summarizer.id), edge(summarizer.id, result.id)],
      };
    },
  },
  {
    id: 'code-gen',
    name: 'Code Gen + Execute',
    description: 'Generate JavaScript code with an LLM and run it via WebContainers.',
    node_count: 4,
    node_types: ['prompt', 'agent', 'tool', 'result'],
    buildWorkflow: () => {
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 100, y: 50 },
        data: { name: 'Task', text: 'Write a program that prints the first 15 Fibonacci numbers' },
      } as TypedNode;
      const codeWriter: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 100, y: 210 },
        data: { name: 'Code Writer', model: 'openai/gpt-4o-mini', prompt: 'Write a JavaScript program for Node.js that accomplishes this task:\n\n{{input}}\n\nReturn ONLY the JavaScript code. No markdown code fences, no explanation, just raw executable JavaScript.', mode: 'live', streaming: true },
      } as TypedNode;
      const runCode: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 100, y: 370 },
        data: { name: 'Run Code', kind: 'code-exec', config: { code: '', timeout: 15 } },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 100, y: 530 },
        data: { name: 'Output', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, codeWriter, runCode, result],
        edges: [edge(prompt.id, codeWriter.id), edge(codeWriter.id, runCode.id), edge(runCode.id, result.id)],
      };
    },
  },
  {
    id: 'api-fetch',
    name: 'API Fetch + Analyze',
    description: 'Fetch data from an HTTP API and analyze it with an LLM agent.',
    node_count: 4,
    node_types: ['prompt', 'tool', 'agent', 'result'],
    buildWorkflow: () => {
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 100, y: 50 },
        data: { name: 'Instructions', text: 'Analyze the user data from the API and identify any patterns' },
      } as TypedNode;
      const fetchTool: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 100, y: 210 },
        data: { name: 'Fetch Users API', kind: 'http', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/users', headers: [] } },
      } as TypedNode;
      const analyst: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 100, y: 370 },
        data: { name: 'Data Analyst', model: 'openai/gpt-4o-mini', prompt: 'You fetched the following JSON data from an API:\n\n{{input}}\n\nAnalyze this data and provide:\n1. A brief summary of what the dataset contains\n2. 2-3 interesting observations or patterns\n3. A short conclusion', mode: 'live', streaming: true },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 100, y: 530 },
        data: { name: 'Analysis', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, fetchTool, analyst, result],
        edges: [edge(prompt.id, analyst.id), edge(fetchTool.id, analyst.id), edge(analyst.id, result.id)],
      };
    },
  },
  {
    id: 'db-report',
    name: 'DB Query + Report',
    description: 'Run a database query and generate a professional report with an LLM agent.',
    node_count: 3,
    node_types: ['tool', 'agent', 'result'],
    buildWorkflow: () => {
      const queryTool: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 100, y: 50 },
        data: { name: 'Query Users', kind: 'database', config: { connectionString: '', query: 'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;' } },
      } as TypedNode;
      const reportWriter: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 100, y: 210 },
        data: { name: 'Report Writer', model: 'openai/gpt-4o-mini', prompt: 'You have queried a database and received these results:\n\n{{input}}\n\nWrite a concise professional report summarizing:\n1. What data was returned\n2. Key observations\n3. Any notable patterns', mode: 'live', streaming: true },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 100, y: 370 },
        data: { name: 'Report', preview: '' },
      } as TypedNode;
      return {
        nodes: [queryTool, reportWriter, result],
        edges: [edge(queryTool.id, reportWriter.id), edge(reportWriter.id, result.id)],
      };
    },
  },
  {
    id: 'research-code',
    name: 'Research & Code Pipeline',
    description: 'Search the web, generate JavaScript based on the results, and run it.',
    node_count: 5,
    node_types: ['prompt', 'tool', 'agent', 'tool', 'result'],
    buildWorkflow: () => {
      const prompt: TypedNode = {
        id: crypto.randomUUID(), type: 'prompt', position: { x: 100, y: 50 },
        data: { name: 'Topic', text: 'JavaScript array methods' },
      } as TypedNode;
      const webSearch: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 100, y: 210 },
        data: { name: 'Web Search', kind: 'web-search', config: { maxResults: 5 } },
      } as TypedNode;
      const codeGenerator: TypedNode = {
        id: crypto.randomUUID(), type: 'agent', position: { x: 100, y: 370 },
        data: { name: 'Code Generator', model: 'openai/gpt-4o-mini', prompt: 'You are a JavaScript educator. Based on these search results:\n\n{{input}}\n\nWrite a working Node.js program that demonstrates the key concepts found in the search results. The program should:\n- Use console.log() to show examples\n- Be self-contained (no external imports)\n- Demonstrate at least 3-4 concepts\n\nReturn ONLY raw JavaScript code. No markdown fences, no explanation.', mode: 'live', streaming: true },
      } as TypedNode;
      const runCode: TypedNode = {
        id: crypto.randomUUID(), type: 'tool', position: { x: 100, y: 530 },
        data: { name: 'Run Code', kind: 'code-exec', config: { code: '', timeout: 20 } },
      } as TypedNode;
      const result: TypedNode = {
        id: crypto.randomUUID(), type: 'result', position: { x: 100, y: 690 },
        data: { name: 'Output', preview: '' },
      } as TypedNode;
      return {
        nodes: [prompt, webSearch, codeGenerator, runCode, result],
        edges: [
          edge(prompt.id, webSearch.id),
          edge(webSearch.id, codeGenerator.id),
          edge(codeGenerator.id, runCode.id),
          edge(runCode.id, result.id),
        ],
      };
    },
  },
];
