import { GoogleGenerativeAI, type ModelParams, SchemaType, type Schema } from '@google/generative-ai';
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

    const systemPrompt = this.buildSystemPrompt(mode, requestConfig?.tools);

    // Convert tools to Google function calling format
    const tools = requestConfig?.tools?.map(tool => ({
      functionDeclarations: [{
        name: tool.name,
        description: tool.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: tool.parameters.properties as Record<string, Schema>,
          required: tool.parameters.required
        }
      }]
    }));

    const modelConfig: ModelParams = {
      model: requestConfig?.model || this.config.model || 'gemini-pro',
      generationConfig: {
        temperature: requestConfig?.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: requestConfig?.maxTokens || this.config.maxTokens || 4000,
      },
    };

    // Add tools if available
    if (tools && tools.length > 0) {
      modelConfig.tools = tools;
    }

    const model = this.client.getGenerativeModel(modelConfig);

    // Build conversation for Gemini
    const conversationHistory = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I will help you with your requests and use available tools when appropriate.' }] },
    ];

    // Add conversation messages
    for (const msg of messages) {
      if (msg.role === 'user') {
        conversationHistory.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        conversationHistory.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    try {
      const chat = model.startChat({ history: conversationHistory.slice(0, -1) });
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;

      // Check if the response includes function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0 && requestConfig?.toolExecutor) {
        // Execute the function calls
        const toolResults = [];
        for (const call of functionCalls) {
          try {
            const toolResult = await requestConfig.toolExecutor(call.name, call.args as Record<string, unknown>);
            toolResults.push({
              name: call.name,
              result: toolResult
            });
          } catch (error) {
            console.error(`Tool execution error for ${call.name}:`, error);
            toolResults.push({
              name: call.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Send tool results back to the model
        const toolResultParts = toolResults.map(tr => {
          let responseData = tr.result || { error: tr.error };
          
          // If the result is a JSON string containing an array (like repositories), 
          // summarize it for Gemini since large JSON objects can cause issues
          if (typeof responseData === 'string') {
            try {
              const parsed = JSON.parse(responseData);
              if (Array.isArray(parsed)) {
                // For repository lists, show first batch but include all names for reference
                if (tr.name === 'list_repositories') {
                  const allRepoNames = parsed.map(repo => repo.name);
                  responseData = {
                    repositories_count: parsed.length,
                    all_repository_names: allRepoNames,
                    detailed_repositories: parsed.slice(0, 10).map(repo => ({
                      name: repo.name,
                      full_name: repo.full_name,
                      description: repo.description || "No description available.",
                      language: repo.language,
                      stars: repo.stars,
                      updated_at: repo.updated_at
                    })),
                    message: `Found ${parsed.length} repositories. Showing first 10 detailed. All repository names provided for reference.`
                  };
                } else {
                  responseData = { count: parsed.length, data: parsed.slice(0, 3) };
                }
              } else {
                responseData = parsed;
              }
            } catch {
              // If parsing fails, wrap the string in an object
              responseData = { content: responseData };
            }
          }
          
          return {
            functionResponse: {
              name: tr.name,
              response: responseData
            }
          };
        });

        const finalResult = await chat.sendMessage(toolResultParts);
        const finalResponse = finalResult.response;
        const content = finalResponse.text();

        if (!content) {
          throw new Error('No response content from Google API after tool execution');
        }

        return this.parseResponse(content, mode);
      }

      // No function calls, process normally
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
