import OpenAI from "openai";
import { BaseLLMProvider, type LLMMessage, type LLMRequestConfig } from "../base";
import type { LLMConfig, ChatMode, AIResponse } from "../../schemas";

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI | null = null;

  constructor(config: LLMConfig) {
    super(config);
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl && { baseURL: config.baseUrl }),
      });
    }
  }

  getProviderId(): string {
    return "openai";
  }

  getProviderName(): string {
    return "OpenAI";
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.client);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: "OpenAI client not initialized. Please check your API key." };
    }

    try {
      await this.client.models.list();
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to OpenAI API";
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.models.list();
      return response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.error("Failed to fetch OpenAI models:", error);
      return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"];
    }
  }

  async generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized");
    }

    const systemPrompt = this.buildSystemPrompt(mode);
    const messagesWithSystem: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];
    

    try {
      const response = await this.client.chat.completions.create({
        model: requestConfig?.model || this.config.model || "gpt-3.5-turbo",
        messages: messagesWithSystem,
        max_tokens: requestConfig?.maxTokens || this.config.maxTokens || 4000,
        temperature: requestConfig?.temperature ?? this.config.temperature ?? 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      return this.parseResponse(content, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("OpenAI API error:", error);
      
      if (mode === "ticket") {
        return {
          type: "tickets",
          tickets: [],
          reasoning: `Error generating tickets: ${errorMessage}`,
          needsClarification: true,
          clarificationQuestions: ["Could you please try again with a different description?"]
        };
      } else {
        return {
          type: "assistant",
          content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
          suggestions: ["Try rephrasing your question", "Check if the service is available"]
        };
      }
    }
  }
}

export const createOpenAIProvider = async (config: LLMConfig): Promise<OpenAIProvider> => {
  return new OpenAIProvider(config);
}; 