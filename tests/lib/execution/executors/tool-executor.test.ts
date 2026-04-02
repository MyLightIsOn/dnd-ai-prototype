import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import { registerTool } from '@/lib/tools/registry';
import type { ExecutorContext } from '@/lib/execution/node-executor';
import type { Tool } from '@/lib/tools/base';

import '@/lib/execution/executors/tool-executor';

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

function makeMockTool(id: string, output: string): Tool {
  return {
    id,
    name: id,
    category: 'search',
    async execute(_input: string, _config: unknown) {
      return { success: true, output };
    },
  };
}

function makeFailingTool(id: string, error: string): Tool {
  return {
    id,
    name: id,
    category: 'search',
    async execute(_input: string, _config: unknown) {
      return { success: false, output: '', error };
    },
  };
}

describe('tool-executor', () => {
  it('executes a registered tool and returns its output', async () => {
    registerTool(makeMockTool('test-tool', 'search results here'));
    const executor = getNodeExecutor('tool');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'tool',
      nodeData: { name: 'Searcher', kind: 'test-tool' },
      inputs: ['query text'],
      context: makeContext(),
    });

    expect(result.output).toBe('search results here');
  });

  it('includes lastResult in dataPatch', async () => {
    registerTool(makeMockTool('test-tool-2', 'my result'));
    const executor = getNodeExecutor('tool');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'tool',
      nodeData: { name: 'Tool', kind: 'test-tool-2' },
      inputs: [],
      context: makeContext(),
    });

    expect(result.dataPatch?.lastResult).toBe('my result');
  });

  it('throws when tool kind is unknown', async () => {
    const executor = getNodeExecutor('tool');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'tool',
        nodeData: { name: 'Tool', kind: 'nonexistent-tool-xyz' },
        inputs: [],
        context: makeContext(),
      })
    ).rejects.toThrow('Unknown tool kind');
  });

  it('throws when tool execution fails', async () => {
    registerTool(makeFailingTool('failing-tool', 'Connection refused'));
    const executor = getNodeExecutor('tool');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'tool',
        nodeData: { name: 'Tool', kind: 'failing-tool' },
        inputs: [],
        context: makeContext(),
      })
    ).rejects.toThrow('Connection refused');
  });

  it('emits log:append then log:update events', async () => {
    registerTool(makeMockTool('log-tool', 'log output'));
    const executor = getNodeExecutor('tool');

    const context = makeContext();
    const events: Array<{ type: string }> = [];
    context.emitter.on('log:append', () => events.push({ type: 'append' }));
    context.emitter.on('log:update', () => events.push({ type: 'update' }));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'tool',
      nodeData: { name: 'Tool', kind: 'log-tool' },
      inputs: [],
      context,
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('append');
    expect(events[1].type).toBe('update');
  });
});
