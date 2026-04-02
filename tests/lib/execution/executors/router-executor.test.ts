import { describe, it, expect } from 'vitest';
import { getNodeExecutor } from '@/lib/execution/node-executor';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import { MemoryManager } from '@/lib/execution/memory-manager';
import { AuditLog } from '@/lib/execution/audit-log';
import type { ExecutorContext } from '@/lib/execution/node-executor';
import type { RouterData } from '@/types/router';

import '@/lib/execution/executors/router-executor';

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

const keywordRouterData: RouterData = {
  name: 'Router',
  strategy: 'keyword',
  routes: [
    {
      id: 'route-yes',
      label: 'Yes Route',
      condition: { type: 'keyword', keywords: ['yes', 'affirmative'], matchMode: 'any' },
    },
    {
      id: 'route-no',
      label: 'No Route',
      condition: { type: 'keyword', keywords: ['no', 'negative'], matchMode: 'any' },
    },
  ],
};

describe('router-executor', () => {
  it('routes to the correct route based on keyword match', async () => {
    const executor = getNodeExecutor('router');
    expect(executor).toBeDefined();

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'router',
      nodeData: keywordRouterData as unknown as Record<string, unknown>,
      inputs: ['yes, I agree'],
      context: makeContext(),
    });

    expect(result.dataPatch?.executedRoute).toBe('route-yes');
    expect(result.output).toBe('yes, I agree');
  });

  it('routes to second route when first does not match', async () => {
    const executor = getNodeExecutor('router');

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'router',
      nodeData: keywordRouterData as unknown as Record<string, unknown>,
      inputs: ['no, I disagree'],
      context: makeContext(),
    });

    expect(result.dataPatch?.executedRoute).toBe('route-no');
  });

  it('uses default route when no routes match', async () => {
    const executor = getNodeExecutor('router');

    const routerWithDefault: RouterData = {
      ...keywordRouterData,
      defaultRoute: 'default-path',
    };

    const result = await executor!.execute({
      nodeId: 'n1',
      nodeType: 'router',
      nodeData: routerWithDefault as unknown as Record<string, unknown>,
      inputs: ['something else entirely'],
      context: makeContext(),
    });

    expect(result.dataPatch?.executedRoute).toBe('default');
  });

  it('throws when no routes match and no default route', async () => {
    const executor = getNodeExecutor('router');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'router',
        nodeData: keywordRouterData as unknown as Record<string, unknown>,
        inputs: ['something completely unrelated'],
        context: makeContext(),
      })
    ).rejects.toThrow('No routes matched');
  });

  it('throws when no inputs are provided', async () => {
    const executor = getNodeExecutor('router');

    await expect(
      executor!.execute({
        nodeId: 'n1',
        nodeType: 'router',
        nodeData: keywordRouterData as unknown as Record<string, unknown>,
        inputs: [],
        context: makeContext(),
      })
    ).rejects.toThrow('No input to router');
  });

  it('emits log:append event when route matches', async () => {
    const executor = getNodeExecutor('router');

    const context = makeContext();
    const messages: string[] = [];
    context.emitter.on('log:append', (e) => messages.push(e.message));

    await executor!.execute({
      nodeId: 'n1',
      nodeType: 'router',
      nodeData: keywordRouterData as unknown as Record<string, unknown>,
      inputs: ['yes please'],
      context,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('🔀 Router');
    expect(messages[0]).toContain('Yes Route');
  });
});
