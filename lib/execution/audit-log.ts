function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  type: 'human-review' | 'router-decision' | 'memory-write';
  decision?: 'approved' | 'rejected' | 'edited';
  beforeContent?: string;
  afterContent?: string;
  reviewer?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLog {
  private entries: AuditEntry[] = [];

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    this.entries.push({ ...entry, id: generateId(), timestamp: Date.now() });
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntriesByNode(nodeId: string): AuditEntry[] {
    return this.entries.filter((e) => e.nodeId === nodeId);
  }

  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
  }
}
