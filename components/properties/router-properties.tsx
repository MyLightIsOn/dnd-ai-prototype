import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import type { RouterData, Route, KeywordCondition, SentimentCondition, LLMJudgeCondition, JSONFieldCondition } from "@/types/router";
import { Plus, Trash2 } from "lucide-react";
import { getAllModels } from "@/lib/providers";

export function RouterProperties({
  data,
  onChange,
}: {
  data: RouterData;
  onChange: (patch: Partial<RouterData>) => void;
}) {
  const models = getAllModels();

  const addRoute = () => {
    let condition: KeywordCondition | SentimentCondition | LLMJudgeCondition | JSONFieldCondition;

    if (data.strategy === 'keyword') {
      condition = { type: 'keyword', keywords: [], matchMode: 'any', caseSensitive: false };
    } else if (data.strategy === 'sentiment') {
      condition = { type: 'sentiment', targetSentiment: 'positive', threshold: 0.5 };
    } else if (data.strategy === 'llm-judge') {
      condition = { type: 'llm-judge', judgePrompt: '' };
    } else {
      condition = { type: 'json-field', field: '', operator: 'equals', value: '' };
    }

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

  const updateLLMJudgeCondition = (routeId: string, updates: Partial<LLMJudgeCondition>) => {
    const route = data.routes?.find(r => r.id === routeId);
    if (route && route.condition.type === 'llm-judge') {
      updateRoute(routeId, {
        condition: { ...route.condition, ...updates }
      });
    }
  };

  const updateJSONFieldCondition = (routeId: string, updates: Partial<JSONFieldCondition>) => {
    const route = data.routes?.find(r => r.id === routeId);
    if (route && route.condition.type === 'json-field') {
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
            const newStrategy = e.target.value as 'keyword' | 'sentiment' | 'llm-judge' | 'json-field';
            onChange({
              strategy: newStrategy,
              // Reset routes when changing strategy
              routes: []
            });
          }}
        >
          <option value="keyword">Keyword Matching</option>
          <option value="sentiment">Sentiment Analysis</option>
          <option value="llm-judge">LLM Judge</option>
          <option value="json-field">JSON Field</option>
        </select>
        <div className="text-xs text-gray-500">
          {data.strategy === 'keyword'
            ? 'Route based on keyword presence in input'
            : data.strategy === 'sentiment'
            ? 'Route based on sentiment classification'
            : data.strategy === 'llm-judge'
            ? 'Route based on LLM classification (requires API key)'
            : 'Route based on JSON field value comparison'}
        </div>
      </div>

      {/* LLM Judge Model Selector */}
      {data.strategy === 'llm-judge' && (
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Judge Model</label>
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={data.judgeModel || ''}
            onChange={(e) => onChange({ judgeModel: e.target.value })}
          >
            <option value="">Select a model...</option>
            {models.map((model) => (
              <option key={model.id} value={`${model.provider}/${model.id}`}>
                {model.displayName}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            The LLM model used to classify inputs for all routes
          </div>
        </div>
      )}

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

                {/* LLM Judge Condition */}
                {route.condition.type === 'llm-judge' && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Judge Prompt</label>
                      <Textarea
                        placeholder={`Classify if this input is about "${route.label}". Respond with "${route.label}" if it matches, or "none" if it doesn't.`}
                        value={route.condition.judgePrompt}
                        onChange={(e) =>
                          updateLLMJudgeCondition(route.id, {
                            judgePrompt: e.target.value
                          })
                        }
                        className="text-sm min-h-[80px]"
                      />
                      <div className="text-xs text-gray-500">
                        Instructions for the LLM judge. The LLM will be asked to respond with "{route.label}" if the input matches this route.
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON Field Condition */}
                {route.condition.type === 'json-field' && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Field Path</label>
                      <Input
                        placeholder="status (or nested: user.name)"
                        value={route.condition.field}
                        onChange={(e) =>
                          updateJSONFieldCondition(route.id, {
                            field: e.target.value
                          })
                        }
                        className="text-sm"
                      />
                      <div className="text-xs text-gray-500">
                        JSON field to extract. Use dot notation for nested fields (e.g., "user.name")
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Operator</label>
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={route.condition.operator}
                        onChange={(e) =>
                          updateJSONFieldCondition(route.id, {
                            operator: e.target.value as 'equals' | 'contains' | 'gt' | 'lt'
                          })
                        }
                      >
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="gt">Greater Than (&gt;)</option>
                        <option value="lt">Less Than (&lt;)</option>
                      </select>
                      <div className="text-xs text-gray-500">
                        {route.condition.operator === 'equals'
                          ? 'Exact match (case-insensitive)'
                          : route.condition.operator === 'contains'
                          ? 'Substring match (case-insensitive)'
                          : route.condition.operator === 'gt'
                          ? 'Numeric comparison (field > value)'
                          : 'Numeric comparison (field < value)'}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600">Value</label>
                      <Input
                        placeholder={route.condition.operator === 'gt' || route.condition.operator === 'lt' ? '10' : 'urgent'}
                        value={route.condition.value}
                        onChange={(e) =>
                          updateJSONFieldCondition(route.id, {
                            value: e.target.value
                          })
                        }
                        className="text-sm"
                      />
                      <div className="text-xs text-gray-500">
                        Value to compare against
                      </div>
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
