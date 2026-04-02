import { describe, it, expect, beforeEach } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager, globalMemoryInstance } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/memory-executor';

function makeContext(workflowMemory?: MemoryManager): ExecutorContext {
  return {
    emitter: new ExecutionEventEmitter(),
    workflowMemory: workflowMemory ?? new MemoryManager('workflow'),
    auditLog: new AuditLog(),
    executionControl: { current: 'running' as const },
    loopIterations: {},
    loopExited: {},
  };
}

describe('memory-executor', () => {
  beforeEach(() => {
    globalMemoryInstance.clear();
  });

  it('stores input under node name when not valid JSON', async () => {
    const executor = getNodeExecutor('memory');
    expect(executor).toBeDefined();

    const workflowMemory = new MemoryManager('workflow');
    const context = makeContext(workflowMemory);

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'myKey', scope: 'workflow', keys: [] },
      inputs: ['plain text value'],
      context,
    });

    expect(workflowMemory.get('myKey')).toBe('plain text value');
  });

  it('stores JSON object keys individually', async () => {
    const executor = getNodeExecutor('memory');

    const workflowMemory = new MemoryManager('workflow');
    const context = makeContext(workflowMemory);

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'mem', scope: 'workflow', keys: [] },
      inputs: [JSON.stringify({ foo: 'bar', count: 42 })],
      context,
    });

    expect(workflowMemory.get('foo')).toBe('bar');
    expect(workflowMemory.get('count')).toBe(42);
  });

  it('passes input through as output', async () => {
    const executor = getNodeExecutor('memory');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'mem', scope: 'workflow', keys: [] },
      inputs: ['pass through'],
      context: makeContext(),
    });

    expect(result.output).toBe('pass through');
  });

  it('returns stored keys in dataPatch', async () => {
    const executor = getNodeExecutor('memory');

    const workflowMemory = new MemoryManager('workflow');
    const context = makeContext(workflowMemory);

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'myKey', scope: 'workflow', keys: [] },
      inputs: ['value'],
      context,
    });

    expect(Array.isArray(result.dataPatch?.keys)).toBe(true);
    expect(result.dataPatch?.keys).toContain('myKey');
  });

  it('emits log:append event', async () => {
    const executor = getNodeExecutor('memory');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'TestMem', scope: 'workflow', keys: [] },
      inputs: ['value'],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('🧠 Memory');
    expect(messages[0]).toContain('TestMem');
  });

  it('uses global memory when scope is global', async () => {
    const executor = getNodeExecutor('memory');

    const context = makeContext();

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'memory',
      nodeData: { name: 'globalKey', scope: 'global', keys: [] },
      inputs: ['global value'],
      context,
    });

    expect(globalMemoryInstance.get('globalKey')).toBe('global value');
  });
});
