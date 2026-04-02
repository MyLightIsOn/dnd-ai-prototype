import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { PromptData } from '@/types/prompt';

const promptExecutor: NodeExecutor = {
  type: 'prompt',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as PromptData;
    const text = data.text || '';
    const name = data.name || 'Prompt';
    input.context.emitter.emit({
      type: 'log:append',
      message: `💬 ${name}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
    });
    return { output: text };
  },
};

registerNodeExecutor(promptExecutor);
