import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { LoopData, AlwaysBreakCondition, KeywordBreakCondition, LLMJudgeBreakCondition } from "@/types/loop";
import { getAllModels } from "@/lib/providers";

interface LoopPropertiesProps {
  data: LoopData;
  onChange: (patch: Partial<LoopData>) => void;
}

export function LoopProperties({ data, onChange }: LoopPropertiesProps) {
  const maxIterations = data.maxIterations || 10;
  const breakConditionType = data.breakCondition?.type || 'always';

  // Get all available models for LLM judge
  const allModels = getAllModels();
  const modelsByProvider = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  // Handle break condition type change
  const handleBreakConditionTypeChange = (type: string) => {
    if (type === 'always') {
      const condition: AlwaysBreakCondition = { type: 'always' };
      onChange({ breakCondition: condition });
    } else if (type === 'keyword') {
      const condition: KeywordBreakCondition = {
        type: 'keyword',
        keywords: [],
        caseSensitive: false
      };
      onChange({ breakCondition: condition });
    } else if (type === 'llm-judge') {
      const condition: LLMJudgeBreakCondition = {
        type: 'llm-judge',
        prompt: '',
        model: 'gpt-4o-mini',
        provider: 'openai'
      };
      onChange({ breakCondition: condition });
    }
  };

  return (
    <div className="space-y-4">
      {/* Max Iterations */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Max Iterations</label>
        <Input
          type="number"
          min="1"
          max="100"
          value={maxIterations}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 1;
            // Clamp value between 1 and 100
            const clampedValue = Math.max(1, Math.min(100, value));
            onChange({ maxIterations: clampedValue });
          }}
          className="text-sm"
        />
        <div className="text-[11px] text-gray-500">
          Maximum number of loop iterations (1-100)
        </div>
      </div>

      {/* Break Condition Type */}
      <div className="grid gap-2">
        <label className="text-xs text-gray-600">Break Condition</label>
        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={breakConditionType}
          onChange={(e) => handleBreakConditionTypeChange(e.target.value)}
        >
          <option value="always">Always (max iterations only)</option>
          <option value="keyword">Keyword Match</option>
          <option value="llm-judge">LLM Judge</option>
        </select>
        <div className="text-[11px] text-gray-500">
          {breakConditionType === 'always' &&
            'Loop exits only when max iterations is reached'}
          {breakConditionType === 'keyword' &&
            'Loop exits early if output contains matching keywords'}
          {breakConditionType === 'llm-judge' &&
            'Loop exits based on LLM evaluation of the output'}
        </div>
      </div>

      {/* Keyword Condition */}
      {data.breakCondition?.type === 'keyword' && (
        <div className="grid gap-2">
          <label className="text-xs text-gray-600">Keywords (comma-separated)</label>
          <Input
            type="text"
            placeholder="e.g., COMPLETE, SUCCESS, DONE"
            value={data.breakCondition.keywords.join(', ')}
            onChange={(e) => {
              if (data.breakCondition && data.breakCondition.type === 'keyword') {
                const keywords = e.target.value
                  .split(',')
                  .map(k => k.trim())
                  .filter(k => k.length > 0);
                const updatedCondition: KeywordBreakCondition = {
                  ...data.breakCondition,
                  keywords
                };
                onChange({ breakCondition: updatedCondition });
              }
            }}
            className="text-sm"
          />
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="caseSensitive"
              checked={data.breakCondition.caseSensitive || false}
              onChange={(e) => {
                if (data.breakCondition && data.breakCondition.type === 'keyword') {
                  const updatedCondition: KeywordBreakCondition = {
                    ...data.breakCondition,
                    caseSensitive: e.target.checked
                  };
                  onChange({ breakCondition: updatedCondition });
                }
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="caseSensitive" className="text-xs text-gray-600 cursor-pointer">
              Case sensitive
            </label>
          </div>
          <div className="text-[11px] text-gray-500">
            Loop will exit if the output contains any of these keywords
          </div>
        </div>
      )}

      {/* LLM Judge Condition */}
      {data.breakCondition?.type === 'llm-judge' && (
        <div className="space-y-3">
          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Evaluation Prompt</label>
            <Textarea
              rows={4}
              placeholder="Analyze the output and respond with YES to continue looping or NO to exit..."
              value={data.breakCondition.prompt}
              onChange={(e) => {
                if (data.breakCondition && data.breakCondition.type === 'llm-judge') {
                  const updatedCondition: LLMJudgeBreakCondition = {
                    ...data.breakCondition,
                    prompt: e.target.value
                  };
                  onChange({ breakCondition: updatedCondition });
                }
              }}
              className="text-sm"
            />
            <div className="text-[11px] text-gray-500">
              The LLM will evaluate the output and decide whether to continue looping
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Model</label>
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={`${data.breakCondition.provider}/${data.breakCondition.model}`}
              onChange={(e) => {
                if (data.breakCondition && data.breakCondition.type === 'llm-judge') {
                  const [provider, model] = e.target.value.split('/');
                  const updatedCondition: LLMJudgeBreakCondition = {
                    ...data.breakCondition,
                    provider,
                    model
                  };
                  onChange({ breakCondition: updatedCondition });
                }
              }}
            >
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <optgroup
                  key={provider}
                  label={provider.charAt(0).toUpperCase() + provider.slice(1)}
                >
                  {models.map((model) => (
                    <option key={model.id} value={`${provider}/${model.id}`}>
                      {model.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="text-[11px] text-gray-500">
              Model used to evaluate the break condition
            </div>
          </div>
        </div>
      )}

      {/* Current Iteration Display */}
      {data.currentIteration > 0 && (
        <div className="border rounded-lg p-3 bg-blue-50 space-y-2">
          <div className="text-xs text-gray-600 font-medium">Loop Status</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Current Iteration:</span>
              <span className="text-gray-700 font-medium">
                {data.currentIteration} / {maxIterations}
              </span>
            </div>
            {data.executedExit && (
              <div className="text-blue-600 font-medium">
                Loop exited early
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
