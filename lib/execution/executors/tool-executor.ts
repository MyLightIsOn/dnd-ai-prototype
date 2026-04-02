import '@/lib/tools/index'; // register all tools (side-effect import)
import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { ToolData } from '@/types/tool';
import { getTool } from '@/lib/tools/registry';

const toolExecutor: NodeExecutor = {
  type: 'tool',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as ToolData;
    const { context, inputs } = input;
    const toolInput = inputs.join('\n');
    const kind = (data.kind ?? 'web-search') as string;
    const tool = getTool(kind);

    context.emitter.emit({
      type: 'log:append',
      message: `🔧 ${data.name || 'Tool'} [${kind}] — running…`,
    });

    if (!tool) {
      throw new Error(`Unknown tool kind: ${kind}`);
    }

    const result = await tool.execute(toolInput, data.config ?? {});

    if (!result.success) {
      throw new Error(result.error ?? 'Tool execution failed');
    }

    const output = result.output;

    context.emitter.emit({
      type: 'log:update',
      index: 'last',
      message: `🔧 ${data.name || 'Tool'} [${kind}]\n${output.slice(0, 200)}${output.length > 200 ? '…' : ''}`,
    });

    return {
      output,
      dataPatch: { lastResult: output },
    };
  },
};

registerNodeExecutor(toolExecutor);
