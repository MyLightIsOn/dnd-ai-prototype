import React, { useRef } from "react";
import { Bug, Download, Play, Pause, SkipForward, X, Settings, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/button";
import type { ExecutionStatus } from "@/lib/run";

function ToolBar({
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
  onAddSample: () => void;
  onSettings: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isRunning = executionStatus === 'running';
  const isPaused = executionStatus === 'paused';
  const isIdle = executionStatus === 'idle' || executionStatus === 'cancelled';

  return (
    <div className="flex items-center gap-2">
      {/* Run button - only show when idle */}
      {isIdle && (
        <Button
          onClick={onRun}
          className="bg-indigo-600 text-white flex items-center gap-2"
        >
          <Play size={16} /> Run
        </Button>
      )}

      {/* Pause button - only show when running */}
      {isRunning && (
        <Button
          onClick={onPause}
          className="bg-yellow-600 text-white flex items-center gap-2"
        >
          <Pause size={16} /> Pause
        </Button>
      )}

      {/* Resume button - only show when paused */}
      {isPaused && (
        <Button
          onClick={onResume}
          className="bg-green-600 text-white flex items-center gap-2"
        >
          <SkipForward size={16} /> Resume
        </Button>
      )}

      {/* Cancel button - show when running or paused */}
      {(isRunning || isPaused) && (
        <Button
          onClick={onCancel}
          className="bg-red-600 text-white flex items-center gap-2"
        >
          <X size={16} /> Cancel
        </Button>
      )}

      <Button onClick={onAddSample} className="flex items-center gap-2">
        <Bug size={16} /> Sample
      </Button>
      <Button onClick={onClear} className="flex items-center gap-2">
        <Trash2 size={16} /> Clear
      </Button>
      <Button onClick={onExport} className="flex items-center gap-2">
        <Download size={16} /> Export JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImport}
      />
      <Button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2"
      >
        <Upload size={16} /> Import JSON
      </Button>
      <Button
        onClick={onSettings}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Settings size={16} /> Settings
      </Button>
    </div>
  );
}

export default ToolBar;
