import React from "react";
import Toolbar from "./toolbar";
import type { ExecutionStatus } from "@/lib/run";

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
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  executionStatus: ExecutionStatus;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: (sampleType: 'summarizer' | 'rag' | 'multi-agent') => void;
  onSettings: () => void;
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
      />
    </div>
  );
}

export default Header;
