import React from "react";
import PaletteItem from "../palette-item";

function Pallette() {
  return (
    <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Palette
      </div>
      <PaletteItem
        type="agent"
        label="Agent"
        meta={{
          name: "Agent",
          model: "gpt-4o-mini",
          prompt: "Your prompt here",
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
      <PaletteItem type="output" label="Output" meta={{ name: "Output" }} />
      <div className="pt-2 text-[11px] text-gray-500">
        Drag items onto the canvas. Connect nodes by dragging from a handle edge
        to another node.
      </div>
    </div>
  );
}

export default Pallette;
