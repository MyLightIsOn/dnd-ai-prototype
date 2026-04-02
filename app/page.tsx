"use client";
import { ReactFlowProvider } from "@xyflow/react";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import SettingsModal from "@/components/settings";
import { ErrorDialog } from "@/components/error-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Settings } from "lucide-react";
import React from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
import { addDocumentSummarizer, addRAGPipeline, addMultiAgentAnalysis, addKeywordRouter, addLLMJudgeRouter, addRefineLoop, addWebSearchSample, addCodeGenSample, addApiFetchSample, addDbReportSample, addResearchCodeSample } from "@/lib/addSample";
import { runParallel as runLib } from "@/lib/execution/parallel-runner";
import type { ExecutionStatus } from "@/lib/execution/parallel-runner";
import { runCompare } from '@/lib/execution/compare-runner';
import { CompareConsole } from '@/components/compare-console';
import { ObservabilityPanel } from '@/components/observability-panel';
import { useWorkflowStore } from "@/lib/store/workflow-store";

export default function App() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    executionControl,
    errorRecoveryAction,
    compareControls,
    setCompareControls,
    setExecutionStatus,
    setLogs,
    setCurrentError,
    setRunStats,
    setStatsOpen,
    setCompareLogs,
    compareMode,
    compareProviders,
    compareLogs,
    runStats,
    statsOpen,
    settingsOpen,
    setSettingsOpen,
    currentError,
  } = useWorkflowStore();

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setLogs([]);
  };

  const addSample = (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => {
    switch (sampleType) {
      case 'summarizer': addDocumentSummarizer(setNodes, setEdges); break;
      case 'rag': addRAGPipeline(setNodes, setEdges); break;
      case 'multi-agent': addMultiAgentAnalysis(setNodes, setEdges); break;
      case 'keyword-router': addKeywordRouter(setNodes, setEdges); break;
      case 'llm-judge-router': addLLMJudgeRouter(setNodes, setEdges); break;
      case 'refine-loop': addRefineLoop(setNodes, setEdges); break;
      case 'web-search': addWebSearchSample(setNodes, setEdges); break;
      case 'code-gen': addCodeGenSample(setNodes, setEdges); break;
      case 'api-fetch': addApiFetchSample(setNodes, setEdges); break;
      case 'db-report': addDbReportSample(setNodes, setEdges); break;
      case 'research-code': addResearchCodeSample(setNodes, setEdges); break;
    }
  };

  const run = async () => {
    setExecutionStatus('running');
    executionControl.current = 'running';
    errorRecoveryAction.current = null;

    const { memory: _memory, auditLog: _auditLog, stats } = await runLib(nodes, edges, setLogs, setNodes, setEdges, executionControl, errorRecoveryAction, setCurrentError);
    setRunStats([stats]);

    const currentStatus = executionControl.current;
    if (currentStatus === 'running' || currentStatus === 'paused') {
      setExecutionStatus('idle');
      executionControl.current = 'idle';
    }
  };

  const runCompareFn = async () => {
    // Ensure we have one control ref per provider (immutable update)
    const newControls = compareProviders.map((_, i) =>
      compareControls[i] ?? { current: 'idle' as ExecutionStatus }
    );
    setCompareControls(newControls);

    setExecutionStatus('running');
    compareControls.forEach(ref => { ref.current = 'running'; });
    setCompareLogs(compareProviders.map(() => []));

    try {
      const compareStats = await runCompare(
        compareProviders,
        nodes,
        edges,
        setCompareLogs,
        compareControls,
      );
      setRunStats(compareStats);
    } finally {
      setExecutionStatus('idle');
      compareControls.forEach(ref => { ref.current = 'idle'; });
    }
  };

  const pause = () => {
    executionControl.current = 'paused';
    compareControls.forEach(ref => { ref.current = 'paused'; });
    setExecutionStatus('paused');
  };

  const resume = () => {
    setExecutionStatus('running');
    executionControl.current = 'running';
    compareControls.forEach(ref => { ref.current = 'running'; });
  };

  const cancel = () => {
    executionControl.current = 'cancelled';
    compareControls.forEach(ref => { ref.current = 'cancelled'; });
    setExecutionStatus('cancelled');
    setRunStats(null);
    setStatsOpen(false);

    setTimeout(() => {
      setExecutionStatus('idle');
      executionControl.current = 'idle';
    }, 100);
  };

  const handleErrorRetry = () => {
    console.log('Error recovery: Retry selected');
    errorRecoveryAction.current = 'retry';
    setCurrentError(null);
  };

  const handleErrorSkip = () => {
    console.log('Error recovery: Skip selected');
    errorRecoveryAction.current = 'skip';
    setCurrentError(null);
  };

  const handleErrorAbort = () => {
    console.log('Error recovery: Abort selected');
    errorRecoveryAction.current = 'abort';
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
            onClear={clearAll}
            onExport={() => exportJSON({ nodes, edges })}
            onImport={(e) => importJSON({ e, setNodes, setEdges }).then((r) => console.log(r))}
            onAddSample={addSample}
          />
          <Palette />

          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort />
          </div>

          <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Properties
              </div>
              <Settings size={16} />
            </div>
            <PropertiesPanel />
          </div>

          <div className="col-span-3 flex flex-col">
            <ObservabilityPanel
              stats={runStats ?? []}
              isOpen={statsOpen && runStats !== null}
              onClose={() => setStatsOpen(false)}
            />
            {compareMode ? (
              <CompareConsole
                providers={compareProviders}
                logs={compareLogs}
                onClear={() => setCompareLogs(compareProviders.map(() => []))}
              />
            ) : (
              <Console />
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
