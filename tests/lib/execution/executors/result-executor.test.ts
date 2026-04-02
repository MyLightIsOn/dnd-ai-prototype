import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/result-executor';

function makeContext(): ExecutorContext {
  return {
    emitter: new ExecutionEventEmitter(),
    workflowMemory: new MemoryManager('workflow'),
    auditLog: new AuditLog(),
    executionControl: { current: 'running' as const },
    loopIterations: {},
    loopExited: {},
  };
}

describe('result-executor', () => {
  it('returns the last input wrapped in Final prefix', async () => {
    const executor = getNodeExecutor('result');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'result',
      nodeData: { name: 'Result' },
      inputs: ['first output', 'final output'],
      context: makeContext(),
    });

    expect(result.output).toBe('📦 Final: final output');
  });

  it('uses <empty> when no inputs are provided', async () => {
    const executor = getNodeExecutor('result');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'result',
      nodeData: { name: 'Result' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('📦 Final: <empty>');
  });

  it('stores preview in dataPatch without prefix', async () => {
    const executor = getNodeExecutor('result');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'result',
      nodeData: { name: 'Result' },
      inputs: ['the real output'],
      context: makeContext(),
    });

    expect(result.dataPatch?.preview).toBe('the real output');
  });

  it('emits log:append event', async () => {
    const executor = getNodeExecutor('result');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'result',
      nodeData: { name: 'Result' },
      inputs: ['some output'],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('📦 Final:');
    expect(messages[0]).toContain('some output');
  });

  it('uses the last of multiple inputs', async () => {
    const executor = getNodeExecutor('result');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'result',
      nodeData: { name: 'Result' },
      inputs: ['a', 'b', 'c'],
      context: makeContext(),
    });

    expect(result.output).toContain('c');
    expect(result.dataPatch?.preview).toBe('c');
  });
});
