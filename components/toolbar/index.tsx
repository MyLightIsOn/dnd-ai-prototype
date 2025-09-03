import React, { useRef } from "react";
import { Bug, Download, Play, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/button";

function ToolBar({
  onRun,
  onClear,
  onExport,
  onImport,
  onAddSample,
}: {
  onRun: () => void | Promise<void>;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onRun}
        className="bg-indigo-600 text-white flex items-center gap-2"
      >
        <Play size={16} /> Run
      </Button>
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
    </div>
  );
}

export default ToolBar;
