export interface MemoryChange {
  timestamp: number;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  operation: 'set' | 'delete';
}

export class MemoryManager {
  private scope: 'workflow' | 'global';
  // Both maps are retained so a single MemoryManager instance can serve either
  // scope without re-instantiation. The active store is selected by getStore().
  // This lets callers (e.g. globalMemoryInstance) share one class while keeping
  // workflow-scoped and global-scoped data isolated.
  private workflowMemory: Map<string, unknown>;
  private globalMemory: Map<string, unknown>;
  private history: MemoryChange[];
  private listeners: Array<(change: MemoryChange) => void>;

  constructor(scope: 'workflow' | 'global' = 'workflow') {
    this.scope = scope;
    this.workflowMemory = new Map();
    this.globalMemory = new Map();
    this.history = [];
    this.listeners = [];
  }

  private getStore(): Map<string, unknown> {
    return this.scope === 'global' ? this.globalMemory : this.workflowMemory;
  }

  private notifyListeners(change: MemoryChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  get(key: string): unknown {
    return this.getStore().get(key);
  }

  set(key: string, value: unknown): void {
    const store = this.getStore();
    const oldValue = store.get(key);
    store.set(key, value);

    const change: MemoryChange = {
      timestamp: Date.now(),
      key,
      oldValue,
      newValue: value,
      operation: 'set',
    };

    this.history.push(change);
    this.notifyListeners(change);
  }

  delete(key: string): void {
    const store = this.getStore();
    if (!store.has(key)) return; // skip no-ops: avoid phantom history entries
    const oldValue = store.get(key);
    store.delete(key);

    const change: MemoryChange = {
      timestamp: Date.now(),
      key,
      oldValue,
      newValue: undefined,
      operation: 'delete',
    };

    this.history.push(change);
    this.notifyListeners(change);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.getStore());
  }

  getHistory(): MemoryChange[] {
    return [...this.history];
  }

  getChangesSince(timestamp: number): MemoryChange[] {
    return this.history.filter((change) => change.timestamp >= timestamp);
  }

  onChange(listener: (change: MemoryChange) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  clear(): void {
    this.getStore().clear();
    this.history = [];
  }

  clearAll(): void {
    this.workflowMemory.clear();
    this.globalMemory.clear();
    this.history = [];
  }

  getScope(): 'workflow' | 'global' {
    return this.scope;
  }

  dispose(): void {
    this.listeners = [];
  }
}

export const globalMemoryInstance = new MemoryManager('global');
