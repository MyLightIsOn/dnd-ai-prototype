export interface MemoryChange {
  timestamp: number;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  operation: 'set' | 'delete';
}

export class MemoryManager {
  private scope: 'workflow' | 'global';
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
    const store = this.getStore();
    const result: Record<string, unknown> = {};
    for (const [key, value] of store.entries()) {
      result[key] = value;
    }
    return result;
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
    this.workflowMemory.clear();
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
}

export const globalMemoryInstance = new MemoryManager('global');
