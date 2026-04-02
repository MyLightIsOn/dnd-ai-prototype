import { useWorkflowStore } from './workflow-store';

export const useSelectedNode = () =>
  useWorkflowStore(s => s.nodes.find(n => n.id === s.selectedId));

export const useExecutionStatus = () =>
  useWorkflowStore(s => s.executionStatus);
