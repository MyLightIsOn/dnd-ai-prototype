"use client";
import { ReactFlowProvider, type Edge } from "@xyflow/react";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import SettingsModal from "@/components/settings";
import { ErrorDialog } from "@/components/error-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Settings } from "lucide-react";
import React, { useMemo, useState, useRef } from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
import { addDocumentSummarizer, addRAGPipeline, addMultiAgentAnalysis, addKeywordRouter, addLLMJudgeRouter, addRefineLoop, addWebSearchSample, addCodeGenSample, addApiFetchSample, addDbReportSample, addResearchCodeSample } from "@/lib/addSample";
import { runParallel as runLib, type ExecutionStatus } from "@/lib/execution/parallel-runner";
import type { CompareProvider } from '@/lib/execution/compare-runner'
import { runCompare } from '@/lib/execution/compare-runner'
import { CompareConsole } from '@/components/compare-console'

import type { TypedNode, NodeData } from "@/types";

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

  // Compare Mode state
  const [compareMode, setCompareMode] = useState(false)
  const [compareProviders, setCompareProviders] = useState<CompareProvider[]>([
    { model: 'openai/gpt-4o', displayName: 'GPT-4o', isLocked: false },
    { model: 'anthropic/claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', isLocked: false },
  ])
  const [compareLogs, setCompareLogs] = useState<string[][]>([[], []])
  const compareControlRefs = useRef<React.MutableRefObject<ExecutionStatus>[]>(
    [{ current: 'idle' as ExecutionStatus }, { current: 'idle' as ExecutionStatus }]
  )

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId],
  );

  const updateSelected = (
    patch: Partial<NodeData>,
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

  const addSample = (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => {
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
      case 'keyword-router':
        addKeywordRouter(setNodes, setEdges);
        break;
      case 'llm-judge-router':
        addLLMJudgeRouter(setNodes, setEdges);
        break;
      case 'refine-loop':
        addRefineLoop(setNodes, setEdges);
        break;
      case 'web-search':
        addWebSearchSample(setNodes, setEdges);
        break;
      case 'code-gen':
        addCodeGenSample(setNodes, setEdges);
        break;
      case 'api-fetch':
        addApiFetchSample(setNodes, setEdges);
        break;
      case 'db-report':
        addDbReportSample(setNodes, setEdges);
        break;
      case 'research-code':
        addResearchCodeSample(setNodes, setEdges);
        break;
    }
  };

  const run = async () => {
    // Set execution status to running
    setExecutionStatus('running');
    executionControlRef.current = 'running';
    errorRecoveryActionRef.current = null;

    const { memory: _memory, auditLog: _auditLog, stats: _stats } = await runLib(nodes, edges, setLogs, setNodes, setEdges, executionControlRef, errorRecoveryActionRef, setCurrentError);

    // Reset to idle after completion (unless already cancelled)
    const currentStatus = executionControlRef.current;
    if (currentStatus === 'running' || currentStatus === 'paused') {
      setExecutionStatus('idle');
      executionControlRef.current = 'idle';
    }
  };

  const runCompareFn = async () => {
    // Ensure we have one control ref per provider
    while (compareControlRefs.current.length < compareProviders.length) {
      compareControlRefs.current.push({ current: 'idle' as ExecutionStatus })
    }
    compareControlRefs.current = compareControlRefs.current.slice(0, compareProviders.length)

    setExecutionStatus('running')
    compareControlRefs.current.forEach(ref => { ref.current = 'running' })
    setCompareLogs(compareProviders.map(() => []))

    try {
      const _compareStats = await runCompare(
        compareProviders,
        nodes,
        edges,
        setCompareLogs,
        compareControlRefs.current,
      )
    } finally {
      setExecutionStatus('idle')
      compareControlRefs.current.forEach(ref => { ref.current = 'idle' })
    }
  }

  const pause = () => {
    executionControlRef.current = 'paused';
    compareControlRefs.current.forEach(ref => { ref.current = 'paused' })
    setExecutionStatus('paused');
  };

  const resume = () => {
    setExecutionStatus('running');
    executionControlRef.current = 'running';
    compareControlRefs.current.forEach(ref => { ref.current = 'running' });
  };

  const cancel = () => {
    executionControlRef.current = 'cancelled';
    compareControlRefs.current.forEach(ref => { ref.current = 'cancelled' })
    setExecutionStatus('cancelled');

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
            onRun={compareMode ? runCompareFn : run}
            onPause={pause}
            onResume={resume}
            onCancel={cancel}
            executionStatus={executionStatus}
            onClear={clearAll}
            onExport={() => {
              exportJSON({ nodes, edges });
            }}
            onImport={(e) => {
              importJSON({ e, setNodes, setEdges }).then((r) =>
                console.log(r),
              );
            }}
            onAddSample={addSample}
            onSettings={() => setSettingsOpen(true)}
            compareMode={compareMode}
            onToggleCompare={() => {
              setCompareMode(m => !m)
              setCompareLogs(compareProviders.map(() => []))
            }}
            compareProviders={compareProviders}
            onChangeCompareProviders={(ps) => {
              setCompareProviders(ps)
              // Sync compareControlRefs to match new provider count
              while (compareControlRefs.current.length < ps.length) {
                compareControlRefs.current.push({ current: 'idle' as ExecutionStatus })
              }
              compareControlRefs.current = compareControlRefs.current.slice(0, ps.length)
              setCompareLogs(ps.map(() => []))
            }}
          />
          <Palette />

          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort
              nodes={nodes}
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
            {compareMode ? (
              <CompareConsole
                providers={compareProviders}
                logs={compareLogs}
                onClear={() => setCompareLogs(compareProviders.map(() => []))}
              />
            ) : (
              <Console logs={logs} onClear={() => setLogs([])} />
            )}
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />

        <WelcomeDialog />

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
