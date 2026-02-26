"use client";
import { ReactFlowProvider, type Edge } from "@xyflow/react";
import Header from "@/components/header";
import ViewPort from "@/components/viewport";
import Palette from "@/components/palette";
import PropertiesPanel from "@/components/properties";
import Console from "@/components/console";
import { AuditTrail } from "@/components/audit-trail";
import SettingsModal from "@/components/settings";
import { ErrorDialog } from "@/components/error-dialog";
import { HumanReviewModal } from "@/components/human-review-modal";
import { MemoryInspector } from "@/components/memory-inspector";
import { Settings } from "lucide-react";
import React, { useMemo, useState, useRef } from "react";

import { exportJSON } from "@/lib/exportJSON";
import { importJSON } from "@/lib/importJSON";
import { addDocumentSummarizer, addRAGPipeline, addMultiAgentAnalysis } from "@/lib/addSample";
import { runParallel as runLib, type ExecutionStatus } from "@/lib/execution/parallel-runner";
import { MemoryManager } from "@/lib/execution/memory-manager";
import { AuditLog } from "@/lib/execution/audit-log";

import type { AgentData, ToolData, OutputData, TypedNode, PromptData, DocumentData, ChunkerData, NodeData } from "@/types";

export default function App() {
  const [nodes, setNodes] = useState<TypedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [workflowMemory, setWorkflowMemory] = useState<MemoryManager | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  const [bottomTab, setBottomTab] = useState<'console' | 'audit'>('console');
  const executionControlRef = useRef<ExecutionStatus>('idle');
  const [currentError, setCurrentError] = useState<{
    nodeId: string;
    nodeName: string;
    message: string;
  } | null>(null);
  const errorRecoveryActionRef = useRef<'retry' | 'skip' | 'abort' | null>(null);
  const [reviewRequest, setReviewRequest] = useState<{
    reviewerLabel: string;
    nodeName: string;
    instructions?: string;
    content: string;
    mode: 'approve-reject' | 'edit-and-approve';
  } | null>(null);
  const reviewDecisionRef = useRef<{
    decision: 'approved' | 'rejected';
    editedContent?: string;
  } | null>(null);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [nodes, selectedId],
  );

  const updateSelected = (
    patch: Partial<NodeData>,
  ) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? { ...n, data: { ...(n.data as object), ...(patch as object) } }
          : n,
      ),
    );
  };

  const onSelectionChange = ({
    nodes: selectedNodes,
  }: {
    nodes: TypedNode[];
  }) => {
    setSelectedId(selectedNodes?.[0]?.id || null);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setLogs([]);
    setSelectedId(null);
  };

  const addSample = (sampleType: 'summarizer' | 'rag' | 'multi-agent') => {
    switch (sampleType) {
      case 'summarizer':
        addDocumentSummarizer(setNodes, setEdges);
        break;
      case 'rag':
        addRAGPipeline(setNodes, setEdges);
        break;
      case 'multi-agent':
        addMultiAgentAnalysis(setNodes, setEdges);
        break;
    }
  };

  const run = async () => {
    // Set execution status to running
    setExecutionStatus('running');
    executionControlRef.current = 'running';
    errorRecoveryActionRef.current = null;

    const result = await runLib(nodes, edges, setLogs, setNodes, setEdges, executionControlRef, errorRecoveryActionRef, setCurrentError, setReviewRequest, reviewDecisionRef);
    setWorkflowMemory(result.memory);
    setAuditLog(result.auditLog);

    // Reset to idle after completion (unless already cancelled)
    const currentStatus = executionControlRef.current;
    if (currentStatus === 'running' || currentStatus === 'paused') {
      setExecutionStatus('idle');
      executionControlRef.current = 'idle';
    }
  };

  const pause = () => {
    setExecutionStatus('paused');
    executionControlRef.current = 'paused';
  };

  const resume = () => {
    setExecutionStatus('running');
    executionControlRef.current = 'running';
  };

  const cancel = () => {
    setExecutionStatus('cancelled');
    executionControlRef.current = 'cancelled';

    // Reset to idle after a brief moment
    setTimeout(() => {
      setExecutionStatus('idle');
      executionControlRef.current = 'idle';
    }, 100);
  };

  const handleErrorRetry = () => {
    console.log('Error recovery: Retry selected');
    errorRecoveryActionRef.current = 'retry';
    setCurrentError(null);
  };

  const handleErrorSkip = () => {
    console.log('Error recovery: Skip selected');
    errorRecoveryActionRef.current = 'skip';
    setCurrentError(null);
  };

  const handleErrorAbort = () => {
    console.log('Error recovery: Abort selected');
    errorRecoveryActionRef.current = 'abort';
    setCurrentError(null);
    cancel();
  };

  return (
    <div className="p-4 bg-slate-50">
      <ReactFlowProvider>
        <div className="w-full h-[85vh] grid grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-4">
          <Header
            onRun={run}
            onPause={pause}
            onResume={resume}
            onCancel={cancel}
            executionStatus={executionStatus}
            onClear={clearAll}
            onExport={() => {
              exportJSON({ nodes, edges });
            }}
            onImport={(e) => {
              importJSON({ e, setNodes, setEdges }).then((r) =>
                console.log(r),
              );
            }}
            onAddSample={addSample}
            onSettings={() => setSettingsOpen(true)}
          />
          <Palette />

          <div className="row-span-2 bg-white border rounded-2xl overflow-hidden">
            <ViewPort
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              onSelectionChange={onSelectionChange}
            />
          </div>

          <div className="row-span-2 flex flex-col gap-3 min-h-0">
            <div className="bg-white border rounded-2xl p-3 space-y-3 flex-1 min-h-0 overflow-auto">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Properties
                </div>
                <Settings size={16} />
              </div>
              <PropertiesPanel selected={selected} onChange={updateSelected} />
            </div>
            <div className="h-64 shrink-0">
              <MemoryInspector
                workflowMemory={workflowMemory}
                isExecuting={executionStatus === 'running'}
              />
            </div>
          </div>

          <div className="col-span-3 flex flex-col gap-0">
            <div className="flex items-center gap-1 px-1 pb-1">
              <button
                onClick={() => setBottomTab('console')}
                className={`px-3 py-1 rounded-t text-xs font-medium transition-colors ${
                  bottomTab === 'console'
                    ? 'bg-white border border-b-0 border-gray-200 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setBottomTab('audit')}
                className={`px-3 py-1 rounded-t text-xs font-medium transition-colors ${
                  bottomTab === 'audit'
                    ? 'bg-gray-900 border border-b-0 border-gray-700 text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Audit Trail
              </button>
            </div>
            {bottomTab === 'console' ? (
              <Console logs={logs} onClear={() => setLogs([])} />
            ) : (
              <AuditTrail auditLog={auditLog} />
            )}
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />

        <ErrorDialog
          open={currentError !== null}
          onOpenChange={(open) => !open && setCurrentError(null)}
          nodeName={currentError?.nodeName || ''}
          errorMessage={currentError?.message || ''}
          onRetry={handleErrorRetry}
          onSkip={handleErrorSkip}
          onAbort={handleErrorAbort}
        />

        {reviewRequest && (
          <HumanReviewModal
            open={true}
            reviewerLabel={reviewRequest.reviewerLabel}
            nodeName={reviewRequest.nodeName}
            instructions={reviewRequest.instructions}
            content={reviewRequest.content}
            mode={reviewRequest.mode}
            onDecision={(decision, editedContent) => {
              reviewDecisionRef.current = { decision, editedContent };
              setReviewRequest(null);
            }}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}
