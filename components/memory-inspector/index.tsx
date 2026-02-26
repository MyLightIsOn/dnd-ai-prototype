"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MemoryManager, MemoryChange } from "@/lib/execution/memory-manager";

interface MemoryInspectorProps {
  workflowMemory: MemoryManager | null;
  isExecuting: boolean;
}

type ViewMode = "values" | "history";

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 80 ? value.slice(0, 80) + "…" : value;
  }
  const json = JSON.stringify(value);
  return json.length > 80 ? json.slice(0, 80) + "…" : json;
}

function getType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export default function MemoryInspector({
  workflowMemory,
  isExecuting,
}: MemoryInspectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("values");
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<MemoryChange[]>([]);
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(
    new Set()
  );
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const highlightKey = useCallback((key: string) => {
    setRecentlyChanged((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // Clear any existing timer for this key
    const existing = highlightTimers.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setRecentlyChanged((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      highlightTimers.current.delete(key);
    }, 2000);

    highlightTimers.current.set(key, timer);
  }, []);

  const refreshData = useCallback(() => {
    if (!workflowMemory) {
      setValues({});
      setHistory([]);
      return;
    }
    const newValues = workflowMemory.getAll();
    setValues((prev) => {
      // Detect changed keys
      const allKeys = new Set([
        ...Object.keys(prev),
        ...Object.keys(newValues),
      ]);
      for (const key of allKeys) {
        const prevVal = JSON.stringify(prev[key]);
        const newVal = JSON.stringify(newValues[key]);
        if (prevVal !== newVal) {
          highlightKey(key);
        }
      }
      return newValues;
    });
    setHistory(workflowMemory.getHistory());
  }, [workflowMemory, highlightKey]);

  // Subscribe to changes via onChange listener when not executing (passive updates)
  useEffect(() => {
    if (!workflowMemory) {
      setValues({});
      setHistory([]);
      return;
    }

    // Initial load
    setValues(workflowMemory.getAll());
    setHistory(workflowMemory.getHistory());

    const unsubscribe = workflowMemory.onChange((change) => {
      highlightKey(change.key);
      setValues(workflowMemory.getAll());
      setHistory(workflowMemory.getHistory());
    });

    return () => {
      unsubscribe();
    };
  }, [workflowMemory, highlightKey]);

  // Polling when executing for extra safety
  useEffect(() => {
    if (!isExecuting || !workflowMemory) return;

    const interval = setInterval(() => {
      refreshData();
    }, 150);

    return () => clearInterval(interval);
  }, [isExecuting, workflowMemory, refreshData]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const timer of highlightTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleClear = () => {
    workflowMemory?.clear();
    setValues({});
    setHistory([]);
    setRecentlyChanged(new Set());
  };

  const filteredKeys = Object.keys(values).filter((key) =>
    search === "" ? true : key.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history
    .slice()
    .reverse()
    .filter((entry) =>
      search === ""
        ? true
        : entry.key.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl flex flex-col text-xs text-gray-200 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
        <span className="font-semibold text-gray-100">🧠 Memory</span>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md overflow-hidden border border-gray-600">
            <button
              className={`px-2.5 py-1 text-xs transition-colors ${
                viewMode === "values"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              onClick={() => setViewMode("values")}
            >
              Values
            </button>
            <button
              className={`px-2.5 py-1 text-xs transition-colors border-l border-gray-600 ${
                viewMode === "history"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              onClick={() => setViewMode("history")}
            >
              History
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs h-6 px-2 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-gray-700 shrink-0">
        <input
          type="text"
          placeholder="Filter keys…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-gray-400"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "values" ? (
          filteredKeys.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              {Object.keys(values).length === 0
                ? "No memory values set yet."
                : "No keys match your filter."}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-left">
                  <th className="px-3 py-1.5 font-medium w-1/3">Key</th>
                  <th className="px-3 py-1.5 font-medium w-1/6">Type</th>
                  <th className="px-3 py-1.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((key) => {
                  const value = values[key];
                  const highlighted = recentlyChanged.has(key);
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-800 transition-colors duration-300 ${
                        highlighted ? "bg-yellow-900/40" : "hover:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono text-blue-400 break-all">
                        {key}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        {getType(value)}
                      </td>
                      <td className="px-3 py-1.5 text-gray-300 break-all">
                        {formatValue(value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : filteredHistory.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">
            {history.length === 0
              ? "No history recorded yet."
              : "No history entries match your filter."}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredHistory.map((entry, index) => (
              <div key={index} className="px-3 py-2 hover:bg-gray-800/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-mono text-blue-400">{entry.key}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      entry.operation === "set"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {entry.operation}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs">
                  {entry.operation === "set" && (
                    <>
                      {entry.oldValue !== undefined && (
                        <span className="text-red-400">
                          <span className="text-gray-500">old: </span>
                          {formatValue(entry.oldValue)}
                        </span>
                      )}
                      <span className="text-green-400">
                        <span className="text-gray-500">new: </span>
                        {formatValue(entry.newValue)}
                      </span>
                    </>
                  )}
                  {entry.operation === "delete" && (
                    <span className="text-red-400">
                      <span className="text-gray-500">was: </span>
                      {formatValue(entry.oldValue)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
