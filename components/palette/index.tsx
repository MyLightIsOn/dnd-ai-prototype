import React from "react";
import PaletteItem from "../palette-item";
import '@/lib/node-types/built-in/index';
import { getPaletteItems } from "@/lib/node-types/registry";

function Pallette() {
  const paletteItems = getPaletteItems();
  return (
    <div className="row-span-2 bg-white border rounded-2xl p-3 space-y-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Palette
      </div>
      {paletteItems.map((item) => (
        <PaletteItem
          key={item.type}
          type={item.type}
          label={item.label}
          meta={item.defaultData}
        />
      ))}

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
