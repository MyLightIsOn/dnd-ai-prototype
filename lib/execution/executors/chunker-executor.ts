import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { ChunkerData } from '@/types/chunker';
import { chunkDocument } from '@/lib/document/chunker';

const chunkerExecutor: NodeExecutor = {
  type: 'chunker',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as unknown as ChunkerData;
    const { context, inputs } = input;

    const parentContent = inputs[0] ?? '';
    const chunks = chunkDocument(
      parentContent,
      data.strategy || 'fixed',
      data.chunkSize || 500,
      data.overlap || 50
    );

    const output = chunks.join('\n\n---CHUNK---\n\n');

    context.emitter.emit({
      type: 'log:append',
      message: `📑 ${data.name || 'Chunker'}: Created ${chunks.length} chunks`,
    });

    return {
      output,
      dataPatch: { chunks },
    };
  },
};

registerNodeExecutor(chunkerExecutor);
