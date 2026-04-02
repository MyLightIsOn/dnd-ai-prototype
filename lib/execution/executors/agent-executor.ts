import { registerNodeExecutor } from '../node-executor';
import type { NodeExecutor, NodeExecutionInput, NodeExecutionResult } from '../node-executor';
import type { AgentData } from '@/types/agent';
import { getProvider } from '@/lib/providers';
import { getApiKey } from '@/lib/storage/api-keys';
import type { Message } from '@/lib/providers/base';

function buildMessages(agentData: AgentData, inputs: string[]): Message[] {
  const messages: Message[] = [];
  if (inputs.length > 0) {
    messages.push({
      role: 'user',
      content: `Context:\n\n${inputs.join('\n\n---\n\n')}`,
    });
  }
  if (agentData.prompt) {
    messages.push({ role: 'user', content: agentData.prompt });
  }
  return messages;
}

export const agentExecutor: NodeExecutor = {
  type: 'agent',
  async execute(input: NodeExecutionInput): Promise<NodeExecutionResult> {
    const data = input.nodeData as AgentData;
    const { context, inputs, nodeId } = input;
    const mode = data.mode || 'mock';
    const agentName = data.name || 'Agent';
    const modelStr = context.options?.providerOverride ?? data.model ?? 'model';

    if (mode === 'mock') {
      const output = `This is a mock response from ${agentName}. In live mode, this would be the actual LLM output based on the prompt: "${data.prompt || 'no prompt'}"`;
      context.emitter.emit({
        type: 'log:append',
        message: `🤖 ${agentName} (${modelStr}) [MOCK]\n${output}`,
      });
      return { output };
    }

    // Live mode: call real LLM provider
    const resolvedModel = context.options?.providerOverride ?? data.model;
    if (!resolvedModel || !resolvedModel.includes('/')) {
      throw new Error(`Invalid model format. Expected "provider/model-id"`);
    }

    const [providerName, modelId] = resolvedModel.split('/', 2);
    const provider = getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not found`);
    }

    const apiKey = getApiKey(providerName);
    if (!apiKey) {
      throw new Error(`No API key found for provider "${providerName}"`);
    }

    const messages = buildMessages(data, inputs);
    const streaming = data.streaming || false;

    if (streaming && provider.supportsStreaming) {
      let accumulatedOutput = '';

      // Emit initial log entry
      context.emitter.emit({
        type: 'log:append',
        message: `🤖 ${agentName} (${modelStr})\n⏳ Streaming...`,
      });

      const streamIterator = provider.stream({
        model: modelId,
        messages,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        apiKey,
      });

      const stream = {
        [Symbol.asyncIterator]() {
          return streamIterator;
        },
      };

      let tokenData: { promptTokens: number; completionTokens: number; costUsd: number } | undefined;

      for await (const chunk of stream) {
        accumulatedOutput += chunk.delta;

        context.emitter.emit({
          type: 'log:update',
          index: 'last',
          message: `🤖 ${agentName} (${modelStr})\n${accumulatedOutput}${chunk.done ? '' : '▌'}`,
        });

        if (chunk.done && chunk.usage) {
          const cost = provider.calculateCost(modelId, chunk.usage);
          context.emitter.emit({
            type: 'log:update',
            index: 'last',
            message: `🤖 ${agentName} (${modelStr})\n${accumulatedOutput}\n💰 Cost: $${cost.toFixed(6)} | Tokens: ${chunk.usage.totalTokens}`,
          });
          tokenData = {
            promptTokens: chunk.usage.inputTokens ?? 0,
            completionTokens: chunk.usage.outputTokens ?? 0,
            costUsd: cost,
          };
        }
      }

      // NOTE: tokenData uses a nested { [nodeId]: {...} } shape instead of flat keys.
      // The Phase 2 event-bridge must handle this specially rather than merging it
      // directly into node.data. This allows the runner to accumulate per-node stats.
      const dataPatch: Record<string, unknown> = {};
      if (tokenData) {
        dataPatch.tokenData = { [nodeId]: tokenData };
      }

      return { output: accumulatedOutput, dataPatch };
    } else {
      // Non-streaming mode
      context.emitter.emit({
        type: 'log:append',
        message: `🤖 ${agentName} (${modelStr})\n⏳ Waiting for response...`,
      });

      const response = await provider.complete({
        model: modelId,
        messages,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        apiKey,
      });

      const cost = provider.calculateCost(modelId, response.usage);
      const logText = `🤖 ${agentName} (${modelStr})\n${response.content}\n💰 Cost: $${cost.toFixed(6)} | Tokens: ${response.usage.totalTokens}`;

      context.emitter.emit({ type: 'log:update', index: -1, message: logText });

      const tokenData = {
        promptTokens: response.usage.inputTokens ?? 0,
        completionTokens: response.usage.outputTokens ?? 0,
        costUsd: cost,
      };

      return {
        output: response.content,
        dataPatch: { tokenData: { [nodeId]: tokenData } },
      };
    }
  },
};

registerNodeExecutor(agentExecutor);
