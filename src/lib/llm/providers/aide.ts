import { BaseLLMProvider, LLMTool, type LLMMessage, type LLMRequestConfig } from '../base';
import type { LLMConfig, ChatMode, AIResponse } from '../../schemas';
import { getAvailableModels, mapModelId } from '../provider-models';

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

      const response = await fetch(`${this.baseUrl}/generate`, {
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

    const systemPrompt = this.buildAideSystemPrompt(mode, requestConfig?.tools);
    
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
      const response = await fetch(`${this.baseUrl}/generate`, {
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
        throw new Error(`AIDE API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Check if the response includes tool calls
      const toolCalls = this.extractToolCalls(result);
      
      // Debug: Log if tools are available vs tool calls found
      if (requestConfig?.tools && requestConfig.tools.length > 0) {
        console.log(`Tools available: ${requestConfig.tools.length}, Tool calls found: ${toolCalls?.length || 0}`);
        if (!toolCalls || toolCalls.length === 0) {
          console.log('Expected tool call but none found. Response content:', this.extractResponseContent(result).substring(0, 200));
        }
      }
      
      if (toolCalls && toolCalls.length > 0 && requestConfig?.toolExecutor) {
        // Execute the tool calls
        const toolResults = [];
        for (const call of toolCalls) {
          try {
            const toolResult = await requestConfig.toolExecutor(call.name, call.input);
            toolResults.push({
              tool_use_id: call.id,
              content: [{
                type: 'tool_result',
                tool_use_id: call.id,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
              }]
            });
          } catch (error) {
            console.error(`Tool execution error for ${call.name}:`, error);
            toolResults.push({
              tool_use_id: call.id,
              content: [{
                type: 'tool_result',
                tool_use_id: call.id,
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              }]
            });
          }
        }

        // Create new messages array with tool results
        const messagesWithToolResults = [...anthropicMessages];
        
        // Add the assistant message with tool calls
        const assistantWithTools = {
          role: 'assistant',
          content: this.buildToolCallContent(toolCalls)
        };
        messagesWithToolResults.push(assistantWithTools);
        
        // Add user message with tool results
        const userWithResults = {
          role: 'user',
          content: toolResults.flatMap(tr => tr.content as Array<Record<string, unknown>>)
        };
        messagesWithToolResults.push(userWithResults);

        // Make another API call with tool results
        const followUpPayload = this.buildAidePayload(messagesWithToolResults, modelId, maxTokens, requestConfig?.temperature, tools);
        
        const followUpResponse = await fetch(`${this.baseUrl}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'usecaseid': this.useCaseId,
            'Authorization': `Bearer ${this.authToken}`,
          },
          body: JSON.stringify(followUpPayload),
        });

        if (!followUpResponse.ok) {
          const errorText = await followUpResponse.text();
          throw new Error(`AIDE API error on tool follow-up: ${followUpResponse.status} - ${errorText}`);
        }

        const followUpResult = await followUpResponse.json();
        const finalContent = this.extractResponseContent(followUpResult);
        
        return this.parseResponse(finalContent, mode);
      }

      // No tool calls, process normally
      const content = this.extractResponseContent(result);
      
      return this.parseResponse(content, mode);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('AIDE API error:', error);

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


  private extractResponseContent(result: unknown): string {
    try {
      // AIDE returns response in this structure:
      // { aide: {...}, gaas: {...}, aws: { content: [{ type: "text", text: "..." }] } }
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>;
        
        // Check for the new AIDE response format with aws.content
        if (resultObj.aws && typeof resultObj.aws === 'object' && resultObj.aws !== null) {
          const aws = resultObj.aws as Record<string, unknown>;
          if (Array.isArray(aws.content) && aws.content[0] && typeof aws.content[0] === 'object') {
            const content = aws.content[0] as Record<string, unknown>;
            if (content.type === 'text' && typeof content.text === 'string') {
              return content.text;
            }
          }
        }
        
        // Fallback: Check for direct content array (older format)
        if (Array.isArray(resultObj.content) && resultObj.content[0] && typeof resultObj.content[0] === 'object') {
          const content = resultObj.content[0] as Record<string, unknown>;
          if (typeof content.text === 'string') {
            return content.text;
          }
        }
        
        // Fallback: Check for body.content (another possible format)
        if (resultObj.body && typeof resultObj.body === 'object' && resultObj.body !== null) {
          const body = resultObj.body as Record<string, unknown>;
          if (Array.isArray(body.content) && body.content[0] && typeof body.content[0] === 'object') {
            const content = body.content[0] as Record<string, unknown>;
            if (typeof content.text === 'string') {
              return content.text;
            }
          }
        }
      }
      
      // If we can't find the expected structure, try to stringify the response
      if (typeof result === 'string') {
        return result;
      }
      
      // Last resort - return the entire result as a string for debugging
      return JSON.stringify(result, null, 2);
    } catch (error) {
      console.error('Error extracting AIDE response content:', error);
      return 'Error parsing response from AIDE API';
    }
  }

  private extractToolCalls(result: unknown): Array<{ id: string; name: string; input: Record<string, unknown> }> | null {
    try {
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>;
        
        // First try to extract the text content to look for XML tool calls
        let textContent = '';
        
        // Get text content from AIDE response format
        if (resultObj.aws && typeof resultObj.aws === 'object' && resultObj.aws !== null) {
          const aws = resultObj.aws as Record<string, unknown>;
          if (Array.isArray(aws.content) && aws.content[0] && typeof aws.content[0] === 'object') {
            const content = aws.content[0] as Record<string, unknown>;
            if (content.type === 'text' && typeof content.text === 'string') {
              textContent = content.text;
            }
          }
        }
        
        // Check for XML-style function calls in the text content
        if (textContent.includes('<function_calls>')) {
          const toolCalls = [];
          
          // Extract only the function_calls section, ignore any hallucinated function_result
          const functionCallsMatch = textContent.match(/<function_calls>([\s\S]*?)<\/function_calls>/);
          if (!functionCallsMatch) return null;
          
          const functionCallsXml = functionCallsMatch[1];
          
          // Extract all function calls using regex
          const functionCallRegex = /<invoke name="([^"]+)"[^>]*>([\s\S]*?)<\/invoke>/g;
          let match;
          
          while ((match = functionCallRegex.exec(functionCallsXml)) !== null) {
            const toolName = match[1];
            const parametersXml = match[2];
            
            // Parse parameters from XML
            const parameters: Record<string, unknown> = {};
            const paramRegex = /<parameter name="([^"]+)"[^>]*>([^<]*)<\/parameter>/g;
            let paramMatch;
            
            while ((paramMatch = paramRegex.exec(parametersXml)) !== null) {
              const paramName = paramMatch[1];
              const paramValue = paramMatch[2];
              
              // Try to parse as number if it looks like a number
              if (/^\d+$/.test(paramValue)) {
                parameters[paramName] = parseInt(paramValue);
              } else {
                parameters[paramName] = paramValue;
              }
            }
            
            toolCalls.push({
              id: `tool_${Date.now()}_${Math.random()}`, // Generate a unique ID
              name: toolName,
              input: parameters
            });
          }
          
          return toolCalls.length > 0 ? toolCalls : null;
        }
        
        // Fallback: Check for standard Anthropic tool_use format (JSON)
        if (Array.isArray(resultObj.content)) {
          const toolCalls = [];
          for (const content of resultObj.content) {
            if (typeof content === 'object' && content !== null) {
              const contentObj = content as Record<string, unknown>;
              if (contentObj.type === 'tool_use' && 
                  typeof contentObj.id === 'string' && 
                  typeof contentObj.name === 'string' && 
                  typeof contentObj.input === 'object') {
                toolCalls.push({
                  id: contentObj.id,
                  name: contentObj.name,
                  input: contentObj.input as Record<string, unknown>
                });
              }
            }
          }
          return toolCalls.length > 0 ? toolCalls : null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting tool calls:', error);
      return null;
    }
  }

  private buildToolCallContent(toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>): Array<Record<string, unknown>> {
    return toolCalls.map(call => ({
      type: 'tool_use',
      id: call.id,
      name: call.name,
      input: call.input
    }));
  }

  private buildAideSystemPrompt(mode: ChatMode, tools?: LLMTool[]): string {
    if (mode === 'ticket') {
      return this.buildSystemPrompt(mode, tools);
    }

    let systemPrompt = this.buildSystemPrompt(mode, tools);

    // Add AIDE-specific instructions to prevent hallucinated tool results
    if (tools && tools.length > 0) {
      systemPrompt += `

## CRITICAL: Tool Usage Rules for AIDE

VERY IMPORTANT: When you make a tool call, you MUST:
1. ONLY include the <function_calls> block with <invoke> tags
2. NEVER include <function_result> tags in your response
3. NEVER simulate or fake tool results
4. Wait for the actual tool results to be provided to you
5. Do not provide any response content after the tool call until you receive real results

Example of CORRECT tool usage:
<function_calls>
<invoke name="list_projects">
<parameter name="per_page">30</parameter>
</invoke>
</function_calls>

Example of INCORRECT (DO NOT DO):
<function_calls>
<invoke name="list_projects">
...
</invoke>
</function_calls>
<function_result>
{fake data here}
</function_result>

REMEMBER: Make the tool call and stop. Do not simulate results.`;
    }

    return systemPrompt;
  }
}

export const createAideProvider = async (config: LLMConfig): Promise<AideProvider> => {
  return new AideProvider(config);
};