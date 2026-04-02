import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { DocumentData } from '@/types/document';

const documentExecutor: NodeExecutor = {
  type: 'document',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as DocumentData;
    const content = data.content || '';
    const name = data.name || 'Document';
    const fileName = data.fileName || 'No file';
    input.context.emitter.emit({
      type: 'log:append',
      message: `📄 ${name}: ${fileName} (${content.length} chars)`,
    });
    return { output: content };
  },
};

registerNodeExecutor(documentExecutor);
