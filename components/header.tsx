import React from "react";
import Toolbar from "./toolbar";
import type { ExecutionStatus } from "@/lib/execution/parallel-runner";
import type { CompareProvider } from '@/lib/execution/compare-runner'

function Header({
  onRun,
  onPause,
  onResume,
  onCancel,
  executionStatus,
  onClear,
  onExport,
  onImport,
  onAddSample,
  onSettings,
  compareMode,
  onToggleCompare,
  compareProviders,
  onChangeCompareProviders,
  statsAvailable,
  onStatsToggle,
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  executionStatus: ExecutionStatus;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => void;
  onSettings: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  compareProviders: CompareProvider[];
  onChangeCompareProviders: (providers: CompareProvider[]) => void;
  statsAvailable: boolean;
  onStatsToggle: () => void;
}) {
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
        onSettings={onSettings}
        compareMode={compareMode}
        onToggleCompare={onToggleCompare}
        compareProviders={compareProviders}
        onChangeCompareProviders={onChangeCompareProviders}
        statsAvailable={statsAvailable}
        onStatsToggle={onStatsToggle}
      />
    </div>
  );
}

export default Header;
