import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { LoopData } from '@/types/loop';
import { shouldBreakLoop } from '../loop-evaluator';

const loopExecutor: NodeExecutor = {
  type: 'loop',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as unknown as LoopData;
    const { context, inputs, nodeId } = input;

    const loopInput = inputs.join('\n\n');

    // Use local iteration counter (context.loopIterations is the mutable ref)
    const newIteration = (context.loopIterations[nodeId] || 0) + 1;
    context.loopIterations[nodeId] = newIteration;

    const maxIterations = data.maxIterations || 10;
    const reachedMaxIterations = newIteration >= maxIterations;

    const shouldBreak = reachedMaxIterations ||
      await shouldBreakLoop(data.breakCondition, loopInput, newIteration);

    const executedExit = shouldBreak;
    // Record in local map so active-edge filtering can use fresh state
    context.loopExited[nodeId] = executedExit;

    if (executedExit) {
      const reason = reachedMaxIterations
        ? `reached max iterations (${maxIterations})`
        : 'break condition met';
      context.emitter.emit({
        type: 'log:append',
        message: `🔁 ${data.name || 'Loop'}: Iteration ${newIteration} - Exiting (${reason})`,
      });
    } else {
      context.emitter.emit({
        type: 'log:append',
        message: `🔁 ${data.name || 'Loop'}: Iteration ${newIteration} - Continuing`,
      });
    }

    return {
      output: loopInput,
      dataPatch: { currentIteration: newIteration, executedExit },
    };
  },
};

registerNodeExecutor(loopExecutor);
