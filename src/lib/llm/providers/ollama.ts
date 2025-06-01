import axios from 'axios';
import { BaseLLMProvider, type LLMMessage, type LLMRequestConfig } from '../base';
import type { LLMConfig, ChatMode, AIResponse } from '../../schemas';

export class OllamaProvider extends BaseLLMProvider {
  private baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  getProviderId(): string {
    return 'ollama';
  }

  getProviderName(): string {
    return 'Ollama (Local)';
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/version`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // First, test if Ollama server is running
      const versionResponse = await axios.get(`${this.baseUrl}/api/version`, {
        timeout: 5000,
      });

      if (versionResponse.status !== 200) {
        return { success: false, error: 'Unexpected response from Ollama server' };
      }

      // Then, check if the specified model exists
      const modelName = this.config.model || 'mistral:latest';
      try {
        const modelsResponse = await axios.get(`${this.baseUrl}/api/tags`, {
          timeout: 10000,
        });

        if (modelsResponse.data?.models) {
          const availableModels = modelsResponse.data.models.map(
            (model: { name: string }) => model.name
          );

          if (!availableModels.includes(modelName)) {
            return {
              success: false,
              error: `Model "${modelName}" not found. Available models: ${availableModels.join(', ')}`,
            };
          }
        }
      } catch (modelsError) {
        // If we can't fetch models, just warn but don't fail the connection test
        console.warn('Could not fetch available models:', modelsError);
        return {
          success: true,
          error: `Ollama server is running, but couldn't verify model "${modelName}". Please ensure it's installed.`,
        };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Ollama server';
      return {
        success: false,
        error: `Cannot connect to Ollama at ${this.baseUrl}. ${errorMessage}`,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 10000,
      });

      if (response.data?.models) {
        return response.data.models.map((model: { name: string }) => model.name);
      }

      return ['mistral:latest', 'llama2', 'codellama', 'neural-chat'];
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return ['mistral:latest', 'llama2', 'codellama', 'neural-chat'];
    }
  }

  async generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(mode);

    // Build the conversation context
    const conversationText = [{ role: 'system', content: systemPrompt }, ...messages]
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `${conversationText}\n\nassistant:`;

    try {
      const requestBody = {
        model: requestConfig?.model || this.config.model || 'mistral:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: requestConfig?.temperature ?? this.config.temperature ?? 0.7,
          num_predict: requestConfig?.maxTokens || this.config.maxTokens || 4000,
        },
      };

      const response = await axios.post(`${this.baseUrl}/api/generate`, requestBody, {
        timeout: 120000, // 2 minutes timeout for local models
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const content = response.data?.response;
      if (!content) {
        throw new Error('No response content from Ollama');
      }

      return this.parseResponse(content, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Ollama API error:', error);

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
          suggestions: [
            'Try rephrasing your question',
            'Check if Ollama is running',
            'Verify the model is installed',
          ],
        };
      }
    }
  }
}

export const createOllamaProvider = async (config: LLMConfig): Promise<OllamaProvider> => {
  return new OllamaProvider(config);
};
