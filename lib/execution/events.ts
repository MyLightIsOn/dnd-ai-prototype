export type ReviewRequest = {
  content: string;
  reviewers: string[];
  approvalRule: string;
};

export type ExecutionEvent =
  | { type: 'node:start'; nodeId: string }
  | { type: 'node:complete'; nodeId: string; output: string }
  | { type: 'node:error'; nodeId: string; error: string }
  | { type: 'log:append'; message: string }
  | { type: 'log:update'; index: number; message: string }
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

  on(type: ExecutionEvent['type'], handler: (event: ExecutionEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
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
