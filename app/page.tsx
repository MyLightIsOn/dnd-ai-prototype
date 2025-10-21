"use client";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import { Settings } from "lucide-react";
import React, { useMemo, useState } from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
import { addSample as addSampleLib } from "@/lib/addSample";
import { run as runLib } from "@/lib/run";

import type { AgentData, ToolData, OutputData, TypedNode } from "@/types";

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
    addSampleLib(setNodes, setEdges);
  };

  const run = async () => {
    await runLib(nodes, edges, setLogs, setNodes);
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
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              onSelectionChange={onSelectionChange}
            />
          </div>

          <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Properties
              </div>
              <Settings size={16} />
            </div>
            <PropertiesPanel selected={selected} onChange={updateSelected} />
          </div>

          <div className="col-span-3">
            <Console logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
