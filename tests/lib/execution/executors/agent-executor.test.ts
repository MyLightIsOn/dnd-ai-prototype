import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/agent-executor';

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

describe('agent-executor (mock mode)', () => {
  it('returns a mock response string', async () => {
    const executor = getNodeExecutor('agent');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'agent',
      nodeData: {
        name: 'MyAgent',
        mode: 'mock',
        prompt: 'Say hello',
        model: 'openai/gpt-4o',
      },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toContain('mock response');
    expect(result.output).toContain('MyAgent');
  });

  it('emits a log:append event in mock mode', async () => {
    const executor = getNodeExecutor('agent');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'agent',
      nodeData: { name: 'Agent', mode: 'mock', model: 'openai/gpt-4o-mini' },
      inputs: [],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('[MOCK]');
    expect(messages[0]).toContain('🤖 Agent');
  });

  it('uses default model label when model is not set', async () => {
    const executor = getNodeExecutor('agent');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'agent',
      nodeData: { name: 'Agent', mode: 'mock' },
      inputs: [],
      context,
    });

    expect(messages[0]).toContain('model');
  });

  it('respects providerOverride in context options', async () => {
    const executor = getNodeExecutor('agent');

    const context = makeContext({ options: { providerOverride: 'anthropic/claude-haiku-4' } });
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'agent',
      nodeData: { name: 'Agent', mode: 'mock', model: 'openai/gpt-4o' },
      inputs: [],
      context,
    });

    expect(messages[0]).toContain('anthropic/claude-haiku-4');
  });

  it('throws in live mode when model format is invalid', async () => {
    const executor = getNodeExecutor('agent');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'agent',
        nodeData: { name: 'Agent', mode: 'live', model: 'invalid-no-slash' },
        inputs: [],
        context: makeContext(),
      })
    ).rejects.toThrow('Invalid model format');
  });

  it('throws in live mode when model is missing', async () => {
    const executor = getNodeExecutor('agent');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'agent',
        nodeData: { name: 'Agent', mode: 'live' },
        inputs: [],
        context: makeContext(),
      })
    ).rejects.toThrow('Invalid model format');
  });
});
