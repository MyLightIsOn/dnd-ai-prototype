import { describe, it, expect, vi, beforeEach } from 'vitest';
import type React from 'react';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { createReactBridge } from '@/lib/execution/event-bridge';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';

function makeNode(id: string, extra: Record<string, unknown> = {}): TypedNode {
  return {
    id,
    type: 'prompt',
    position: { x: 0, y: 0 },
    data: { name: 'Test', executionState: 'idle', ...extra },
  } as TypedNode;
}

function makeEdge(id: string): Edge {
  return { id, source: 'a', target: 'b' } as Edge;
}

// Helper to get the functional updater passed to a setState mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUpdater(mockFn: ReturnType<typeof vi.fn>, callIndex = 0): (prev: any) => any {
  return mockFn.mock.calls[callIndex][0];
}

describe('createReactBridge', () => {
  // vi.fn() mocks typed as the correct React.Dispatch shapes for the bridge
  let setLogsMock: ReturnType<typeof vi.fn>;
  let setNodesMock: ReturnType<typeof vi.fn>;
  let setEdgesMock: ReturnType<typeof vi.fn>;
  let setCurrentErrorMock: ReturnType<typeof vi.fn>;
  let setReviewRequestMock: ReturnType<typeof vi.fn>;
  let emitter: ExecutionEventEmitter;

  // Correctly-typed aliases used when calling createReactBridge
  let setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  let setNodes: React.Dispatch<React.SetStateAction<TypedNode[]>>;
  let setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  let setCurrentError: (error: { nodeId: string; nodeName: string; message: string } | null) => void;
  let setReviewRequest: (req: unknown) => void;

  beforeEach(() => {
    setLogsMock = vi.fn();
    setNodesMock = vi.fn();
    setEdgesMock = vi.fn();
    setCurrentErrorMock = vi.fn();
    setReviewRequestMock = vi.fn();
    emitter = new ExecutionEventEmitter();

    setLogs = setLogsMock as unknown as React.Dispatch<React.SetStateAction<string[]>>;
    setNodes = setNodesMock as unknown as React.Dispatch<React.SetStateAction<TypedNode[]>>;
    setEdges = setEdgesMock as unknown as React.Dispatch<React.SetStateAction<Edge[]>>;
    setCurrentError = setCurrentErrorMock as unknown as (error: { nodeId: string; nodeName: string; message: string } | null) => void;
    setReviewRequest = setReviewRequestMock as unknown as (req: unknown) => void;
  });

  it('log:append event calls setLogs with new entry appended', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'log:append', message: 'hello' });

    expect(setLogsMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setLogsMock);
    const result = updater(['existing']);
    expect(result).toEqual(['existing', 'hello']);
  });

  it('log:update with index "last" updates last log entry', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'log:update', index: 'last', message: 'updated' });

    expect(setLogsMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setLogsMock);
    const result = updater(['first', 'second', 'third']);
    expect(result).toEqual(['first', 'second', 'updated']);
  });

  it('log:update with numeric index updates that specific entry', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'log:update', index: 1, message: 'replaced' });

    expect(setLogsMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setLogsMock);
    const result = updater(['first', 'second', 'third']);
    expect(result).toEqual(['first', 'replaced', 'third']);
  });

  it('log:update with out-of-bounds index leaves logs unchanged', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'log:update', index: 99, message: 'oob' });

    expect(setLogsMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setLogsMock);
    const original = ['a', 'b'];
    const result = updater(original);
    expect(result).toEqual(['a', 'b']);
  });

  it('node:start calls setNodes with executionState "executing"', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'node:start', nodeId: 'n1' });

    expect(setNodesMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setNodesMock);
    const nodes = [makeNode('n1'), makeNode('n2')];
    const result = updater(nodes);
    expect(result[0].data.executionState).toBe('executing');
    expect(result[1].data.executionState).toBe('idle');
  });

  it('node:complete calls setNodes with executionState "completed"', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'node:complete', nodeId: 'n1', output: 'done' });

    expect(setNodesMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setNodesMock);
    const nodes = [makeNode('n1', { executionState: 'executing' }), makeNode('n2')];
    const result = updater(nodes);
    expect(result[0].data.executionState).toBe('completed');
    expect(result[1].data.executionState).toBe('idle');
  });

  it('node:error calls setNodes with executionState "error" and executionError', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({ type: 'node:error', nodeId: 'n1', error: 'something went wrong' });

    expect(setNodesMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setNodesMock);
    const nodes = [makeNode('n1'), makeNode('n2')];
    const result = updater(nodes);
    expect(result[0].data.executionState).toBe('error');
    expect(result[0].data.executionError).toBe('something went wrong');
    expect(result[1].data.executionState).toBe('idle');
  });

  it('node:data merges patch into node data but not tokenData', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({
      type: 'node:data',
      nodeId: 'n1',
      patch: {
        preview: 'some preview',
        tokenData: { n1: { promptTokens: 100, completionTokens: 50, costUsd: 0.01 } },
      },
    });

    expect(setNodesMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setNodesMock);
    const nodes = [makeNode('n1'), makeNode('n2')];
    const result = updater(nodes);
    expect(result[0].data.preview).toBe('some preview');
    expect(result[0].data).not.toHaveProperty('tokenData');
    expect(result[1].data).not.toHaveProperty('preview');
  });

  it('node:data with only tokenData in patch does not call setNodes', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({
      type: 'node:data',
      nodeId: 'n1',
      patch: {
        tokenData: { n1: { promptTokens: 100, completionTokens: 50, costUsd: 0.01 } },
      },
    });

    // setNodes should not be called because nodePatch is empty after removing tokenData
    expect(setNodesMock).not.toHaveBeenCalled();
  });

  it('error-recovery:request calls setCurrentError', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    emitter.emit({
      type: 'error-recovery:request',
      nodeId: 'n1',
      nodeName: 'My Node',
      message: 'It broke',
    });

    expect(setCurrentErrorMock).toHaveBeenCalledOnce();
    expect(setCurrentErrorMock).toHaveBeenCalledWith({
      nodeId: 'n1',
      nodeName: 'My Node',
      message: 'It broke',
    });
  });

  it('review:request calls setReviewRequest with request payload', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    const request = {
      reviewerLabel: 'Reviewer 1',
      nodeName: 'Review Node',
      content: 'Some content',
      mode: 'approve-reject' as const,
    };

    emitter.emit({ type: 'review:request', nodeId: 'n1', request });

    expect(setReviewRequestMock).toHaveBeenCalledOnce();
    expect(setReviewRequestMock).toHaveBeenCalledWith(request);
  });

  it('edge:style updates matching edges with new style and animated flag', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    const updates = [
      { edgeId: 'e1', style: { stroke: '#22c55e', strokeWidth: 2, opacity: 1 }, animated: true },
    ];

    emitter.emit({ type: 'edge:style', updates });

    expect(setEdgesMock).toHaveBeenCalledOnce();
    const updater = getUpdater(setEdgesMock);
    const edges = [makeEdge('e1'), makeEdge('e2')];
    const result = updater(edges);
    expect(result[0].style).toEqual({ stroke: '#22c55e', strokeWidth: 2, opacity: 1 });
    expect(result[0].animated).toBe(true);
    // e2 was not in updates, so unchanged
    expect(result[1].style).toBeUndefined();
  });

  it('cleanup function unsubscribes all listeners', () => {
    const cleanup = createReactBridge(setLogs, setNodes, setEdges, setCurrentError, setReviewRequest, emitter);

    cleanup();

    emitter.emit({ type: 'log:append', message: 'after cleanup' });
    emitter.emit({ type: 'node:start', nodeId: 'n1' });
    emitter.emit({ type: 'node:complete', nodeId: 'n1', output: 'done' });
    emitter.emit({ type: 'node:error', nodeId: 'n1', error: 'err' });

    expect(setLogsMock).not.toHaveBeenCalled();
    expect(setNodesMock).not.toHaveBeenCalled();
  });

  it('does not call setCurrentError if it is undefined', () => {
    createReactBridge(setLogs, setNodes, setEdges, undefined, setReviewRequest, emitter);

    // Should not throw
    emitter.emit({
      type: 'error-recovery:request',
      nodeId: 'n1',
      nodeName: 'Node',
      message: 'error',
    });

    expect(setCurrentErrorMock).not.toHaveBeenCalled();
  });

  it('does not call setReviewRequest if it is undefined', () => {
    createReactBridge(setLogs, setNodes, setEdges, setCurrentError, undefined, emitter);

    // Should not throw
    emitter.emit({
      type: 'review:request',
      nodeId: 'n1',
      request: {
        reviewerLabel: 'R1',
        nodeName: 'Node',
        content: 'Content',
        mode: 'approve-reject',
      },
    });

    expect(setReviewRequestMock).not.toHaveBeenCalled();
  });
});
