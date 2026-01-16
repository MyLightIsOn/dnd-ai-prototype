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
          kind: "http",
          config: { endpoint: "https://api.example.com" },
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
      <PaletteItem type="result" label="Result" meta={{ name: "Result" }} />
      <div className="pt-2 text-[11px] text-gray-500">
        Drag items onto the canvas. Connect nodes by dragging from a handle edge
        to another node.
      </div>
    </div>
  );
}

export default Pallette;
