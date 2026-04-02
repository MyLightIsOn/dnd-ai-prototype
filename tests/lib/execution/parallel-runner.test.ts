import { test, expect } from 'vitest';
import '@/lib/execution/executors/index'; // register executors
import { runParallel, type ExecutionEngine } from '@/lib/execution/parallel-runner';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import type { ExecutionEvent } from '@/lib/execution/events';

function makeEngine(overrides?: Partial<ExecutionEngine>): ExecutionEngine {
  return {
    emitter: new ExecutionEventEmitter(),
    control: { current: 'running' },
    errorRecovery: { current: null },
    reviewDecision: { current: null },
    ...overrides,
  };
}

function makeNode(id: string, type: string, data: Record<string, unknown> = {}) {
  return { id, type, position: { x: 0, y: 0 }, data: { name: type, ...data } };
}

test('no nodes — completes without error', async () => {
  const engine = makeEngine();
  await expect(runParallel([], [], engine)).resolves.toBeDefined();
});

test('linear chain executes in order', async () => {
  const engine = makeEngine();
  const completed: string[] = [];
  engine.emitter.on('node:complete', e => {
    if (e.type === 'node:complete') completed.push(e.nodeId);
  });

  const nodes = [
    makeNode('1', 'prompt', { text: 'hello' }),
    makeNode('2', 'result'),
  ];
  const edges = [{ id: 'e1', source: '1', target: '2' }];

  await runParallel(nodes, edges, engine);

  expect(completed).toHaveLength(2);
  expect(completed[0]).toBe('1');
  expect(completed[1]).toBe('2');
});

test('single node with no edges completes', async () => {
  const engine = makeEngine();
  const events: ExecutionEvent[] = [];
  engine.emitter.on('node:complete', e => events.push(e));

  await runParallel([makeNode('1', 'prompt', { text: 'standalone' })], [], engine);

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ type: 'node:complete', nodeId: '1' });
});

test('cancellation stops execution mid-run', async () => {
  const engine = makeEngine();
  const completed: string[] = [];
  engine.emitter.on('node:complete', e => {
    if (e.type === 'node:complete') completed.push(e.nodeId);
  });

  // Cancel immediately before any node runs
  engine.control.current = 'cancelled';

  const nodes = [
    makeNode('1', 'prompt', { text: 'hi' }),
    makeNode('2', 'result'),
  ];
  const edges = [{ id: 'e1', source: '1', target: '2' }];

  await runParallel(nodes, edges, engine);

  // Should have been cancelled before any nodes run
  expect(completed.length).toBe(0);
});

test('execution:cancelled event is emitted on cancellation', async () => {
  const engine = makeEngine();
  let cancelledEmitted = false;
  engine.emitter.on('execution:cancelled', () => { cancelledEmitted = true; });

  engine.control.current = 'cancelled';

  await runParallel([makeNode('1', 'prompt', { text: 'hi' })], [], engine);

  expect(cancelledEmitted).toBe(true);
});

test('agent in mock mode emits node:complete with output', async () => {
  const engine = makeEngine();
  let agentOutput = '';
  engine.emitter.on('node:complete', e => {
    if (e.type === 'node:complete' && e.nodeId === 'agent1') agentOutput = e.output;
  });

  const nodes = [
    makeNode('agent1', 'agent', { mode: 'mock', prompt: 'test', model: 'mock/mock' }),
  ];

  await runParallel(nodes, [], engine);

  expect(agentOutput.length).toBeGreaterThan(0);
});

test('log:append events are emitted', async () => {
  const engine = makeEngine();
  const messages: string[] = [];
  engine.emitter.on('log:append', e => {
    if (e.type === 'log:append') messages.push(e.message);
  });

  await runParallel([makeNode('1', 'prompt', { text: 'hi' })], [], engine);

  // Should have at least the startup and done messages
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.some(m => m.includes('✅ Done'))).toBe(true);
});

test('runParallel returns memory, auditLog, and stats', async () => {
  const engine = makeEngine();
  const result = await runParallel([makeNode('1', 'prompt', { text: 'test' })], [], engine);

  expect(result).toHaveProperty('memory');
  expect(result).toHaveProperty('auditLog');
  expect(result).toHaveProperty('stats');
  expect(result.stats).toHaveProperty('nodes');
});

test('parallel nodes in same level both complete', async () => {
  const engine = makeEngine();
  const completed: string[] = [];
  engine.emitter.on('node:complete', e => {
    if (e.type === 'node:complete') completed.push(e.nodeId);
  });

  // Two independent prompt nodes at same level
  const nodes = [
    makeNode('p1', 'prompt', { text: 'first' }),
    makeNode('p2', 'prompt', { text: 'second' }),
    makeNode('r1', 'result'),
  ];
  const edges = [
    { id: 'e1', source: 'p1', target: 'r1' },
    { id: 'e2', source: 'p2', target: 'r1' },
  ];

  await runParallel(nodes, edges, engine);

  expect(completed).toContain('p1');
  expect(completed).toContain('p2');
  expect(completed).toContain('r1');
});

test('node:start events are emitted before node:complete', async () => {
  const engine = makeEngine();
  const eventOrder: string[] = [];
  engine.emitter.on('node:start', e => {
    if (e.type === 'node:start') eventOrder.push(`start:${e.nodeId}`);
  });
  engine.emitter.on('node:complete', e => {
    if (e.type === 'node:complete') eventOrder.push(`complete:${e.nodeId}`);
  });

  await runParallel([makeNode('1', 'prompt', { text: 'test' })], [], engine);

  const startIdx = eventOrder.indexOf('start:1');
  const completeIdx = eventOrder.indexOf('complete:1');
  expect(startIdx).toBeGreaterThanOrEqual(0);
  expect(completeIdx).toBeGreaterThan(startIdx);
});
