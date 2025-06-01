import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLMProvider, type LLMMessage, type LLMRequestConfig } from '../base';
import type { LLMConfig, ChatMode, AIResponse } from '../../schemas';

export class GoogleProvider extends BaseLLMProvider {
  private client: GoogleGenerativeAI | null = null;

  constructor(config: LLMConfig) {
    super(config);
    if (config.apiKey) {
      this.client = new GoogleGenerativeAI(config.apiKey);
    }
  }

  getProviderId(): string {
    return 'google';
  }

  getProviderName(): string {
    return 'Google (Gemini)';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.client);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Google client not initialized. Please check your API key.' };
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model || 'gemini-pro',
      });

      await model.generateContent('Hello');
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Google API';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Google doesn't provide a models list endpoint, so we return known models
    return ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  }

  async generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Google client not initialized');
    }

    const systemPrompt = this.buildSystemPrompt(mode);
    const model = this.client.getGenerativeModel({
      model: requestConfig?.model || this.config.model || 'gemini-pro',
      generationConfig: {
        temperature: requestConfig?.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: requestConfig?.maxTokens || this.config.maxTokens || 4000,
      },
    });

    // Combine system prompt with conversation
    const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText}\n\nAssistant:`;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No response content from Google API');
      }

      return this.parseResponse(content, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Google API error:', error);

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

export const createGoogleProvider = async (config: LLMConfig): Promise<GoogleProvider> => {
  return new GoogleProvider(config);
};
