import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Position, Handle } from "@xyflow/react";
import type { RouterData } from "@/types/router";

export const RouterNode: React.FC<NodeProps> = ({ data }) => {
  const routerData = data as unknown as RouterData;
  const executionState = routerData?.executionState || 'idle';

  const borderColor =
    executionState === 'executing' ? 'border-blue-500 border-2 animate-pulse' :
    executionState === 'completed' ? 'border-green-500 border-2' :
    executionState === 'error' ? 'border-red-500 border-2' :
    'border';

  const strategyDisplay = routerData.strategy === 'keyword' ? '🔍 Keyword' : '😊 Sentiment';
  const routeCount = routerData.routes?.length || 0;

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

      {/* Output handles - one per route on the right side */}
      {routerData.routes && routerData.routes.map((route, index) => {
        const totalRoutes = routerData.routes!.length;
        const topPercent = ((index + 1) * 100) / (totalRoutes + 1);
        const isExecutedRoute = routerData.executedRoute === route.id;

        return (
          <Handle
            key={route.id}
            type="source"
            position={Position.Right}
            id={route.id}
            style={{
              top: `${topPercent}%`,
              background: isExecutedRoute ? '#f59e0b' : '#3b82f6',
              width: '12px',
              height: '12px',
              border: '2px solid white',
              boxShadow: isExecutedRoute ? '0 0 8px rgba(245, 158, 11, 0.5)' : 'none'
            }}
          />
        );
      })}

      {/* Default route handle at bottom */}
      {routerData.defaultRoute && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          style={{
            left: '50%',
            background: '#6b7280',
            width: '10px',
            height: '10px',
            border: '2px solid white'
          }}
        />
      )}

      <div className="px-3 py-2 rounded-t-2xl text-xs font-medium bg-purple-500 text-white">
        {routerData.name || 'Router'}
      </div>

      <div className="p-3 space-y-2">
        <div className="text-[11px] text-gray-500">
          {strategyDisplay} · {routeCount} route{routeCount !== 1 ? 's' : ''}
        </div>

        {/* Show routes */}
        {routerData.routes && routerData.routes.length > 0 && (
          <div className="text-xs space-y-1">
            {routerData.routes.map((route) => {
              const isExecuted = routerData.executedRoute === route.id;
              return (
                <div
                  key={route.id}
                  className={`px-2 py-1 rounded text-xs ${
                    isExecuted
                      ? 'bg-amber-100 text-amber-900 font-medium'
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {isExecuted && '→ '}{route.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Show executed route indicator */}
        {routerData.executedRoute && (
          <div className="text-[10px] text-amber-600 font-medium mt-2">
            ✓ Routed
          </div>
        )}
      </div>
    </div>
  );
};
