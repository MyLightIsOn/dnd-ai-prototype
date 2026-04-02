import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { MemoryData } from '@/types/memory';
import { globalMemoryInstance } from '../memory-manager';

const memoryExecutor: NodeExecutor = {
  type: 'memory',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as unknown as MemoryData;
    const { context, inputs } = input;

    const memInput = inputs.join('\n\n');

    // Determine correct manager based on scope
    const manager = data.scope === 'global' ? globalMemoryInstance : context.workflowMemory;

    // Try to parse input as JSON; store each key-value pair, otherwise store under node name
    let storedCount = 0;
    try {
      const parsed = JSON.parse(memInput);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          manager.set(k, v);
          storedCount++;
        }
      } else {
        manager.set(data.name, memInput);
        storedCount = 1;
      }
    } catch {
      manager.set(data.name, memInput);
      storedCount = 1;
    }

    context.emitter.emit({
      type: 'log:append',
      message: `🧠 Memory [${data.name || 'Memory'}]: stored ${storedCount} key(s)`,
    });

    // Reflect stored keys in dataPatch for node data update
    const storedKeys = Object.keys(manager.getAll());

    return {
      output: memInput,
      dataPatch: { keys: storedKeys },
    };
  },
};

registerNodeExecutor(memoryExecutor);
