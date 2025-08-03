import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider, type LLMMessage, type LLMRequestConfig } from '../base';
import type { LLMConfig, ChatMode, AIResponse } from '../../schemas';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic | null = null;

  constructor(config: LLMConfig) {
    super(config);
    if (config.apiKey) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  getProviderId(): string {
    return 'anthropic';
  }

  getProviderName(): string {
    return 'Anthropic (Claude)';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.client);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Anthropic client not initialized. Please check your API key.',
      };
    }

    try {
      // Test with a simple message
      await this.client.messages.create({
        model: this.config.model || 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Anthropic API';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, so we return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }

  async generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const systemPrompt = this.buildSystemPrompt(mode, requestConfig?.tools);

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Prepare tools for Anthropic if available
    const tools = requestConfig?.tools?.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));

    try {
      const requestParams = {
        model: requestConfig?.model || this.config.model || 'claude-3-haiku-20240307',
        max_tokens: requestConfig?.maxTokens || this.config.maxTokens || 4000,
        temperature: requestConfig?.temperature ?? this.config.temperature ?? 0.7,
        system: systemPrompt,
        messages: anthropicMessages,
        ...(tools && tools.length > 0 && { tools })
      };

      const response = await this.client.messages.create(requestParams);

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic');
      }

      return this.parseResponse(content.text, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Anthropic API error:', error);

      if (mode === 'ticket') {
        return {
          type: 'tickets',
          tickets: [],
          reasoning: `Error generating tickets: ${errorMessage}`,
          needsClarification: true,
          clarificationQuestions: ['Could you please try again with a different description?'],
        };
      } else {
        return {
          type: 'assistant',
          content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
          suggestions: ['Try rephrasing your question', 'Check if the service is available'],
        };
      }
    }
  }
}

export const createAnthropicProvider = async (config: LLMConfig): Promise<AnthropicProvider> => {
  return new AnthropicProvider(config);
};
