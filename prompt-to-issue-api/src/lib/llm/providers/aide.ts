import { BaseLLMProvider, type LLMMessage, type LLMRequestConfig } from '../base';
import type { LLMConfig, ChatMode, AIResponse } from '../../schemas';
import { getAvailableModels, mapModelId } from '../provider-models';
import { extractToolCalls } from './aide/tool-extractor';
import { extractResponseContent } from './aide/response-extractor';
import { fetchAideAPI } from './aide/fetch-with-retry';
import { executeMultipleToolCalls, type MultiToolCallConfig } from './aide/multi-tool-executor';

export class AideProvider extends BaseLLMProvider {
  private baseUrl: string;
  private useCaseId: string;
  private solmaId: string;
  private authToken: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://aide-llm-api-qa-aide-llm-api-qa.apps.pcrosa01.redk8s.test.ic1.statefarm';
    this.useCaseId = process.env.AIDE_USECASE_ID || 'RITM4953265';
    this.solmaId = process.env.AIDE_SOLMA_ID || '123456';
    this.authToken = config.apiKey || '';
  }

  getProviderId(): string {
    return 'aide';
  }

  getProviderName(): string {
    return 'AIDE (Enterprise Claude)';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.authToken && this.baseUrl && this.useCaseId);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return {
        success: false,
        error: 'AIDE API token not configured. Please check your API key.',
      };
    }

    try {
      // Use the configured model or default
      const modelName = this.config.model || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      const modelId = mapModelId('aide', modelName);
      
      const testPayload = this.buildAidePayload(
        [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
        modelId,
        10
      );

      const response = await fetchAideAPI(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'usecaseid': this.useCaseId,
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `AIDE API error: ${response.status} - ${errorText}`,
        };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to AIDE API';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return getAvailableModels('aide');
  }

  async generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse> {
    if (!this.authToken) {
      throw new Error('AIDE API token not configured');
    }

    const systemPrompt = this.buildSystemPrompt(mode, requestConfig?.tools);
    
    // Convert messages to Anthropic format, filtering out system messages
    // as they'll be handled separately in the system prompt
    const anthropicMessages: Array<{ role: string; content: Array<Record<string, unknown>> }> = [];
    
    // Add system prompt as first user message if not empty
    if (systemPrompt) {
      anthropicMessages.push({
        role: 'user',
        content: [{ type: 'text', text: systemPrompt }],
      });
      anthropicMessages.push({
        role: 'assistant',
        content: [{ type: 'text', text: 'Understood. I\'m ready to help you.' }],
      });
    }

    // Add conversation messages
    messages
      .filter(msg => msg.role !== 'system')
      .forEach(msg => {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: [{ type: 'text', text: msg.content }],
        });
      });

    const modelName = requestConfig?.model || this.config.model || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    const modelId = mapModelId('aide', modelName);
    const maxTokens = requestConfig?.maxTokens || this.config.maxTokens || 4000;

    // Convert tools to Anthropic/Claude format for AIDE
    const tools = requestConfig?.tools?.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));

    const payload = this.buildAidePayload(anthropicMessages, modelId, maxTokens, requestConfig?.temperature, tools);

    try {
      const response = await fetchAideAPI(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'usecaseid': this.useCaseId,
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AIDE API error: ${response.status} - ${errorText}`);
        throw new Error(`AIDE API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Check if the response includes tool calls and enable multi-tool execution
      const toolCalls = extractToolCalls(result);

      if (toolCalls && toolCalls.length > 0 && requestConfig?.toolExecutor) {
        // Use multi-tool executor for comprehensive context gathering
        const maxToolCalls = requestConfig.maxToolCalls || 50;
        
        const multiToolConfig: MultiToolCallConfig = {
          maxToolCalls,
          baseUrl: this.baseUrl,
          useCaseId: this.useCaseId,
          authToken: this.authToken,
          toolExecutor: requestConfig.toolExecutor
        };

        try {
          const multiToolResult = await executeMultipleToolCalls(
            anthropicMessages,
            modelId,
            maxTokens,
            requestConfig?.temperature,
            tools,
            this.buildAidePayload.bind(this),
            multiToolConfig,
            toolCalls, // Pass the initial tool calls from the first response
            result // Pass the initial response
          );

          // For assistant mode, if the final content is not JSON, treat it as plain text
          if (mode === 'assistant' && multiToolResult.finalContent) {
            // Check if the response looks like JSON
            const trimmedContent = multiToolResult.finalContent.trim();
            if (!trimmedContent.startsWith('{') && !trimmedContent.includes('"type"')) {
              return {
                type: 'assistant',
                content: multiToolResult.finalContent,
                suggestions: []
              };
            }
          }

          return this.parseResponse(multiToolResult.finalContent, mode);
        } catch (error) {
          console.error('Multi-tool execution failed:', error instanceof Error ? error.message : error);
          // Fall back to single tool call execution if multi-tool fails
        }
      }

      // No tool calls, process normally
      const content = extractResponseContent(result);
      
      return this.parseResponse(content, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIDE provider error:', errorMessage);

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

  private buildAidePayload(
    messages: Array<{ role: string; content: Array<Record<string, unknown>> }>,
    modelId: string,
    maxTokens: number,
    temperature?: number,
    tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
  ) {
    const body: Record<string, unknown> = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      temperature: temperature ?? this.config.temperature ?? 0.7,
      messages: messages,
    };

    // Add tools if available
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    return {
      aide: {
        scrub_input: true,
        apply_guardrail: true,
        fail_on_scrub: true,
      },
      gaas: {
        guardrailsEnabled: false,
        scrubInput: false,
        scrubbingTimeoutSeconds: 8,
        pathToPrompt: "aws.bedrock.invoke.body.messages[*].content[*].text",
        logMetadata: {
          solmaId: this.solmaId,
        },
      },
      aws: {
        bedrock: {
          invoke: {
            modelId: modelId,
            body: body,
          },
        },
      },
    };
  }
}

export const createAideProvider = async (config: LLMConfig): Promise<AideProvider> => {
  return new AideProvider(config);
};