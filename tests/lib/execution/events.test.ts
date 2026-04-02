import { describe, it, expect } from 'vitest'
import { ExecutionEventEmitter, type ExecutionEvent } from '@/lib/execution/events'

describe('ExecutionEventEmitter', () => {
  it('subscribes to an event and receives it when emitted', () => {
    const emitter = new ExecutionEventEmitter()
    const received: string[] = []

    emitter.on('node:start', (event) => {
      received.push(event.nodeId)
    })

    emitter.emit({ type: 'node:start', nodeId: 'node-1' })
    expect(received).toEqual(['node-1'])
  })

  it('unsubscribes via returned function stops receiving events', () => {
    const emitter = new ExecutionEventEmitter()
    const received: string[] = []

    const unsubscribe = emitter.on('node:complete', (event) => {
      received.push(event.nodeId)
    })

    emitter.emit({ type: 'node:complete', nodeId: 'node-1', output: 'result1' })
    expect(received).toEqual(['node-1'])

    unsubscribe()

    emitter.emit({ type: 'node:complete', nodeId: 'node-2', output: 'result2' })
    expect(received).toEqual(['node-1']) // unchanged
  })

  it('emits to multiple listeners of same type', () => {
    const emitter = new ExecutionEventEmitter()
    const received1: string[] = []
    const received2: string[] = []

    emitter.on('node:error', (event) => {
      received1.push(event.nodeId)
    })

    emitter.on('node:error', (event) => {
      received2.push(event.error)
    })

    emitter.emit({ type: 'node:error', nodeId: 'node-1', error: 'failed' })

    expect(received1).toEqual(['node-1'])
    expect(received2).toEqual(['failed'])
  })

  it('removeAllListeners clears all subscriptions', () => {
    const emitter = new ExecutionEventEmitter()
    const received: Array<{ type: string; count: number }> = []

    emitter.on('node:start', () => {
      received.push({ type: 'start', count: received.length + 1 })
    })

    emitter.on('node:complete', () => {
      received.push({ type: 'complete', count: received.length + 1 })
    })

    emitter.emit({ type: 'node:start', nodeId: 'node-1' })
    expect(received.length).toBe(1)

    emitter.removeAllListeners()

    emitter.emit({ type: 'node:start', nodeId: 'node-2' })
    emitter.emit({ type: 'node:complete', nodeId: 'node-3', output: 'result' })

    expect(received.length).toBe(1) // unchanged after removeAllListeners
  })

  it('emitting an event type with no listeners does not throw', () => {
    const emitter = new ExecutionEventEmitter()

    expect(() => {
      emitter.emit({ type: 'node:start', nodeId: 'node-1' } as ExecutionEvent)
    }).not.toThrow()

    expect(() => {
      emitter.emit({ type: 'execution:done' } as ExecutionEvent)
    }).not.toThrow()
  })
})
