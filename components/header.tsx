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
  onSaveAsTemplate,
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onSaveAsTemplate: () => void;
}) {
  const executionStatus = useWorkflowStore(s => s.executionStatus);
  const compareMode = useWorkflowStore(s => s.compareMode);
  const compareProviders = useWorkflowStore(s => s.compareProviders);
  const runStats = useWorkflowStore(s => s.runStats);
  const statsOpen = useWorkflowStore(s => s.statsOpen);
  const nodes = useWorkflowStore(s => s.nodes);
  const workflowName = useWorkflowStore(s => s.workflowName);
  const setWorkflowName = useWorkflowStore(s => s.setWorkflowName);
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
    while (compareControls.length < ps.length) compareControls.push({ current: 'idle' });
    compareControls.splice(ps.length);
    setCompareLogs(ps.map(() => []));
  };

  return (
    <div className="col-span-3 flex items-center justify-between">
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 min-w-0 max-w-[280px] truncate"
        aria-label="Workflow name"
      />
      <Toolbar
        onRun={onRun}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        executionStatus={executionStatus}
        onClear={onClear}
        onExport={onExport}
        onImport={onImport}
        onSaveAsTemplate={onSaveAsTemplate}
        canSaveAsTemplate={nodes.length > 0}
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
