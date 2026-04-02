import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerNodeExecutor,
  getNodeExecutor,
  getAllNodeExecutors,
  type NodeExecutor,
  type NodeExecutionInput,
  type NodeExecutionResult,
} from '@/lib/execution/node-executor'

function createMockExecutor(type: string): NodeExecutor {
  return {
    type,
    async execute(_input: NodeExecutionInput): Promise<NodeExecutionResult> {
      return { output: `executed ${type}` }
    },
  }
}

describe('NodeExecutor registry', () => {
  beforeEach(() => {
    // Clear the registry before each test by getting all and then unregistering
    // Actually, we can't unregister easily, so we'll just use unique names
  })

  it('registerNodeExecutor stores an executor', () => {
    const executor = createMockExecutor('test-node-1')
    registerNodeExecutor(executor)
    expect(getNodeExecutor('test-node-1')).toBe(executor)
  })

  it('getNodeExecutor retrieves by type', () => {
    const executor = createMockExecutor('test-node-2')
    registerNodeExecutor(executor)
    const retrieved = getNodeExecutor('test-node-2')
    expect(retrieved).toBe(executor)
    expect(retrieved?.type).toBe('test-node-2')
  })

  it('getNodeExecutor returns undefined for unknown type', () => {
    const result = getNodeExecutor('unknown-type-' + Date.now())
    expect(result).toBeUndefined()
  })

  it('getAllNodeExecutors returns all registered executors', () => {
    const executor1 = createMockExecutor('test-node-3')
    const executor2 = createMockExecutor('test-node-4')

    registerNodeExecutor(executor1)
    registerNodeExecutor(executor2)

    const all = getAllNodeExecutors()
    const types = all.map((e) => e.type)

    expect(types).toContain('test-node-3')
    expect(types).toContain('test-node-4')
  })

  it('registered executor can be invoked', async () => {
    const executor = createMockExecutor('test-node-5')
    registerNodeExecutor(executor)

    const retrieved = getNodeExecutor('test-node-5')
    expect(retrieved).toBeDefined()

    // Create minimal context for testing
    const { MemoryManager } = await import('@/lib/execution/memory-manager')
    const { AuditLog } = await import('@/lib/execution/audit-log')
    const { ExecutionEventEmitter } = await import('@/lib/execution/events')

    const input: NodeExecutionInput = {
      nodeId: 'node-1',
      nodeType: 'test-node-5',
      nodeData: {},
      inputs: [],
      context: {
        workflowMemory: new MemoryManager('workflow'),
        auditLog: new AuditLog(),
        emitter: new ExecutionEventEmitter(),
        executionControl: { current: 'idle' },
        loopIterations: {},
        loopExited: {},
      },
    }

    const result = await retrieved!.execute(input)
    expect(result.output).toBe('executed test-node-5')
  })
})
