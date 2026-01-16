/**
 * Ollama provider implementation for local LLM inference.
 * Dynamically discovers models from a running Ollama instance.
 * No API key required - runs on localhost:11434
 */

import type {
  ModelProvider,
  ModelConfig,
  CompletionParams,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
  Message,
} from "./base";
import { registerProvider } from "./registry";

const OLLAMA_BASE_URL = "http://localhost:11434";

/**
 * Response from Ollama's /api/tags endpoint
 */
interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
      parent_model?: string;
      format?: string;
      family?: string;
      families?: string[];
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

/**
 * Response from Ollama's /api/generate endpoint
 */
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Response from Ollama's /api/chat endpoint
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama provider for local LLM inference.
 * Dynamically discovers models from running Ollama instance.
 */
export class OllamaProvider implements ModelProvider {
  name = "ollama";
  models: ModelConfig[] = [];
  supportsStreaming = true;

  private initialized = false;
  private initializationError: string | null = null;

  constructor() {
    // Initialize models asynchronously
    this.initializeModels().catch((error) => {
      this.initializationError = error.message;
      console.warn("Failed to initialize Ollama models:", error.message);
    });
  }

  /**
   * Fetch available models from Ollama API and transform to ModelConfig format.
   */
  private async initializeModels(): Promise<void> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API returned status ${response.status}: ${response.statusText}`
        );
      }

      const data: OllamaTagsResponse = await response.json();

      this.models = data.models.map((model) => ({
        id: model.name,
        displayName: this.formatDisplayName(model.name),
        provider: "ollama",
        contextWindow: this.estimateContextWindow(model),
        inputPricePerMillion: 0.0,
        outputPricePerMillion: 0.0,
      }));

      this.initialized = true;
    } catch (error) {
      // If fetch fails, Ollama is likely not running
      if (error instanceof Error) {
        if (
          error.name === "TypeError" &&
          error.message.includes("fetch failed")
        ) {
          throw new Error(
            "Ollama is not running. Please start Ollama with 'ollama serve' or install from https://ollama.ai"
          );
        }
        throw error;
      }
      throw new Error("Failed to connect to Ollama");
    }
  }

  /**
   * Format model name for display.
   * Example: "llama3.2" -> "Llama 3.2"
   */
  private formatDisplayName(modelName: string): string {
    // Handle version numbers and colons
    const parts = modelName.split(":");
    const baseName = parts[0];

    // Capitalize first letter and add spaces before numbers
    return baseName
      .replace(/^([a-z])/, (match) => match.toUpperCase())
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])\.([0-9])/g, "$1.$2");
  }

  /**
   * Estimate context window based on model details.
   * Most modern models support at least 4k, many support 32k+
   */
  private estimateContextWindow(model: OllamaTagsResponse["models"][0]): number {
    const name = model.name.toLowerCase();

    // Known context windows for popular models
    if (name.includes("llama3")) return 128000;
    if (name.includes("mistral")) return 32000;
    if (name.includes("qwen")) return 32000;
    if (name.includes("gemma")) return 8192;
    if (name.includes("phi")) return 4096;
    if (name.includes("codellama")) return 16384;

    // Default to 4k for unknown models
    return 4096;
  }

  /**
   * Wait for initialization to complete.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Wait up to 10 seconds for initialization
    const maxWait = 10000;
    const startTime = Date.now();

    while (!this.initialized && Date.now() - startTime < maxWait) {
      if (this.initializationError) {
        throw new Error(this.initializationError);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.initialized) {
      throw new Error("Ollama initialization timed out");
    }
  }

  /**
   * Request a non-streaming completion from Ollama.
   */
  async complete(params: CompletionParams): Promise<CompletionResponse> {
    await this.ensureInitialized();

    // Convert messages to chat format
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: false,
        options: {
          temperature: params.temperature,
          num_predict: params.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${errorText}`
      );
    }

    const data: OllamaChatResponse = await response.json();

    // Calculate token usage from Ollama's metrics
    const usage: TokenUsage = {
      inputTokens: data.prompt_eval_count || 0,
      outputTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    };

    return {
      content: data.message.content,
      usage,
      model: data.model,
    };
  }

  /**
   * Request a streaming completion from Ollama.
   */
  async *stream(params: CompletionParams): AsyncIterator<StreamChunk> {
    await this.ensureInitialized();

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
        options: {
          temperature: params.temperature,
          num_predict: params.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data: OllamaChatResponse = JSON.parse(line);

            // Yield the chunk
            const chunk: StreamChunk = {
              delta: data.message?.content || "",
              done: data.done,
            };

            // Add usage on final chunk
            if (data.done) {
              chunk.usage = {
                inputTokens: data.prompt_eval_count || 0,
                outputTokens: data.eval_count || 0,
                totalTokens:
                  (data.prompt_eval_count || 0) + (data.eval_count || 0),
              };
            }

            yield chunk;

            if (data.done) return;
          } catch (error) {
            console.warn("Failed to parse Ollama stream chunk:", line, error);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validate API key (Ollama doesn't require one, so check if service is running).
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    // Ollama doesn't use API keys
    // Instead, check if the service is reachable
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Calculate cost (always $0 for local Ollama models).
   */
  calculateCost(modelId: string, tokens: TokenUsage): number {
    return 0.0;
  }
}

// Auto-register the provider
const ollamaProvider = new OllamaProvider();
registerProvider(ollamaProvider);

export default ollamaProvider;
