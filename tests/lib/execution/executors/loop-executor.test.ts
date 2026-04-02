import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/loop-executor';

function makeContext(overrides?: Partial<ExecutorContext>): ExecutorContext {
  return {
    emitter: new ExecutionEventEmitter(),
    workflowMemory: new MemoryManager('workflow'),
    auditLog: new AuditLog(),
    executionControl: { current: 'running' as const },
    loopIterations: {},
    loopExited: {},
    ...overrides,
  };
}

describe('loop-executor', () => {
  it('increments loopIterations on each execution', async () => {
    const executor = getNodeExecutor('loop');
    expect(executor).toBeDefined();

    const context = makeContext();
    const loopData = { name: 'Loop', maxIterations: 5, currentIteration: 0 };

    await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: loopData,
      inputs: ['data'],
      context,
    });

    expect(context.loopIterations['loop-1']).toBe(1);

    await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: loopData,
      inputs: ['data'],
      context,
    });

    expect(context.loopIterations['loop-1']).toBe(2);
  });

  it('passes input through as output', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext();
    const result = await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'Loop', maxIterations: 5, currentIteration: 0 },
      inputs: ['my input data'],
      context,
    });

    expect(result.output).toBe('my input data');
  });

  it('sets executedExit=true when max iterations reached', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext({ loopIterations: { 'loop-1': 4 } });
    const result = await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'Loop', maxIterations: 5, currentIteration: 0 },
      inputs: ['data'],
      context,
    });

    expect(result.dataPatch?.executedExit).toBe(true);
    expect(context.loopExited['loop-1']).toBe(true);
  });

  it('sets executedExit=false when below max iterations', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext();
    const result = await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'Loop', maxIterations: 5, currentIteration: 0 },
      inputs: ['data'],
      context,
    });

    expect(result.dataPatch?.executedExit).toBe(false);
    expect(context.loopExited['loop-1']).toBe(false);
  });

  it('returns currentIteration in dataPatch', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext();
    const result = await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'Loop', maxIterations: 10, currentIteration: 0 },
      inputs: [],
      context,
    });

    expect(result.dataPatch?.currentIteration).toBe(1);
  });

  it('emits Exiting log when loop exits', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext({ loopIterations: { 'loop-1': 9 } });
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'MyLoop', maxIterations: 10, currentIteration: 0 },
      inputs: ['data'],
      context,
    });

    expect(messages[0]).toContain('Exiting');
    expect(messages[0]).toContain('MyLoop');
  });

  it('emits Continuing log when loop continues', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: { name: 'MyLoop', maxIterations: 10, currentIteration: 0 },
      inputs: ['data'],
      context,
    });

    expect(messages[0]).toContain('Continuing');
  });

  it('exits early with keyword break condition', async () => {
    const executor = getNodeExecutor('loop');

    const context = makeContext();
    const result = await executor!.execute({
      nodeId: 'loop-1',
      nodeType: 'loop',
      nodeData: {
        name: 'Loop',
        maxIterations: 10,
        currentIteration: 0,
        breakCondition: { type: 'keyword', keywords: ['DONE'] },
      },
      inputs: ['The answer is DONE'],
      context,
    });

    expect(result.dataPatch?.executedExit).toBe(true);
  });
});
