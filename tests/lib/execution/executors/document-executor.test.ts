import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/document-executor';

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

describe('document-executor', () => {
  it('returns document content as output', async () => {
    const executor = getNodeExecutor('document');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'document',
      nodeData: { name: 'Doc', content: 'Hello from doc', fileName: 'doc.txt' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('Hello from doc');
  });

  it('returns empty string when content is not set', async () => {
    const executor = getNodeExecutor('document');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'document',
      nodeData: { name: 'Doc' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('');
  });

  it('emits a log:append event with file name and char count', async () => {
    const executor = getNodeExecutor('document');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'document',
      nodeData: { name: 'MyDoc', content: 'some content', fileName: 'file.txt' },
      inputs: [],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('📄 MyDoc');
    expect(messages[0]).toContain('file.txt');
    expect(messages[0]).toContain('chars');
  });

  it('uses "No file" when fileName is not set', async () => {
    const executor = getNodeExecutor('document');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'document',
      nodeData: { name: 'Doc', content: 'content' },
      inputs: [],
      context,
    });

    expect(messages[0]).toContain('No file');
  });
});
