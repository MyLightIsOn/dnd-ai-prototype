'use client';
import React from 'react';

const NODE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  agent:          { bg: 'bg-blue-100',     text: 'text-blue-700' },
  document:       { bg: 'bg-purple-100',   text: 'text-purple-700' },
  chunker:        { bg: 'bg-amber-100',    text: 'text-amber-700' },
  tool:           { bg: 'bg-yellow-100',   text: 'text-yellow-800' },
  router:         { bg: 'bg-orange-100',   text: 'text-orange-700' },
  loop:           { bg: 'bg-cyan-100',     text: 'text-cyan-700' },
  memory:         { bg: 'bg-pink-100',     text: 'text-pink-700' },
  'human-review': { bg: 'bg-rose-100',     text: 'text-rose-700' },
  result:         { bg: 'bg-green-100',    text: 'text-green-700' },
  prompt:         { bg: 'bg-fuchsia-100',  text: 'text-fuchsia-700' },
};

interface TemplateCardProps {
  name: string;
  description: string | null;
  nodeCount: number;
  nodeTypes: string[];   // all types including duplicates, e.g. ['agent','agent','result']
  createdAt?: number;    // shown for user templates only
  showDelete?: boolean;
  onLoad: () => void;
  onDelete?: () => void;
}

function NodeTypeBadge({ type, count }: { type: string; count: number }) {
  const color = NODE_TYPE_COLORS[type] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  const label = count > 1
    ? `${type.charAt(0).toUpperCase() + type.slice(1)} ×${count}`
    : type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
      {label}
    </span>
  );
}

export function TemplateCard({
  name,
  description,
  nodeCount,
  nodeTypes,
  createdAt,
  showDelete = false,
  onLoad,
  onDelete,
}: TemplateCardProps) {
  const typeCounts = nodeTypes.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const uniqueTypes = [...new Set(nodeTypes)];

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div>
        <div className="text-sm font-semibold text-gray-900 leading-snug">{name}</div>
        {description && (
          <div className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {uniqueTypes.map((type) => (
          <NodeTypeBadge key={type} type={type} count={typeCounts[type]} />
        ))}
      </div>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-gray-400">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          {formattedDate ? ` · ${formattedDate}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {showDelete && onDelete && (
            <button
              onClick={onDelete}
              className="text-xs font-medium text-red-500 hover:text-red-700 border border-gray-200 rounded-lg px-2.5 py-1 hover:border-red-200 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onLoad}
            className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1 transition-colors"
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
