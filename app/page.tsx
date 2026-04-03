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
import { SaveTemplateModal } from "@/components/templates/save-template-modal";
import { Settings } from "lucide-react";
import React, { useState } from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
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
    workflowName,
    run: storeRun,
  } = useWorkflowStore();

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setLogs([]);
  };

  const run = async () => {
    setExecutionStatus('running');
    executionControl.current = 'running';
    errorRecoveryAction.current = null;

    await storeRun();

    const currentStatus = executionControl.current;
    if (currentStatus === 'running' || currentStatus === 'paused') {
      setExecutionStatus('idle');
      executionControl.current = 'idle';
    }
  };

  const runCompareFn = async () => {
    const newControls = compareProviders.map((_, i) =>
      compareControls[i] ?? { current: 'idle' as ExecutionStatus }
    );
    setCompareControls(newControls);
    setExecutionStatus('running');
    compareControls.forEach(ref => { ref.current = 'running'; });
    setCompareLogs(compareProviders.map(() => []));
    try {
      const compareStats = await runCompare(compareProviders, nodes, edges, setCompareLogs, compareControls);
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

  const handleSaveTemplate = async (name: string, description: string) => {
    const body = {
      name,
      description: description || null,
      node_count: nodes.length,
      node_types: nodes.map((n) => n.type as string),
      workflow: { nodes, edges },
    };
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? 'Save failed');
    }
  };

  const handleErrorRetry = () => {
    errorRecoveryAction.current = 'retry';
    setCurrentError(null);
  };

  const handleErrorSkip = () => {
    errorRecoveryAction.current = 'skip';
    setCurrentError(null);
  };

  const handleErrorAbort = () => {
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
            onSaveAsTemplate={() => setSaveTemplateOpen(true)}
          />
          <Palette />
          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort />
          </div>
          <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">Properties</div>
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

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
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
        <SaveTemplateModal
          open={saveTemplateOpen}
          defaultName={workflowName || 'My Workflow'}
          onSave={handleSaveTemplate}
          onClose={() => setSaveTemplateOpen(false)}
        />
      </ReactFlowProvider>
    </div>
  );
}
