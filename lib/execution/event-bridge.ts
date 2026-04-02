import type React from 'react';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';
import { ExecutionEventEmitter } from './events';
import type { ExecutionEvent } from './events';

export function createReactBridge(
  setLogs: React.Dispatch<React.SetStateAction<string[]>>,
  setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setCurrentError: ((error: { nodeId: string; nodeName: string; message: string } | null) => void) | undefined,
  setReviewRequest: ((req: unknown) => void) | undefined,
  emitter: ExecutionEventEmitter
): () => void {
  const unsubs: Array<() => void> = [];

  // log:append — add new log entry
  unsubs.push(emitter.on('log:append', (e) => {
    if (e.type === 'log:append') {
      setLogs(logs => [...logs, e.message]);
    }
  }));

  // log:update — update existing entry (index or 'last')
  unsubs.push(emitter.on('log:update', (e) => {
    if (e.type === 'log:update') {
      setLogs(logs => {
        const updated = [...logs];
        const idx = e.index === 'last' ? updated.length - 1 : e.index;
        if (idx >= 0 && idx < updated.length) {
          updated[idx] = e.message;
        }
        return updated;
      });
    }
  }));

  // node:start — set node executionState to 'executing'
  unsubs.push(emitter.on('node:start', (e) => {
    if (e.type === 'node:start') {
      setNodes(nodes => nodes.map(n =>
        n.id === e.nodeId
          ? { ...n, data: { ...n.data, executionState: 'executing' as const } }
          : n
      ));
    }
  }));

  // node:complete — set executionState to 'completed', apply dataPatch
  unsubs.push(emitter.on('node:complete', (e) => {
    if (e.type === 'node:complete') {
      setNodes(nodes => nodes.map(n =>
        n.id === e.nodeId
          ? { ...n, data: { ...n.data, executionState: 'completed' as const } }
          : n
      ));
    }
  }));

  // node:error — set executionState to 'error' with message
  unsubs.push(emitter.on('node:error', (e) => {
    if (e.type === 'node:error') {
      setNodes(nodes => nodes.map(n =>
        n.id === e.nodeId
          ? { ...n, data: { ...n.data, executionState: 'error' as const, executionError: e.error } }
          : n
      ));
    }
  }));

  // node:data — merge patch into node data (handles dataPatch from executors)
  // Special case: tokenData is NOT merged into node.data (it's for stats tracking only)
  unsubs.push(emitter.on('node:data', (e) => {
    if (e.type === 'node:data') {
      // Extract tokenData separately (handled by caller via node output stats)
      const { tokenData: _tokenData, ...nodePatch } = e.patch as { tokenData?: unknown; [key: string]: unknown };
      if (Object.keys(nodePatch).length > 0) {
        setNodes(nodes => nodes.map(n =>
          n.id === e.nodeId
            ? { ...n, data: { ...n.data, ...nodePatch } }
            : n
        ));
      }
    }
  }));

  // edge:style — update edge styles
  unsubs.push(emitter.on('edge:style', (e) => {
    if (e.type === 'edge:style') {
      setEdges(edges => edges.map(edge => {
        const update = e.updates.find(u => u.edgeId === edge.id);
        return update ? { ...edge, style: update.style, animated: update.animated } : edge;
      }));
    }
  }));

  // error-recovery:request — show error dialog
  unsubs.push(emitter.on('error-recovery:request', (e) => {
    if (e.type === 'error-recovery:request' && setCurrentError) {
      setCurrentError({ nodeId: e.nodeId, nodeName: e.nodeName, message: e.message });
    }
  }));

  // review:request — show review dialog
  unsubs.push(emitter.on('review:request', (e) => {
    if (e.type === 'review:request' && setReviewRequest) {
      setReviewRequest(e.request);
    }
  }));

  return () => unsubs.forEach(fn => fn());
}
