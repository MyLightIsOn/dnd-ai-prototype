import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { RouterData } from '@/types/router';
import { evaluateRoutes } from '../route-evaluator';
import type { LLMJudgeResult } from '../route-evaluator';

const routerExecutor: NodeExecutor = {
  type: 'router',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as unknown as RouterData;
    const { context, inputs } = input;

    if (inputs.length === 0) {
      throw new Error('No input to router');
    }

    const routerInput = inputs.join('\n\n');

    let llmJudgeResult: LLMJudgeResult | undefined;

    const selectedRouteId = await evaluateRoutes(routerInput, data, (result) => {
      llmJudgeResult = result;
    });

    let executedRoute: string;

    if (selectedRouteId) {
      executedRoute = selectedRouteId;
      const selectedRoute = data.routes?.find(r => r.id === selectedRouteId);
      let logMessage = `🔀 ${data.name || 'Router'}: Routed to "${selectedRoute?.label || 'Unknown'}"`;
      if (llmJudgeResult) {
        logMessage += `\n💰 LLM Judge Cost: $${llmJudgeResult.cost.toFixed(6)} | Tokens: ${llmJudgeResult.tokens} | Decision: "${llmJudgeResult.decision}"`;
      }
      context.emitter.emit({ type: 'log:append', message: logMessage });
    } else if (data.defaultRoute) {
      executedRoute = 'default';
      let logMessage = `⚠️ ${data.name || 'Router'}: No routes matched, using default route`;
      if (llmJudgeResult) {
        logMessage += `\n💰 LLM Judge Cost: $${llmJudgeResult.cost.toFixed(6)} | Tokens: ${llmJudgeResult.tokens}`;
      }
      context.emitter.emit({ type: 'log:append', message: logMessage });
    } else {
      throw new Error(
        `Router "${data.name || 'Router'}": No routes matched and no default route configured. ` +
        `Either add a default route or adjust route conditions to match the input.`
      );
    }

    return {
      output: routerInput,
      dataPatch: { executedRoute },
    };
  },
};

registerNodeExecutor(routerExecutor);
