"use client"

import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  type Connection,
  type OnSelectionChangeParams,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { Play, Download, Upload, Trash2, Plus, Settings, Bug } from "lucide-react";

// --- Basic shadcn/ui stand-ins (lightweight) ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }> = ({ className = "", children, ...props }) => (
    <button
        className={`px-3 py-2 rounded-2xl shadow-sm border text-sm hover:shadow transition ${className}`}
        {...props}
    >
      {children}
    </button>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> = ({ className = "", ...props }) => (
    <input
        className={`px-3 py-2 rounded-xl border text-sm w-full outline-none focus:ring ${className}`}
        {...props}
    />
);
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }> = ({ className = "", ...props }) => (
    <textarea
        className={`px-3 py-2 rounded-xl border text-sm w-full outline-none focus:ring ${className}`}
        {...props}
    />
);

// --- Types ---
type AgentData = { name?: string; model?: string; prompt?: string; preview?: string };
type ToolData = { name?: string; kind?: string; config?: { endpoint?: string } };
type OutputData = { name?: string; preview?: string };
type NodeData = AgentData | ToolData | OutputData;

type TypedNode = Node<NodeData>;

type Id = string;

// --- Custom Node UIs ---
function NodeChrome({ title, subtitle, color = "", children }: { title: string; subtitle?: string; color?: string; children?: React.ReactNode }) {
  return (
      <div className="bg-white/90 backdrop-blur rounded-2xl border shadow-sm min-w-[200px]">
        <div className={`px-3 py-2 rounded-t-2xl text-xs font-medium ${color} text-white`}>{title}</div>
        <div className="p-3 space-y-2">
          {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
  );
}

const AgentNode: React.FC<NodeProps<AgentData>> = ({ data }) => {
  return (
      <NodeChrome title={data.name || "Agent"} subtitle={data.model || "model"} color="bg-indigo-500">
        <div className="text-gray-700 line-clamp-3">{data.prompt || "Prompt goes here…"}</div>
      </NodeChrome>
  );
};

const ToolNode: React.FC<NodeProps<ToolData>> = ({ data }) => (
    <NodeChrome title={data.name || "Tool"} subtitle={data.kind || "HTTP/DB/Code"} color="bg-emerald-500">
      <div className="text-gray-700">
        {data.config?.endpoint ? (
            <div className="text-[11px] break-all">{data.config.endpoint}</div>
        ) : (
            <div className="text-[11px]">No config</div>
        )}
      </div>
    </NodeChrome>
);

const OutputNode: React.FC<NodeProps<OutputData>> = ({ data }) => (
    <NodeChrome title={data.name || "Output"} subtitle="Terminal" color="bg-slate-600">
      <div className="text-[11px] text-gray-700 whitespace-pre-wrap max-h-24 overflow-auto">
        {data.preview || "Will show the final result."}
      </div>
    </NodeChrome>
);

const nodeTypes: NodeTypes = { agent: AgentNode, tool: ToolNode, output: OutputNode };

// Utility: simple topological ordering; detects cycles
function topoSort(nodes: TypedNode[], edges: Edge[]): { order: Id[]; hasCycle: boolean } {
  const inDeg = new Map<Id, number>();
  const out = new Map<Id, Id[]>();
  nodes.forEach((n) => {
    inDeg.set(n.id, 0);
    out.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!inDeg.has(e.target as Id)) inDeg.set(e.target as Id, 0);
    inDeg.set(e.target as Id, (inDeg.get(e.target as Id) || 0) + 1);
    if (!out.has(e.source as Id)) out.set(e.source as Id, []);
    out.get(e.source as Id)!.push(e.target as Id);
  });
  const q: Id[] = [];
  inDeg.forEach((v, k) => v === 0 && q.push(k));
  const order: Id[] = [];
  while (q.length) {
    const k = q.shift() as Id;
    order.push(k);
    (out.get(k) || []).forEach((t) => {
      inDeg.set(t, (inDeg.get(t) || 0) - 1);
      if (inDeg.get(t) === 0) q.push(t);
    });
  }
  if (order.length !== nodes.length) return { order: [], hasCycle: true };
  return { order, hasCycle: false };
}

function PaletteItem({ type, label, meta }: { type: "agent" | "tool" | "output"; label: string; meta?: NodeData }) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({ type, meta })
    );
    event.dataTransfer.effectAllowed = "move";
  };
  return (
      <div
          draggable
          onDragStart={onDragStart}
          className="flex items-center justify-between w-full px-3 py-2 border rounded-xl hover:bg-gray-50 cursor-grab active:cursor-grabbing"
      >
        <span className="text-sm">{label}</span>
        <Plus size={16} />
      </div>
  );
}

function Toolbar({ onRun, onClear, onExport, onImport, onAddSample }: { onRun: () => void | Promise<void>; onClear: () => void; onExport: () => void; onImport: React.ChangeEventHandler<HTMLInputElement>; onAddSample: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
      <div className="flex items-center gap-2">
        <Button onClick={onRun} className="bg-indigo-600 text-white flex items-center gap-2">
          <Play size={16} /> Run
        </Button>
        <Button onClick={onAddSample} className="flex items-center gap-2">
          <Bug size={16} /> Sample
        </Button>
        <Button onClick={onClear} className="flex items-center gap-2">
          <Trash2 size={16} /> Clear
        </Button>
        <Button onClick={onExport} className="flex items-center gap-2">
          <Download size={16} /> Export JSON
        </Button>
        <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
        />
        <Button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2"
        >
          <Upload size={16} /> Import JSON
        </Button>
      </div>
  );
}

function PropertiesPanel({ selected, onChange }: { selected: TypedNode | null | undefined; onChange: (patch: Partial<AgentData & ToolData & OutputData>) => void }) {
  if (!selected) return (
      <div className="text-sm text-gray-500">Select a node to edit its properties.</div>
  );
  const { id, type, data } = selected;
  return (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">{id} • {type}</div>
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Name</label>
          <Input value={data.name || ""} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        {type === "agent" && (
            <>
              <div className="grid gap-2">
                <label className="text-xs text-gray-600">Model</label>
                <Input value={(data as AgentData).model || "gpt-4o-mini"} onChange={(e) => onChange({ model: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-gray-600">Prompt</label>
                <Textarea rows={5} value={(data as AgentData).prompt || ""} onChange={(e) => onChange({ prompt: e.target.value })} />
              </div>
            </>
        )}
        {type === "tool" && (
            <>
              <div className="grid gap-2">
                <label className="text-xs text-gray-600">Kind</label>
                <Input value={(data as ToolData).kind || "http"} onChange={(e) => onChange({ kind: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-gray-600">Endpoint</label>
                <Input value={(data as ToolData).config?.endpoint || ""} onChange={(e) => onChange({ config: { ...(((data as ToolData).config)||{}), endpoint: e.target.value } })} />
              </div>
            </>
        )}
        {type === "output" && (
            <div className="grid gap-2">
              <label className="text-xs text-gray-600">Label</label>
              <Input value={data.name || "Output"} onChange={(e) => onChange({ name: e.target.value })} />
            </div>
        )}
      </div>
  );
}

function Console({ logs, onClear }: { logs: string[]; onClear: () => void }) {
  return (
      <div className="bg-white border rounded-2xl p-3 h-40 overflow-auto text-xs">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium">Run Console</div>
          <Button onClick={onClear} className="text-xs">Clear</Button>
        </div>
        {logs.length === 0 ? (
            <div className="text-gray-500">No output yet. Click Run to simulate.</div>
        ) : (
            <pre className="whitespace-pre-wrap leading-relaxed">{logs.join("\n")}</pre>
        )}
      </div>
  );
}

function EditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<NodeData, Edge> | null>(null);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const data = event.dataTransfer.getData("application/reactflow");
    if (!data || !rfInstance) return;
    const { type, meta } = JSON.parse(data) as { type: "agent" | "tool" | "output"; meta?: NodeData };
    const position = rfInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    const id = uuidv4();
    const label = type === "agent" ? `Agent ${nodes.filter(n=>n.type==='agent').length+1}` : type === "tool" ? `Tool ${nodes.filter(n=>n.type==='tool').length+1}` : `Output`;
    const newNode: TypedNode = {
      id,
      type,
      position,
      data: (meta as NodeData) || ({ name: label, model: "gpt-4o-mini" } as AgentData),
    } as TypedNode;
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance, setNodes, nodes]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    setSelectedId(nodes?.[0]?.id || null);
  }, []);

  const updateSelected = (patch: Partial<AgentData & ToolData & OutputData>) => {
    if (!selectedId) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...(n.data as object), ...(patch as object) } } : n)));
  };

  const clearAll = () => {
    setNodes([]); setEdges([]); setLogs([]); setSelectedId(null);
  };

  const exportJSON = () => {
    const payload = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(text) as { nodes?: TypedNode[]; edges?: Edge[] };
        setNodes(parsed.nodes || []);
        setEdges((parsed.edges || []).map((ed) => ({ ...ed, markerEnd: { type: MarkerType.ArrowClosed } })));
      } catch (err) {
        console.log(err);
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const addSample = () => {
    const a1: TypedNode = { id: uuidv4(), type: "agent", position: { x: 100, y: 100 }, data: { name: "Researcher", model: "gpt-4o-mini", prompt: "Summarize docs into 3 bullets." } } as TypedNode;
    const t1: TypedNode = { id: uuidv4(), type: "tool", position: { x: 400, y: 120 }, data: { name: "WebFetch", kind: "http", config: { endpoint: "https://example.com" } } } as TypedNode;
    const a2: TypedNode = { id: uuidv4(), type: "agent", position: { x: 700, y: 100 }, data: { name: "Writer", model: "gpt-4o-mini", prompt: "Turn bullets into a friendly paragraph." } } as TypedNode;
    const out: TypedNode = { id: uuidv4(), type: "output", position: { x: 1000, y: 120 }, data: { name: "Final Output", preview: "" } } as TypedNode;
    const es: Edge[] = [
      { id: uuidv4(), source: a1.id, target: t1.id },
      { id: uuidv4(), source: t1.id, target: a2.id },
      { id: uuidv4(), source: a2.id, target: out.id },
    ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));
    setNodes([a1, t1, a2, out]);
    setEdges(es);
  };

  // Fake runtime: walk DAG, fabricate outputs
  const run = async () => {
    setLogs([]);
    const { order, hasCycle } = topoSort(nodes, edges);
    if (hasCycle) {
      setLogs((l) => l.concat("❌ Graph has a cycle. Break loops to run."));
      return;
    }
    const byId: Record<Id, TypedNode> = nodes.reduce((acc, n) => {
      acc[n.id] = n;
      return acc;
    }, {} as Record<Id, TypedNode>);
    const incoming: Record<Id, Id[]> = nodes.reduce((acc, n) => {
      acc[n.id] = [] as Id[];
      return acc;
    }, {} as Record<Id, Id[]>);
    edges.forEach((e) => incoming[e.target as Id].push(e.source as Id));
    const values: Record<Id, string> = {};

    for (const nodeId of order) {
      const n = byId[nodeId];
      if (n.type === "agent") {
        const d = n.data as AgentData;
        const deps = incoming[n.id].map((i) => values[i]).filter(Boolean);
        const input = deps.join("\n");
        const text = `🤖 ${d.name || "Agent"} (${d.model || "model"})\nPrompt: ${d.prompt || ""}\nInput: ${input || "<none>"}\nOutput: ${Math.random().toString(36).slice(2, 8)} …`;
        values[n.id] = text;
        setLogs((l) => l.concat(text));
      } else if (n.type === "tool") {
        const d = n.data as ToolData;
        const deps = incoming[n.id].map((i) => values[i]).filter(Boolean);
        const endpoint = d?.config?.endpoint || "(no endpoint)";
        const text = `🔧 ${d.name || "Tool"} [${d.kind || "tool"}]\nGET ${endpoint}\nBody: ${deps.join("\n").slice(0, 120)}`;
        values[n.id] = text;
        setLogs((l) => l.concat(text));
      } else if (n.type === "output") {
        const d = n.data as OutputData;
        console.log(d);
        const deps = incoming[n.id].map((i) => values[i]).filter(Boolean);
        const text = `📦 Final: ${deps[deps.length - 1] || deps.join("\n") || "<empty>"}`;
        values[n.id] = text;
        setLogs((l) => l.concat(text));
        // also write preview into the node
        setNodes((nds) => nds.map((m) => (m.id === n.id ? { ...m, data: { ...m.data, preview: text.slice(0, 140) } } : m)));
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    setLogs((l) => l.concat("✅ Done."));
  };

  return (
      <div className="w-full h-[85vh] grid grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-4">
        {/* Header */}
        <div className="col-span-3 flex items-center justify-between">
          <div className="text-xl font-semibold">Multi‑Agent Workflow Editor</div>
          <Toolbar onRun={run} onClear={clearAll} onExport={exportJSON} onImport={importJSON} onAddSample={addSample} />
        </div>

        {/* Palette */}
        <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Palette</div>
          <PaletteItem type="agent" label="Agent" meta={{ name: "Agent", model: "gpt-4o-mini", prompt: "Your prompt here" }} />
          <PaletteItem type="tool" label="Tool" meta={{ name: "Tool", kind: "http", config: { endpoint: "https://api.example.com" } }} />
          <PaletteItem type="output" label="Output" meta={{ name: "Output" }} />
          <div className="pt-2 text-[11px] text-gray-500">Drag items onto the canvas. Connect nodes by dragging from a handle edge to another node.</div>
        </div>

        {/* Canvas */}
        <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
          <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onSelectionChange={onSelectionChange}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              onInit={setRfInstance}
          >
            <Background gap={16} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>

        {/* Properties */}
        <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-gray-500">Properties</div>
            <Settings size={16} />
          </div>
          <PropertiesPanel selected={selected} onChange={updateSelected} />
        </div>

        {/* Console */}
        <div className="col-span-3">
          <Console logs={logs} onClear={() => setLogs([])} />
        </div>
      </div>
  );
}

export default function Home() {
  return (
      <div className="p-4 bg-slate-50">
        <ReactFlowProvider>
          <EditorInner />
        </ReactFlowProvider>
      </div>
  );
}
