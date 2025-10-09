import React from "react";
import { Button } from "@/components/ui/button";

function Console({ logs, onClear }: { logs: string[]; onClear: () => void }) {
  return (
    <div className="bg-white border rounded-2xl p-3 h-40 overflow-auto text-xs">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">Run Console</div>
        <Button onClick={onClear} className="text-xs" variant="outline" size="sm">
          Clear
        </Button>
      </div>
      {logs.length === 0 ? (
        <div className="text-gray-500">No output yet. Click Run to simulate.</div>
      ) : (
        <pre className="whitespace-pre-wrap leading-relaxed">{logs.join("\n")}</pre>
      )}
    </div>
  );
}

export default Console;
