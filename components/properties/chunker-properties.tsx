import React from "react";
import type { ChunkerData } from "@/types";
import { Input } from "../ui/input";

interface ChunkerPropertiesProps {
  data: ChunkerData;
  onChange: (patch: Partial<ChunkerData>) => void;
}

export function ChunkerProperties({ data, onChange }: ChunkerPropertiesProps) {
  const strategy = data.strategy || 'fixed';
  const chunkSize = data.chunkSize || 500;
  const overlap = data.overlap || 50;

  return (
    <div className="space-y-3">
      {/* Strategy Selection */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Strategy</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              value="fixed"
              checked={strategy === "fixed"}
              onChange={() => onChange({ strategy: "fixed" })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Fixed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              value="semantic"
              checked={strategy === "semantic"}
              onChange={() => onChange({ strategy: "semantic" })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm">Semantic</span>
          </label>
        </div>
        <div className="text-[11px] text-gray-500">
          {strategy === 'fixed'
            ? 'Split text into fixed-size chunks'
            : 'Split text at sentence boundaries'}
        </div>
      </div>

      {/* Chunk Size */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Chunk Size (characters)</label>
        <Input
          type="number"
          min="10"
          max="10000"
          value={chunkSize}
          onChange={(e) => onChange({ chunkSize: parseInt(e.target.value) || 500 })}
        />
        <div className="text-[11px] text-gray-500">
          Maximum number of characters per chunk
        </div>
      </div>

      {/* Overlap */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Overlap (characters)</label>
        <Input
          type="number"
          min="0"
          max={chunkSize}
          value={overlap}
          onChange={(e) => onChange({ overlap: parseInt(e.target.value) || 0 })}
        />
        <div className="text-[11px] text-gray-500">
          Number of characters to overlap between chunks
        </div>
      </div>

      {/* Chunk Count Display */}
      {data.chunks && data.chunks.length > 0 && (
        <div className="border rounded-lg p-3 bg-purple-50 space-y-2">
          <div className="text-xs text-gray-600 font-medium">Processing Result</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Chunks:</span>
              <span className="text-gray-700 font-medium">{data.chunks.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
