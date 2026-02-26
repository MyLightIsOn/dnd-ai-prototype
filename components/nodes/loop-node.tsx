import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import { Repeat } from "lucide-react";
import type { LoopData } from "@/types/loop";

export const LoopNode: React.FC<NodeProps> = ({ data }) => {
  const loopData = data as unknown as LoopData;
  const executionState = loopData?.executionState || 'idle';

  const borderColor =
    executionState === 'executing' ? 'border-blue-500 border-2 animate-pulse' :
    executionState === 'completed' ? 'border-green-500 border-2' :
    executionState === 'error' ? 'border-red-500 border-2' :
    'border';

  const currentIter = loopData.currentIteration || 0;
  const maxIter = loopData.maxIterations || 10;
  const iterationDisplay = `${currentIter}/${maxIter}`;

  // Format break condition for display
  let breakConditionText = '';
  if (loopData.breakCondition) {
    if (loopData.breakCondition.type === 'always') {
      breakConditionText = `Max ${maxIter} iterations`;
    } else if (loopData.breakCondition.type === 'keyword') {
      const keywords = loopData.breakCondition.keywords.slice(0, 2).join(', ');
      const suffix = loopData.breakCondition.keywords.length > 2 ? '...' : '';
      breakConditionText = `Until: ${keywords}${suffix}`;
    } else if (loopData.breakCondition.type === 'llm-judge') {
      breakConditionText = `LLM Judge: ${loopData.breakCondition.model.split('/')[1] || loopData.breakCondition.model}`;
    }
  }

  const isExecuting = executionState === 'executing';
  const hasExited = loopData.executedExit;

  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl ${borderColor} shadow-sm min-w-[200px]`}>
      {/* Input handle - single target at top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          left: '50%',
          background: '#10b981',
          width: '12px',
          height: '12px',
          border: '2px solid white'
        }}
      />

      {/* Continue output handle - loops back (left side) */}
      <Handle
        type="source"
        position={Position.Left}
        id="continue"
        style={{
          top: '50%',
          background: hasExited ? '#6b7280' : '#f97316',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: !hasExited && isExecuting ? '0 0 8px rgba(249, 115, 22, 0.5)' : 'none'
        }}
      />

      {/* Exit output handle - proceeds forward (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="exit"
        style={{
          left: '50%',
          background: hasExited ? '#f97316' : '#6b7280',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: hasExited ? '0 0 8px rgba(249, 115, 22, 0.5)' : 'none'
        }}
      />

      <div className="px-3 py-2 rounded-t-2xl text-xs font-medium bg-orange-500 text-white flex items-center gap-2">
        <Repeat className="w-3.5 h-3.5" />
        <span>{loopData.name || 'Loop'}</span>
      </div>

      <div className="p-3 space-y-2">
        {/* Iteration counter */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500">Iterations</div>
          <div className={`text-sm font-mono font-semibold ${
            isExecuting ? 'text-orange-600' : 'text-gray-700'
          }`}>
            {iterationDisplay}
          </div>
        </div>

        {/* Break condition display */}
        {breakConditionText && (
          <div className="text-[11px] text-gray-600 bg-gray-50 px-2 py-1.5 rounded">
            {breakConditionText}
          </div>
        )}

        {/* Exit indicator */}
        {hasExited && (
          <div className="text-[10px] text-orange-600 font-medium flex items-center gap-1">
            <span>✓</span>
            <span>Exited</span>
          </div>
        )}

        {/* Handle labels */}
        <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Continue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
