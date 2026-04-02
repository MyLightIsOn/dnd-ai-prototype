import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore, initialWorkflowState } from '@/lib/store/workflow-store';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';

// Helper to get a fresh store state
const getStore = () => useWorkflowStore.getState();
const resetStore = () => useWorkflowStore.setState({ ...initialWorkflowState });

beforeEach(() => {
  resetStore();
});

const makeNode = (id: string): TypedNode => ({
  id,
  type: 'agent',
  position: { x: 0, y: 0 },
  data: { name: `Node ${id}`, executionState: 'idle' },
} as TypedNode);

const makeEdge = (id: string): Edge => ({
  id,
  source: 'a',
  target: 'b',
});

describe('useWorkflowStore', () => {
  describe('setNodes', () => {
    it('sets nodes with an array', () => {
      const nodes = [makeNode('1'), makeNode('2')];
      getStore().setNodes(nodes);
      expect(getStore().nodes).toEqual(nodes);
    });

    it('sets nodes with an updater function', () => {
      const initial = [makeNode('1')];
      getStore().setNodes(initial);
      getStore().setNodes(prev => [...prev, makeNode('2')]);
      expect(getStore().nodes).toHaveLength(2);
      expect(getStore().nodes[1].id).toBe('2');
    });
  });

  describe('setEdges', () => {
    it('sets edges with an array', () => {
      const edges = [makeEdge('e1')];
      getStore().setEdges(edges);
      expect(getStore().edges).toEqual(edges);
    });

    it('sets edges with an updater function', () => {
      getStore().setEdges([makeEdge('e1')]);
      getStore().setEdges(prev => [...prev, makeEdge('e2')]);
      expect(getStore().edges).toHaveLength(2);
    });
  });

  describe('setLogs', () => {
    it('sets logs with an array', () => {
      getStore().setLogs(['line 1', 'line 2']);
      expect(getStore().logs).toEqual(['line 1', 'line 2']);
    });

    it('sets logs with an updater function', () => {
      getStore().setLogs(['line 1']);
      getStore().setLogs(prev => [...prev, 'line 2']);
      expect(getStore().logs).toEqual(['line 1', 'line 2']);
    });
  });

  describe('updateNodeData', () => {
    it('merges patch into the correct node', () => {
      const nodes = [makeNode('1'), makeNode('2')];
      getStore().setNodes(nodes);
      getStore().updateNodeData('1', { name: 'Updated', executionState: 'completed' });

      const updated = getStore().nodes.find(n => n.id === '1');
      expect(updated?.data.name).toBe('Updated');
      expect(updated?.data.executionState).toBe('completed');
    });

    it('does not modify other nodes', () => {
      const nodes = [makeNode('1'), makeNode('2')];
      getStore().setNodes(nodes);
      getStore().updateNodeData('1', { name: 'Changed' });

      const other = getStore().nodes.find(n => n.id === '2');
      expect(other?.data.name).toBe('Node 2');
    });
  });

  describe('setCurrentError', () => {
    it('sets the current error', () => {
      const error = { nodeId: 'n1', nodeName: 'My Node', message: 'Something went wrong' };
      getStore().setCurrentError(error);
      expect(getStore().currentError).toEqual(error);
    });

    it('clears the current error with null', () => {
      getStore().setCurrentError({ nodeId: 'n1', nodeName: 'N', message: 'err' });
      getStore().setCurrentError(null);
      expect(getStore().currentError).toBeNull();
    });
  });

  describe('setExecutionStatus', () => {
    it('updates execution status', () => {
      getStore().setExecutionStatus('running');
      expect(getStore().executionStatus).toBe('running');
    });

    it('updates to paused', () => {
      getStore().setExecutionStatus('paused');
      expect(getStore().executionStatus).toBe('paused');
    });

    it('updates to idle', () => {
      getStore().setExecutionStatus('running');
      getStore().setExecutionStatus('idle');
      expect(getStore().executionStatus).toBe('idle');
    });
  });
});
