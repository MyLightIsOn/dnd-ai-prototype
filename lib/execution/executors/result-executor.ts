import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';

const resultExecutor: NodeExecutor = {
  type: 'result',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const { context, inputs } = input;

    const finalOutput = inputs.length > 0
      ? inputs[inputs.length - 1]
      : '<empty>';

    const finalText = `📦 Final: ${finalOutput}`;

    context.emitter.emit({ type: 'log:append', message: finalText });

    return {
      output: finalText,
      dataPatch: { preview: finalOutput },
    };
  },
};

registerNodeExecutor(resultExecutor);
