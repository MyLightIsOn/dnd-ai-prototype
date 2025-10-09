"use client";
import {
  ReactFlowProvider,
  type Edge,
  type Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import { Settings } from "lucide-react";
import React, { useMemo, useState } from "react";

import { topoSort } from "@/lib/topoSort";
import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";

import type { AgentData, ToolData, OutputData, TypedNode, Id } from "@/types";

export default function App() {
  const [nodes, setNodes] = useState<TypedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId],
  );

  const updateSelected = (
    patch: Partial<AgentData & ToolData & OutputData>,
  ) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? { ...n, data: { ...(n.data as object), ...(patch as object) } }
          : n,
      ),
    );
  };

  const onSelectionChange = ({
    nodes: selectedNodes,
  }: {
    nodes: TypedNode[];
  }) => {
    setSelectedId(selectedNodes?.[0]?.id || null);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setLogs([]);
    setSelectedId(null);
  };

  const addSample = () => {
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
      type: "output",
      position: { x: 1000, y: 120 },
      data: { name: "Final Output", preview: "" },
    } as TypedNode;
    const es: Edge[] = [
      { id: crypto.randomUUID(), source: a1.id, target: t1.id },
      { id: crypto.randomUUID(), source: t1.id, target: a2.id },
      { id: crypto.randomUUID(), source: a2.id, target: out.id },
    ].map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));
    setNodes([a1, t1, a2, out]);
    setEdges(es);
  };

  const run = async () => {
    setLogs([]);
    const { order, hasCycle } = topoSort(nodes, edges);
    if (hasCycle) {
      setLogs((l) => l.concat("❌ Graph has a cycle. Break loops to run."));
      return;
    }
    const byId: Record<Id, TypedNode> = nodes.reduce(
      (acc, n) => {
        acc[n.id] = n;
        return acc;
      },
      {} as Record<Id, TypedNode>,
    );
    const incoming: Record<Id, Id[]> = nodes.reduce(
      (acc, n) => {
        acc[n.id] = [] as Id[];
        return acc;
      },
      {} as Record<Id, Id[]>,
    );
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
        const deps = incoming[n.id].map((i) => values[i]).filter(Boolean);
        const text = `📦 Final: ${deps[deps.length - 1] || deps.join("\n") || "<empty>"}`;
        values[n.id] = text;
        setLogs((l) => l.concat(text));
        setNodes((nds) =>
          nds.map((m) =>
            m.id === n.id
              ? { ...m, data: { ...m.data, preview: text.slice(0, 140) } }
              : m,
          ),
        );
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    setLogs((l) => l.concat("✅ Done."));
  };

  return (
    <div className="p-4 bg-slate-50">
      <ReactFlowProvider>
        <div className="w-full h-[85vh] grid grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-4">
          <Header
            onRun={run}
            onClear={clearAll}
            onExport={() => {
              exportJSON({ nodes, edges });
            }}
            onImport={(e) => {
              importJSON({ e, nodes, setNodes, setEdges }).then((r) =>
                console.log(r),
              );
            }}
            onAddSample={addSample}
          />
          <Palette />

          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort
              nodes={nodes as unknown as Node[]}
              setNodes={setNodes as any}
              edges={edges}
              setEdges={setEdges as any}
              onSelectionChange={onSelectionChange as any}
            />
          </div>

          <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Properties
              </div>
              <Settings size={16} />
            </div>
            <PropertiesPanel
              selected={selected as any}
              onChange={updateSelected}
            />
          </div>

          <div className="col-span-3">
            <Console logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
