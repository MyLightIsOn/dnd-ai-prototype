import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';

import '@/lib/execution/executors/chunker-executor';

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

describe('chunker-executor', () => {
  it('chunks text using fixed strategy', async () => {
    const executor = getNodeExecutor('chunker');
    expect(executor).toBeDefined();

    const text = 'A'.repeat(1000);
    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'chunker',
      nodeData: { name: 'Chunker', strategy: 'fixed', chunkSize: 200, overlap: 0 },
      inputs: [text],
      context: makeContext(),
    });

    expect(result.output).toContain('---CHUNK---');
  });

  it('stores chunks in dataPatch', async () => {
    const executor = getNodeExecutor('chunker');

    const text = 'A'.repeat(600);
    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'chunker',
      nodeData: { name: 'Chunker', strategy: 'fixed', chunkSize: 200, overlap: 0 },
      inputs: [text],
      context: makeContext(),
    });

    expect(Array.isArray(result.dataPatch?.chunks)).toBe(true);
    expect((result.dataPatch?.chunks as string[]).length).toBeGreaterThan(0);
  });

  it('emits log:append with chunk count', async () => {
    const executor = getNodeExecutor('chunker');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    const text = 'A'.repeat(600);
    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'chunker',
      nodeData: { name: 'MyChunker', strategy: 'fixed', chunkSize: 200, overlap: 0 },
      inputs: [text],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('📑 MyChunker');
    expect(messages[0]).toContain('chunks');
  });

  it('handles empty input gracefully', async () => {
    const executor = getNodeExecutor('chunker');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'chunker',
      nodeData: { name: 'Chunker', strategy: 'fixed', chunkSize: 500, overlap: 50 },
      inputs: [],
      context: makeContext(),
    });

    expect(result.output).toBe('');
    expect(result.dataPatch?.chunks).toEqual([]);
  });

  it('uses semantic strategy', async () => {
    const executor = getNodeExecutor('chunker');

    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'chunker',
      nodeData: { name: 'Chunker', strategy: 'semantic', chunkSize: 50, overlap: 0 },
      inputs: [text],
      context: makeContext(),
    });

    expect(result.output).toBeDefined();
    expect(typeof result.output).toBe('string');
  });
});
