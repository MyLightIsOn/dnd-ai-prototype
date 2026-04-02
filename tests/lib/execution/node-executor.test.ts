import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerNodeExecutor,
  getNodeExecutor,
  getAllNodeExecutors,
  clearAllExecutors,
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
    clearAllExecutors();
  })

  it('registerNodeExecutor stores an executor', () => {
    const executor = createMockExecutor('prompt')
    registerNodeExecutor(executor)
    expect(getNodeExecutor('prompt')).toBe(executor)
  })

  it('getNodeExecutor retrieves by type', () => {
    const executor = createMockExecutor('agent')
    registerNodeExecutor(executor)
    const retrieved = getNodeExecutor('agent')
    expect(retrieved).toBe(executor)
    expect(retrieved?.type).toBe('agent')
  })

  it('getNodeExecutor returns undefined for unknown type', () => {
    const result = getNodeExecutor('unknown')
    expect(result).toBeUndefined()
  })

  it('getAllNodeExecutors returns all registered executors', () => {
    const executor1 = createMockExecutor('document')
    const executor2 = createMockExecutor('tool')

    registerNodeExecutor(executor1)
    registerNodeExecutor(executor2)

    const all = getAllNodeExecutors()
    const types = all.map((e) => e.type)

    expect(types).toContain('document')
    expect(types).toContain('tool')
  })

  it('registered executor can be invoked', async () => {
    const executor = createMockExecutor('chunker')
    registerNodeExecutor(executor)

    const retrieved = getNodeExecutor('chunker')
    expect(retrieved).toBeDefined()

    // Create minimal context for testing
    const { MemoryManager } = await import('@/lib/execution/memory-manager')
    const { AuditLog } = await import('@/lib/execution/audit-log')
    const { ExecutionEventEmitter } = await import('@/lib/execution/events')

    const input: NodeExecutionInput = {
      nodeId: 'node-1',
      nodeType: 'chunker',
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
    expect(result.output).toBe('executed chunker')
  })
})
