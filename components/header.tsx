import React from "react";
import Toolbar from "./toolbar";

function Header({
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
  return (
    <div className="col-span-3 flex items-center justify-between">
      <div className="text-xl font-semibold">Multi‑Agent Workflow Editor</div>
      <Toolbar
        onRun={onRun}
        onClear={onClear}
        onExport={onExport}
        onImport={onImport}
        onAddSample={onAddSample}
      />
    </div>
  );
}

export default Header;
