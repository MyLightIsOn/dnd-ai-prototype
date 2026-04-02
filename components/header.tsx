'use client';
import React from "react";
import Toolbar from "./toolbar";
import { useWorkflowStore } from "@/lib/store/workflow-store";

function Header({
  onRun,
  onPause,
  onResume,
  onCancel,
  onClear,
  onExport,
  onImport,
  onAddSample,
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => void;
}) {
  const executionStatus = useWorkflowStore(s => s.executionStatus);
  const compareMode = useWorkflowStore(s => s.compareMode);
  const compareProviders = useWorkflowStore(s => s.compareProviders);
  const runStats = useWorkflowStore(s => s.runStats);
  const statsOpen = useWorkflowStore(s => s.statsOpen);
  const setCompareMode = useWorkflowStore(s => s.setCompareMode);
  const setCompareProviders = useWorkflowStore(s => s.setCompareProviders);
  const setCompareLogs = useWorkflowStore(s => s.setCompareLogs);
  const compareControls = useWorkflowStore(s => s.compareControls);
  const setStatsOpen = useWorkflowStore(s => s.setStatsOpen);
  const setSettingsOpen = useWorkflowStore(s => s.setSettingsOpen);

  const handleToggleCompare = () => {
    setCompareMode(!compareMode);
    setCompareLogs(compareProviders.map(() => []));
  };

  const handleChangeCompareProviders = (ps: typeof compareProviders) => {
    setCompareProviders(ps);
    // Sync compareControls to match new provider count
    while (compareControls.length < ps.length) {
      compareControls.push({ current: 'idle' });
    }
    compareControls.splice(ps.length);
    setCompareLogs(ps.map(() => []));
  };

  return (
    <div className="col-span-3 flex items-center justify-between">
      <div className="text-xl font-semibold">Multi‑Agent Workflow Editor</div>
      <Toolbar
        onRun={onRun}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        executionStatus={executionStatus}
        onClear={onClear}
        onExport={onExport}
        onImport={onImport}
        onAddSample={onAddSample}
        onSettings={() => setSettingsOpen(true)}
        compareMode={compareMode}
        onToggleCompare={handleToggleCompare}
        compareProviders={compareProviders}
        onChangeCompareProviders={handleChangeCompareProviders}
        statsAvailable={runStats !== null}
        onStatsToggle={() => setStatsOpen(!statsOpen)}
      />
    </div>
  );
}

export default Header;
