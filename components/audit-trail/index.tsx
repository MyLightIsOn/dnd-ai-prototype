"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuditLog, AuditEntry } from "@/lib/execution/audit-log";

interface AuditTrailProps {
  auditLog: AuditLog | null;
}

const TYPE_ICONS: Record<AuditEntry["type"], string> = {
  "human-review": "👤",
  "router-decision": "🔀",
  "memory-write": "🧠",
};

const DECISION_COLORS: Record<NonNullable<AuditEntry["decision"]>, string> = {
  approved: "text-green-400",
  rejected: "text-red-400",
  edited: "text-yellow-400",
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const icon = TYPE_ICONS[entry.type];
  const hasContent = entry.beforeContent !== undefined || entry.afterContent !== undefined;

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800 transition-colors"
        onClick={() => hasContent && setExpanded((e) => !e)}
        disabled={!hasContent}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="text-gray-400 text-xs font-mono shrink-0">{formatTime(entry.timestamp)}</span>
        <span className="text-gray-200 text-xs font-medium truncate flex-1">{entry.nodeName}</span>
        {entry.decision && (
          <span
            className={`text-xs font-semibold uppercase tracking-wide shrink-0 ${DECISION_COLORS[entry.decision]}`}
          >
            {entry.decision}
          </span>
        )}
        {!entry.decision && (
          <span className="text-xs text-gray-500 shrink-0 capitalize">{entry.type.replace("-", " ")}</span>
        )}
        {hasContent && (
          <span className="text-gray-500 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
        )}
      </button>

      {expanded && hasContent && (
        <div className="px-3 pb-3 space-y-2 bg-gray-850 border-t border-gray-700">
          {entry.beforeContent !== undefined && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-2 mb-1">Before</div>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {entry.beforeContent || <span className="text-gray-600 italic">empty</span>}
              </pre>
            </div>
          )}
          {entry.afterContent !== undefined && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">After</div>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {entry.afterContent || <span className="text-gray-600 italic">empty</span>}
              </pre>
            </div>
          )}
          {entry.reviewer && (
            <div className="text-xs text-gray-500">
              Reviewer: <span className="text-gray-300">{entry.reviewer}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditTrail({ auditLog }: AuditTrailProps) {
  const [search, setSearch] = useState("");

  const entries = auditLog ? auditLog.getEntries() : [];

  const filtered = entries
    .slice()
    .reverse()
    .filter((entry) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        entry.nodeName.toLowerCase().includes(q) ||
        entry.type.toLowerCase().includes(q)
      );
    });

  const handleExport = () => {
    if (!auditLog) return;
    const blob = new Blob([auditLog.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl h-40 flex flex-col text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
        <div className="font-medium text-gray-200">
          Audit Trail ({entries.length})
        </div>
        <Button
          onClick={handleExport}
          disabled={entries.length === 0}
          variant="outline"
          size="sm"
          className="text-xs h-6 px-2 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
        >
          Export JSON
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-gray-700 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by node name or type..."
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5">
        {entries.length === 0 ? (
          <div className="text-gray-500 italic text-center mt-4">
            No audit entries yet. Run a workflow with human-review or router nodes.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 italic text-center mt-4">
            No entries match your filter.
          </div>
        ) : (
          filtered.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

export default AuditTrail;
