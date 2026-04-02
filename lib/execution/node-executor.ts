import type { ExecutionEventEmitter } from './events';
import type { MemoryManager } from './memory-manager';
import type { AuditLog } from './audit-log';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'cancelled';

export interface RunOptions {
  compareMode?: boolean;
  compareIndex?: number;
}

export interface NodeExecutionInput {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  inputs: string[];  // outputs from upstream nodes
  context: ExecutorContext;
}

export interface ExecutorContext {
  workflowMemory: MemoryManager;
  auditLog: AuditLog;
  emitter: ExecutionEventEmitter;
  executionControl: { current: ExecutionStatus };
  loopIterations: Record<string, number>;
  loopExited: Record<string, boolean>;
  options?: RunOptions;
}

export interface NodeExecutionResult {
  output: string;
  dataPatch?: Record<string, unknown>;  // updates to apply to node data
}

export interface NodeExecutor {
  type: string;  // matches node.type in the graph
  execute(input: NodeExecutionInput): Promise<NodeExecutionResult>;
}

const executors = new Map<string, NodeExecutor>();

export function registerNodeExecutor(executor: NodeExecutor): void {
  executors.set(executor.type, executor);
}

export function getNodeExecutor(type: string): NodeExecutor | undefined {
  return executors.get(type);
}

export function getAllNodeExecutors(): NodeExecutor[] {
  return Array.from(executors.values());
}
