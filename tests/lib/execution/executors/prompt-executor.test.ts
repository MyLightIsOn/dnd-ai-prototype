import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNodeExecutor,
  clearAllExecutors,
} from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

// Importing this file registers the prompt executor as a side-effect
import '@/lib/execution/executors/prompt-executor';

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

describe('prompt-executor', () => {
  // NOTE: We do NOT call clearAllExecutors() here because the module-level import
  // only runs once per test file. clearAllExecutors() would unregister the executor
  // and there is no way to re-register it (module is cached). The executor is
  // already registered once at module load time.

  it('returns the prompt text as output', async () => {
    const executor = getNodeExecutor('prompt');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'prompt',
      nodeData: { name: 'My Prompt', text: 'Hello world' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('Hello world');
  });

  it('returns empty string when text is not set', async () => {
    const executor = getNodeExecutor('prompt');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'prompt',
      nodeData: { name: 'Prompt' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('');
  });

  it('emits a log:append event with truncated preview', async () => {
    const executor = getNodeExecutor('prompt');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    const longText = 'A'.repeat(100);
    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'prompt',
      nodeData: { name: 'Prompt', text: longText },
      inputs: [],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('…');
    expect(messages[0]).toContain('💬 Prompt:');
  });

  it('emits short text without ellipsis', async () => {
    const executor = getNodeExecutor('prompt');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'prompt',
      nodeData: { name: 'Prompt', text: 'Short' },
      inputs: [],
      context,
    });

    expect(messages[0]).not.toContain('…');
    expect(messages[0]).toContain('Short');
  });
});
