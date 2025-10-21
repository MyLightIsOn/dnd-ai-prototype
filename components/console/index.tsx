import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function formatLog(log: string) {
  if (log.startsWith('🤖')) return <div className="text-blue-600">{log}</div>;
  if (log.startsWith('📄')) return <div className="text-green-600">{log}</div>;
  if (log.startsWith('💰')) return <div className="text-yellow-600">{log}</div>;
  if (log.startsWith('❌')) return <div className="text-red-600">{log}</div>;
  if (log.startsWith('✅')) return <div className="text-green-700">{log}</div>;
  if (log.startsWith('⚠️')) return <div className="text-orange-600">{log}</div>;
  return <div>{log}</div>;
}

function Console({ logs, onClear }: { logs: string[]; onClear: () => void }) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="bg-white border rounded-2xl p-3 h-40 flex flex-col text-xs">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">Run Console</div>
        <Button onClick={onClear} className="text-xs" variant="outline" size="sm">
          Clear
        </Button>
      </div>
      <div
        ref={consoleRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">No output yet. Click Run to simulate.</div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed space-y-1">
            {logs.map((log, index) => (
              <div key={index}>{formatLog(log)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Console;
