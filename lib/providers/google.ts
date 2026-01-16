/**
 * Google AI (Gemini) provider implementation.
 * Uses the @google/generative-ai SDK for model access.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ModelProvider,
  CompletionParams,
  CompletionResponse,
  StreamChunk,
  Message,
  TokenUsage,
} from "./base";
import { googleModels, getModelConfig } from "./pricing";
import { registerProvider } from "./registry";

/**
 * Google AI provider using Gemini models.
 */
class GoogleProvider implements ModelProvider {
  name = "google";
  models = googleModels;
  supportsStreaming = true;

  /**
   * Transform our Message format to Google's content format.
   * Google uses a different format with parts array.
   */
  private transformMessages(messages: Message[]) {
    // Google expects a specific format for multi-turn conversations
    // System messages need to be handled separately
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Transform conversation messages to Google format
    const contents = conversationMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    return { systemMessage, contents };
  }

  /**
   * Request a non-streaming completion from Google AI.
   */
  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const model = genAI.getGenerativeModel({ model: params.model });

    const { systemMessage, contents } = this.transformMessages(params.messages);

    try {
      // Build generation config
      const generationConfig: {
        temperature?: number;
        maxOutputTokens?: number;
      } = {};
      if (params.temperature !== undefined) {
        generationConfig.temperature = params.temperature;
      }
      if (params.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = params.maxTokens;
      }

      // Add system instruction if present
      const modelOptions: {
        model: string;
        systemInstruction?: string;
      } = { model: params.model };
      if (systemMessage) {
        modelOptions.systemInstruction = systemMessage.content;
      }

      // Re-create model with system instruction if needed
      const modelToUse = systemMessage
        ? genAI.getGenerativeModel(modelOptions)
        : model;

      const result = await modelToUse.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      // Extract token usage
      const usageMetadata = response.usageMetadata;
      const usage: TokenUsage = {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0,
      };

      return {
        content: text,
        usage,
        model: params.model,
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Request a streaming completion from Google AI.
   */
  async *stream(params: CompletionParams): AsyncIterator<StreamChunk> {
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const { systemMessage, contents } = this.transformMessages(params.messages);

    try {
      // Build generation config
      const generationConfig: {
        temperature?: number;
        maxOutputTokens?: number;
      } = {};
      if (params.temperature !== undefined) {
        generationConfig.temperature = params.temperature;
      }
      if (params.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = params.maxTokens;
      }

      // Add system instruction if present
      const modelOptions: {
        model: string;
        systemInstruction?: string;
      } = { model: params.model };
      if (systemMessage) {
        modelOptions.systemInstruction = systemMessage.content;
      }

      const model = genAI.getGenerativeModel(modelOptions);

      const result = await model.generateContentStream({
        contents,
        generationConfig,
      });

      // Stream the response
      for await (const chunk of result.stream) {
        const text = chunk.text();

        yield {
          delta: text,
          done: false,
        };
      }

      // Get final response for token usage
      const finalResponse = await result.response;
      const usageMetadata = finalResponse.usageMetadata;

      // Yield final chunk with usage data
      yield {
        delta: "",
        done: true,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount || 0,
          outputTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate API key by making a minimal test call.
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Make a minimal test call
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Hi" }] }],
        generationConfig: { maxOutputTokens: 1 },
      });

      return true;
    } catch (error: unknown) {
      // Check if it's an auth error vs other errors
      const err = error as { message?: string; status?: number };
      if (
        err.message?.includes("API key") ||
        err.message?.includes("authentication") ||
        err.status === 401 ||
        err.status === 403
      ) {
        return false;
      }
      // Other errors might indicate a valid key but other issues
      // Be conservative and return false
      return false;
    }
  }

  /**
   * Calculate the cost in USD for the given token usage.
   */
  calculateCost(modelId: string, tokens: TokenUsage): number {
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }

    const inputCost =
      (tokens.inputTokens / 1_000_000) * modelConfig.inputPricePerMillion;
    const outputCost =
      (tokens.outputTokens / 1_000_000) * modelConfig.outputPricePerMillion;

    return inputCost + outputCost;
  }

  /**
   * Transform Google AI errors into user-friendly messages.
   */
  private handleError(error: unknown): Error {
    // Extract error message
    const err = error as { message?: string; status?: number };
    const message = err.message || "Unknown error";
    const status = err.status;

    // Map common error types
    if (status === 401 || status === 403 || message.includes("API key")) {
      return new Error("Invalid Google AI API key");
    }

    if (status === 429 || message.includes("rate limit")) {
      return new Error("Google AI rate limit exceeded. Please try again later.");
    }

    if (status === 503 || message.includes("overloaded")) {
      return new Error("Google AI service temporarily unavailable");
    }

    if (message.includes("network") || message.includes("ECONNREFUSED")) {
      return new Error("Network error connecting to Google AI");
    }

    // Return original error with context
    return new Error(`Google AI error: ${message}`);
  }
}

// Auto-register the provider
const googleProvider = new GoogleProvider();
registerProvider(googleProvider);

export default googleProvider;
