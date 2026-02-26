import React from "react";
import PaletteItem from "../palette-item";

function Pallette() {
  return (
    <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Palette
      </div>
      <PaletteItem
        type={"prompt"}
        label={"Prompt"}
        meta={{ name: "Prompt", text: "Your prompt here" }}
      />
      <PaletteItem
        type="agent"
        label="Agent"
        meta={{
          name: "Agent",
          model: "gpt-4o-mini",
        }}
      />
      <PaletteItem
        type="tool"
        label="Tool"
        meta={{
          name: "Tool",
          kind: "web-search",
          config: { maxResults: 5 },
        }}
      />
      <PaletteItem
        type="document"
        label="Document"
        meta={{ name: "Document" }}
      />
      <PaletteItem
        type="chunker"
        label="Chunker"
        meta={{ name: "Chunker", strategy: "fixed", chunkSize: 500, overlap: 50 }}
      />
      <PaletteItem
        type="router"
        label="Router"
        meta={{
          name: "Router",
          strategy: "keyword",
          routes: [
            {
              id: crypto.randomUUID(),
              label: "Route A",
              condition: { type: "keyword", keywords: ["example"], matchMode: "any", caseSensitive: false }
            }
          ]
        }}
      />
      <PaletteItem
        type="loop"
        label="Loop"
        meta={{
          name: "Loop",
          maxIterations: 10,
          currentIteration: 0
        }}
      />
      <PaletteItem
        type="memory"
        label="Memory"
        meta={{
          name: "Memory",
          scope: "workflow",
          keys: [],
        }}
      />
      <PaletteItem
        type="human-review"
        label="Human Review"
        meta={{
          name: "Human Review",
          reviewMode: "approve-reject",
          instructions: "",
        }}
      />
      <PaletteItem type="result" label="Result" meta={{ name: "Result" }} />

      <div className="pt-2 text-[11px] text-gray-500">
        Drag items onto the canvas. Connect nodes by dragging from a handle edge
        to another node.
      </div>

      {/* Connection Handle Legend */}
      <div className="pt-3 mt-3 border-t border-gray-200">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
          Connection Handles
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
              style={{ background: '#3b82f6' }}
            />
            <span className="text-gray-600">Output (drag FROM)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
              style={{ background: '#10b981' }}
            />
            <span className="text-gray-600">Input (drag TO)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pallette;
