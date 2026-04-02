export type ReviewRequest = {
  reviewerLabel: string;
  nodeName: string;
  instructions?: string;
  content: string;
  mode: 'approve-reject' | 'edit-and-approve';
};

export type ExecutionEvent =
  | { type: 'node:start'; nodeId: string }
  | { type: 'node:complete'; nodeId: string; output: string }
  | { type: 'node:error'; nodeId: string; error: string }
  | { type: 'log:append'; message: string }
  | { type: 'log:update'; index: number | 'last'; message: string }
  | { type: 'node:data'; nodeId: string; patch: Record<string, unknown> }
  | { type: 'edge:style'; updates: Array<{ edgeId: string; style: object; animated: boolean }> }
  | { type: 'execution:start'; levelCount: number }
  | { type: 'execution:done' }
  | { type: 'execution:cancelled' }
  | { type: 'execution:paused' }
  | { type: 'execution:resumed' }
  | { type: 'execution:error'; message: string }
  | { type: 'review:request'; nodeId: string; request: ReviewRequest }
  | { type: 'error-recovery:request'; nodeId: string; nodeName: string; message: string };

export class ExecutionEventEmitter {
  private listeners = new Map<string, Set<(event: ExecutionEvent) => void>>();

  on<T extends ExecutionEvent['type']>(
    type: T,
    handler: (event: Extract<ExecutionEvent, { type: T }>) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as (event: ExecutionEvent) => void);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler as (event: ExecutionEvent) => void);
    };
  }

  emit(event: ExecutionEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
