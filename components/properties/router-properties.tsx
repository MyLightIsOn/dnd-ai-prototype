import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { RouterData, Route, KeywordCondition, SentimentCondition } from "@/types/router";
import { Plus, Trash2 } from "lucide-react";

export function RouterProperties({
  data,
  onChange,
}: {
  data: RouterData;
  onChange: (patch: Partial<RouterData>) => void;
}) {
  const addRoute = () => {
    const condition: KeywordCondition | SentimentCondition = data.strategy === 'keyword'
      ? { type: 'keyword', keywords: [], matchMode: 'any', caseSensitive: false }
      : { type: 'sentiment', targetSentiment: 'positive', threshold: 0.5 };

    const newRoute: Route = {
      id: crypto.randomUUID(),
      label: `Route ${(data.routes?.length || 0) + 1}`,
      condition
    };

    onChange({
      routes: [...(data.routes || []), newRoute]
    });
  };

  const removeRoute = (routeId: string) => {
    onChange({
      routes: data.routes?.filter(r => r.id !== routeId) || []
    });
  };

  const updateRoute = (routeId: string, updates: Partial<Route>) => {
    onChange({
      routes: data.routes?.map(r =>
        r.id === routeId ? { ...r, ...updates } : r
      ) || []
    });
  };

  const updateKeywordCondition = (routeId: string, updates: Partial<KeywordCondition>) => {
    const route = data.routes?.find(r => r.id === routeId);
    if (route && route.condition.type === 'keyword') {
      updateRoute(routeId, {
        condition: { ...route.condition, ...updates }
      });
    }
  };

  const updateSentimentCondition = (routeId: string, updates: Partial<SentimentCondition>) => {
    const route = data.routes?.find(r => r.id === routeId);
    if (route && route.condition.type === 'sentiment') {
      updateRoute(routeId, {
        condition: { ...route.condition, ...updates }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Strategy Selector */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Routing Strategy</label>
        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={data.strategy}
          onChange={(e) => {
            const newStrategy = e.target.value as 'keyword' | 'sentiment';
            onChange({
              strategy: newStrategy,
              // Reset routes when changing strategy
              routes: []
            });
          }}
        >
          <option value="keyword">Keyword Matching</option>
          <option value="sentiment">Sentiment Analysis</option>
        </select>
        <div className="text-xs text-gray-500">
          {data.strategy === 'keyword'
            ? 'Route based on keyword presence in input'
            : 'Route based on sentiment classification'}
        </div>
      </div>

      {/* Routes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600 font-medium">Routes</label>
          <Button
            size="sm"
            variant="outline"
            onClick={addRoute}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Route
          </Button>
        </div>

        {data.routes && data.routes.length > 0 ? (
          <div className="space-y-3">
            {data.routes.map((route, index) => (
              <div key={route.id} className="p-3 border rounded-lg space-y-2 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Route label"
                      value={route.label}
                      onChange={(e) => updateRoute(route.id, { label: e.target.value })}
                      className="text-sm font-medium"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRoute(route.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Keyword Condition */}
                {route.condition.type === 'keyword' && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Keywords (comma-separated)</label>
                      <Input
                        placeholder="urgent, priority, critical"
                        value={route.condition.keywords.join(', ')}
                        onChange={(e) => {
                          const keywords = e.target.value
                            .split(',')
                            .map(k => k.trim())
                            .filter(k => k.length > 0);
                          updateKeywordCondition(route.id, { keywords });
                        }}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Match Mode</label>
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={route.condition.matchMode}
                        onChange={(e) =>
                          updateKeywordCondition(route.id, {
                            matchMode: e.target.value as 'any' | 'all'
                          })
                        }
                      >
                        <option value="any">Any (OR)</option>
                        <option value="all">All (AND)</option>
                      </select>
                      <div className="text-xs text-gray-500">
                        {route.condition.matchMode === 'any'
                          ? 'Matches if any keyword is found'
                          : 'Matches only if all keywords are found'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sentiment Condition */}
                {route.condition.type === 'sentiment' && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Target Sentiment</label>
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={route.condition.targetSentiment}
                        onChange={(e) =>
                          updateSentimentCondition(route.id, {
                            targetSentiment: e.target.value as 'positive' | 'negative' | 'neutral'
                          })
                        }
                      >
                        <option value="positive">😊 Positive</option>
                        <option value="negative">😞 Negative</option>
                        <option value="neutral">😐 Neutral</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center py-4 border rounded-lg border-dashed">
            No routes configured. Click "Add Route" to create one.
          </div>
        )}
      </div>

      {/* Default Route */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600 flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!data.defaultRoute}
            onChange={(e) => onChange({ defaultRoute: e.target.checked ? 'default' : undefined })}
            className="rounded"
          />
          Enable default route (fallback)
        </label>
        <div className="text-xs text-gray-500">
          If enabled, execution continues via default output when no routes match
        </div>
      </div>
    </div>
  );
}
