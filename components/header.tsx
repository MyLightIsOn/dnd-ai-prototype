import React from "react";
import Toolbar from "./toolbar";

const run = () => {};
const clearAll = () => {};
const exportJSON = () => {};
const importJSON = () => {};
const addSample = () => {};

function Header() {
  return (
    <div className="col-span-3 flex items-center justify-between">
      <div className="text-xl font-semibold">Multi‑Agent Workflow Editor</div>
      <Toolbar
        onRun={run}
        onClear={clearAll}
        onExport={exportJSON}
        onImport={importJSON}
        onAddSample={addSample}
      />
    </div>
  );
}

export default Header;
