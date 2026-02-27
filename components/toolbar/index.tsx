import React, { useRef, useState, useEffect } from "react";
import { Bug, Download, Play, Pause, SkipForward, X, Settings, Trash2, Upload, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import type { ExecutionStatus } from "@/lib/execution/parallel-runner";

function ToolBar({
  onRun,
  onPause,
  onResume,
  onCancel,
  executionStatus,
  onClear,
  onExport,
  onImport,
  onAddSample,
  onSettings,
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  executionStatus: ExecutionStatus;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => void;
  onSettings: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const sampleMenuRef = useRef<HTMLDivElement | null>(null);
  const isRunning = executionStatus === 'running';
  const isPaused = executionStatus === 'paused';
  const isIdle = executionStatus === 'idle' || executionStatus === 'cancelled';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(event.target as Node)) {
        setShowSampleMenu(false);
      }
    };

    if (showSampleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSampleMenu]);

  return (
    <div className="flex items-center gap-2">
      {/* Run button - only show when idle */}
      {isIdle && (
        <Button
          onClick={onRun}
          className="bg-indigo-600 text-white flex items-center gap-2"
        >
          <Play size={16} /> Run
        </Button>
      )}

      {/* Pause button - only show when running */}
      {isRunning && (
        <Button
          onClick={onPause}
          className="bg-yellow-600 text-white flex items-center gap-2"
        >
          <Pause size={16} /> Pause
        </Button>
      )}

      {/* Resume button - only show when paused */}
      {isPaused && (
        <Button
          onClick={onResume}
          className="bg-green-600 text-white flex items-center gap-2"
        >
          <SkipForward size={16} /> Resume
        </Button>
      )}

      {/* Cancel button - show when running or paused */}
      {(isRunning || isPaused) && (
        <Button
          onClick={onCancel}
          className="bg-red-600 text-white flex items-center gap-2"
        >
          <X size={16} /> Cancel
        </Button>
      )}

      {/* Sample dropdown menu */}
      <div className="relative" ref={sampleMenuRef}>
        <Button
          onClick={() => setShowSampleMenu(!showSampleMenu)}
          className="flex items-center gap-2"
        >
          <Bug size={16} /> Samples <ChevronDown size={14} />
        </Button>
        {showSampleMenu && (
          <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-50 min-w-[220px]">
            <button
              onClick={() => {
                onAddSample('summarizer');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm first:rounded-t-lg"
            >
              <div className="font-medium">Document Summarizer</div>
              <div className="text-xs text-gray-500">PDF → Agent → Result</div>
            </button>
            <button
              onClick={() => {
                onAddSample('rag');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">RAG Pipeline</div>
              <div className="text-xs text-gray-500">Doc → Chunker → Agent</div>
            </button>
            <button
              onClick={() => {
                onAddSample('multi-agent');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">Multi-Agent Analysis</div>
              <div className="text-xs text-gray-500">Parallel agents + synthesis</div>
            </button>
            <button
              onClick={() => {
                onAddSample('keyword-router');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">Keyword Router</div>
              <div className="text-xs text-gray-500">Route by keywords → branching agents</div>
            </button>
            <button
              onClick={() => {
                onAddSample('llm-judge-router');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">LLM Judge Router</div>
              <div className="text-xs text-gray-500">AI-evaluated conditional routing</div>
            </button>
            <button
              onClick={() => {
                onAddSample('refine-loop');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">Refine Loop</div>
              <div className="text-xs text-gray-500">Iterative refinement with break condition</div>
            </button>
            <button
              onClick={() => {
                onAddSample('web-search');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">Web Search Pipeline</div>
              <div className="text-xs text-gray-500">Search → Summarize → Report</div>
            </button>
            <button
              onClick={() => {
                onAddSample('code-gen');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">Code Gen + Execute</div>
              <div className="text-xs text-gray-500">Generate JS → Run it</div>
            </button>
            <button
              onClick={() => {
                onAddSample('api-fetch');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">API Fetch + Analyze</div>
              <div className="text-xs text-gray-500">HTTP → Agent analysis</div>
            </button>
            <button
              onClick={() => {
                onAddSample('db-report');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
            >
              <div className="font-medium">DB Query + Report</div>
              <div className="text-xs text-gray-500">Database → Agent report</div>
            </button>
            <button
              onClick={() => {
                onAddSample('research-code');
                setShowSampleMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t last:rounded-b-lg"
            >
              <div className="font-medium">Research &amp; Code Pipeline</div>
              <div className="text-xs text-gray-500">Search → Write JS → Run it</div>
            </button>
          </div>
        )}
      </div>
      <Button onClick={onClear} className="flex items-center gap-2">
        <Trash2 size={16} /> Clear
      </Button>
      <Button onClick={onExport} className="flex items-center gap-2">
        <Download size={16} /> Export JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImport}
      />
      <Button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2"
      >
        <Upload size={16} /> Import JSON
      </Button>
      <Button
        onClick={onSettings}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Settings size={16} /> Settings
      </Button>
    </div>
  );
}

export default ToolBar;
