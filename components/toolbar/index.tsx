import React, { useRef } from "react";
import { BookTemplate, Download, Play, Pause, SkipForward, X, Settings, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/button";
import type { ExecutionStatus } from "@/lib/execution/parallel-runner";
import type { CompareProvider } from '@/lib/execution/compare-runner';
import { CompareControls } from './compare-controls';

function ToolBar({
  onRun,
  onPause,
  onResume,
  onCancel,
  executionStatus,
  onClear,
  onExport,
  onImport,
  onSaveAsTemplate,
  canSaveAsTemplate,
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
  onSaveAsTemplate: () => void;
  canSaveAsTemplate: boolean;
  onSettings: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  compareProviders: CompareProvider[];
  onChangeCompareProviders: (providers: CompareProvider[]) => void;
  statsAvailable: boolean;
  onStatsToggle: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isRunning = executionStatus === 'running';
  const isPaused = executionStatus === 'paused';
  const isIdle = executionStatus === 'idle' || executionStatus === 'cancelled';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        {isIdle && (
          <Button onClick={onRun} className="bg-indigo-600 text-white flex items-center gap-2">
            <Play size={16} /> Run
          </Button>
        )}
        {isRunning && (
          <Button onClick={onPause} className="bg-yellow-600 text-white flex items-center gap-2">
            <Pause size={16} /> Pause
          </Button>
        )}
        {isPaused && (
          <Button onClick={onResume} className="bg-green-600 text-white flex items-center gap-2">
            <SkipForward size={16} /> Resume
          </Button>
        )}
        {(isRunning || isPaused) && (
          <Button onClick={onCancel} className="bg-red-600 text-white flex items-center gap-2">
            <X size={16} /> Cancel
          </Button>
        )}
        <Button onClick={onClear} className="flex items-center gap-2">
          <Trash2 size={16} /> Clear
        </Button>
        <Button onClick={onExport} className="flex items-center gap-2">
          <Download size={16} /> Export JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        <Button onClick={() => fileRef.current?.click()} className="flex items-center gap-2">
          <Upload size={16} /> Import JSON
        </Button>
        <Button
          onClick={onSaveAsTemplate}
          disabled={!canSaveAsTemplate}
          className="flex items-center gap-2"
          title={canSaveAsTemplate ? 'Save current workflow as a template' : 'Add nodes to the canvas first'}
        >
          <BookTemplate size={16} /> Save as Template
        </Button>
        <Button onClick={onSettings} className="flex items-center gap-2" variant="outline">
          <Settings size={16} /> Settings
        </Button>
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCompare}
          className="text-xs"
        >
          Compare
        </Button>
        <Button
          disabled={!statsAvailable}
          onClick={onStatsToggle}
          variant="outline"
          size="sm"
          className="text-xs"
          title="Run stats"
        >
          Stats
        </Button>
      </div>
      {compareMode && (
        <div className="px-2 pb-2 border-t border-white/5 pt-2">
          <CompareControls providers={compareProviders} onChange={onChangeCompareProviders} />
        </div>
      )}
    </div>
  );
}

export default ToolBar;
