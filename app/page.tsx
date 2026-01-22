"use client";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import SettingsModal from "@/components/settings";
import { ErrorDialog } from "@/components/error-dialog";
import { Settings } from "lucide-react";
import React, { useMemo, useState, useRef } from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
import { addDocumentSummarizer, addRAGPipeline, addMultiAgentAnalysis } from "@/lib/addSample";
import { run as runLib, type ExecutionStatus } from "@/lib/run";

import type { AgentData, ToolData, OutputData, TypedNode, PromptData, DocumentData, ChunkerData } from "@/types";

export default function App() {
  const [nodes, setNodes] = useState<TypedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const executionControlRef = useRef<ExecutionStatus>('idle');
  const [currentError, setCurrentError] = useState<{
    nodeId: string;
    nodeName: string;
    message: string;
  } | null>(null);
  const errorRecoveryActionRef = useRef<'retry' | 'skip' | 'abort' | null>(null);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId],
  );

  const updateSelected = (
    patch: Partial<AgentData & ToolData & OutputData & PromptData & DocumentData & ChunkerData>,
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

  const addSample = (sampleType: 'summarizer' | 'rag' | 'multi-agent') => {
    switch (sampleType) {
      case 'summarizer':
        addDocumentSummarizer(setNodes, setEdges);
        break;
      case 'rag':
        addRAGPipeline(setNodes, setEdges);
        break;
      case 'multi-agent':
        addMultiAgentAnalysis(setNodes, setEdges);
        break;
    }
  };

  const run = async () => {
    // Set execution status to running
    setExecutionStatus('running');
    executionControlRef.current = 'running';
    errorRecoveryActionRef.current = null;

    await runLib(nodes, edges, setLogs, setNodes, executionControlRef, errorRecoveryActionRef, setCurrentError);

    // Reset to idle after completion (unless already cancelled)
    const currentStatus = executionControlRef.current;
    if (currentStatus === 'running' || currentStatus === 'paused') {
      setExecutionStatus('idle');
      executionControlRef.current = 'idle';
    }
  };

  const pause = () => {
    setExecutionStatus('paused');
    executionControlRef.current = 'paused';
  };

  const resume = () => {
    setExecutionStatus('running');
    executionControlRef.current = 'running';
  };

  const cancel = () => {
    setExecutionStatus('cancelled');
    executionControlRef.current = 'cancelled';

    // Reset to idle after a brief moment
    setTimeout(() => {
      setExecutionStatus('idle');
      executionControlRef.current = 'idle';
    }, 100);
  };

  const handleErrorRetry = () => {
    console.log('Error recovery: Retry selected');
    errorRecoveryActionRef.current = 'retry';
    setCurrentError(null);
  };

  const handleErrorSkip = () => {
    console.log('Error recovery: Skip selected');
    errorRecoveryActionRef.current = 'skip';
    setCurrentError(null);
  };

  const handleErrorAbort = () => {
    console.log('Error recovery: Abort selected');
    errorRecoveryActionRef.current = 'abort';
    setCurrentError(null);
    cancel();
  };

  return (
    <div className="p-4 bg-slate-50">
      <ReactFlowProvider>
        <div className="w-full h-[85vh] grid grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-4">
          <Header
            onRun={run}
            onPause={pause}
            onResume={resume}
            onCancel={cancel}
            executionStatus={executionStatus}
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
            onSettings={() => setSettingsOpen(true)}
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

        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />

        <ErrorDialog
          open={currentError !== null}
          onOpenChange={(open) => !open && setCurrentError(null)}
          nodeName={currentError?.nodeName || ''}
          errorMessage={currentError?.message || ''}
          onRetry={handleErrorRetry}
          onSkip={handleErrorSkip}
          onAbort={handleErrorAbort}
        />
      </ReactFlowProvider>
    </div>
  );
}
