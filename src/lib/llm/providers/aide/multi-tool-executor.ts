/**
 * Handles multiple sequential tool calls for gathering comprehensive project context
 */

import type { ToolCall } from './tool-extractor';
import { extractToolCalls, buildToolCallContent } from './tool-extractor';
import { extractResponseContent } from './response-extractor';
import { fetchAideAPI } from './fetch-with-retry';

export interface MultiToolCallResult {
  finalContent: string;
  totalToolCalls: number;
  toolCallHistory: Array<{
    iteration: number;
    toolCalls: ToolCall[];
    results: Array<{ toolName: string; success: boolean; result?: unknown; error?: string }>;
  }>;
}

export interface MultiToolCallConfig {
  maxToolCalls: number;
  baseUrl: string;
  useCaseId: string;
  authToken: string;
  toolExecutor: (toolName: string, parameters: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Executes multiple sequential tool calls until no more tools are needed or limit is reached
 */
export async function executeMultipleToolCalls(
  initialMessages: Array<{ role: string; content: Array<Record<string, unknown>> }>,
  modelId: string,
  maxTokens: number,
  temperature: number | undefined,
  tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }> | undefined,
  buildPayloadFn: (messages: Array<{ role: string; content: Array<Record<string, unknown>> }>, modelId: string, maxTokens: number, temperature?: number, tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>) => Record<string, unknown>,
  config: MultiToolCallConfig,
  initialToolCalls?: ToolCall[],
  initialResponse?: unknown
): Promise<MultiToolCallResult> {
  const currentMessages = [...initialMessages];
  let totalToolCalls = 0;
  const toolCallHistory: MultiToolCallResult['toolCallHistory'] = [];
  const maxIterations = Math.ceil(config.maxToolCalls / 5);

  let iteration = 1;
  
  // If we have initial tool calls, use them for the first iteration
  if (initialToolCalls && initialResponse) {
    // Check if we would exceed the tool call limit
    if (totalToolCalls + initialToolCalls.length > config.maxToolCalls) {
      const allowedCalls = config.maxToolCalls - totalToolCalls;
      initialToolCalls.splice(allowedCalls);
    }

    // Execute initial tools in parallel
    const initialExecutionPromises = initialToolCalls.map(async (call) => {
      try {
        const toolResult = await config.toolExecutor(call.name, call.input);

        return {
          call,
          success: true,
          result: toolResult,
          toolResult: {
            tool_use_id: call.id,
            content: [{
              type: 'tool_result',
              tool_use_id: call.id,
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
            }]
          },
          iterationResult: {
            toolName: call.name,
            success: true,
            result: toolResult
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Tool execution failed: ${call.name} -`, errorMessage);
        return {
          call,
          success: false,
          error: errorMessage,
          toolResult: {
            tool_use_id: call.id,
            content: [{
              type: 'tool_result',
              tool_use_id: call.id,
              content: `Error: ${errorMessage}`
            }]
          },
          iterationResult: {
            toolName: call.name,
            success: false,
            error: errorMessage
          }
        };
      }
    });

    // Wait for all initial tool executions to complete
    const initialResults = await Promise.all(initialExecutionPromises);
    
    // Process initial results
    const toolResults = [];
    const iterationResults = [];
    
    for (const execResult of initialResults) {
      toolResults.push(execResult.toolResult);
      iterationResults.push(execResult.iterationResult);
      totalToolCalls++;
    }

    // Record initial iteration's history
    toolCallHistory.push({
      iteration: 1,
      toolCalls: initialToolCalls,
      results: iterationResults
    });

    // Add assistant message with initial tool calls
    const assistantWithTools = {
      role: 'assistant',
      content: buildToolCallContent(initialToolCalls)
    };
    currentMessages.push(assistantWithTools);
    
    // Add user message with tool results
    const userWithResults = {
      role: 'user',
      content: toolResults.flatMap(tr => tr.content as Array<Record<string, unknown>>)
    };
    currentMessages.push(userWithResults);

    iteration = 2; // Start from iteration 2
  }

  for (; iteration <= maxIterations; iteration++) {
    if (totalToolCalls >= config.maxToolCalls) {
      break;
    }

    // Build payload for current iteration
    const payload = buildPayloadFn(currentMessages, modelId, maxTokens, temperature, tools);
    
    try {
      // Make API call
      const response = await fetchAideAPI(`${config.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'usecaseid': config.useCaseId,
          'Authorization': `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AIDE API request failed: ${response.status} - ${errorText}`);
        throw new Error(`AIDE API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Extract tool calls from response
      const toolCalls = extractToolCalls(result);

      if (!toolCalls || toolCalls.length === 0) {
        // No more tool calls needed, extract final content
        const finalContent = extractResponseContent(result);
        
        // Check if this is a stop sequence response
        const resultObj = result as Record<string, unknown>;
        const awsResponse = resultObj.aws as Record<string, unknown>;
        const isStopSequenceResponse = awsResponse?.stop_reason === 'stop_sequence' && 
          awsResponse?.stop_sequence === '<function_calls>';
        
        if (isStopSequenceResponse) {
          // Add any existing content as assistant message if it exists
          if (finalContent && finalContent.trim().length > 0) {
            currentMessages.push({
              role: 'assistant',
              content: [{ type: 'text', text: finalContent }]
            });
          }
          
          // Ask the LLM to either call more tools or provide final response
          currentMessages.push({
            role: 'user',
            content: [{ 
              type: 'text', 
              text: 'You were cut off by a stop sequence. Please either:\n1. Use additional tools to gather the information you need (return JSON with tool_calls)\n2. OR provide a comprehensive final response based on the information already gathered\n\nContinue with your analysis.' 
            }]
          });
          continue;
        }
        
        // If we have tool call history, this should be a final response after processing tools
        if (finalContent && finalContent.trim().length > 20) {
          return {
            finalContent,
            totalToolCalls,
            toolCallHistory
          };
        } else if (toolCallHistory.length > 0 && iteration > 3) {
          // If we've been through multiple iterations, ask LLM to summarize
          const summarizedResponse = await requestLLMSummary(currentMessages, modelId, maxTokens, temperature, buildPayloadFn, config, toolCallHistory);
          return {
            finalContent: summarizedResponse,
            totalToolCalls,
            toolCallHistory
          };
        } else if (iteration <= 2) {
          // Only prompt for more comprehensive response early in the conversation
          if (finalContent && finalContent.trim().length > 0) {
            currentMessages.push({
              role: 'assistant',
              content: [{ type: 'text', text: finalContent }]
            });
          }
          
          // Ask the LLM to make a clear decision
          currentMessages.push({
            role: 'user',
            content: [{ 
              type: 'text', 
              text: 'Please either:\n1. Use additional tools if you need more information (return JSON with tool_calls array)\n2. OR provide a comprehensive final response with detailed analysis and recommendations based on the information already gathered\n\nMake a clear choice - either use tools or give final analysis.' 
            }]
          });
          continue;
        }
      }

      // At this point, we should have tool calls to execute
      if (!toolCalls || toolCalls.length === 0) {
        // Check if this is a stop sequence response
        const resultObj = result as Record<string, unknown>;
        const awsResponse = resultObj.aws as Record<string, unknown>;
        const isStopSequenceResponse = awsResponse?.stop_reason === 'stop_sequence' && 
          awsResponse?.stop_sequence === '<function_calls>';
        
        if (isStopSequenceResponse) {
          // Add any existing content as assistant message if it exists
          const finalContent = extractResponseContent(result);
          if (finalContent && finalContent.trim().length > 0) {
            currentMessages.push({
              role: 'assistant',
              content: [{ type: 'text', text: finalContent }]
            });
          }
          
          currentMessages.push({
            role: 'user',
            content: [{ 
              type: 'text', 
              text: 'You hit a stop sequence. Please either:\n1. Use additional tools if you need more information (return JSON with tool_calls array)\n2. OR provide a comprehensive final response with detailed analysis and recommendations\n\nChoose one approach and proceed.' 
            }]
          });
          continue;
        }
        
        // Try to extract final content again
        const finalContent = extractResponseContent(result);
        if (finalContent && finalContent.trim().length > 20) {
          return {
            finalContent,
            totalToolCalls,
            toolCallHistory
          };
        }
        break;
      }

      // Check if we would exceed the tool call limit
      if (totalToolCalls + toolCalls.length > config.maxToolCalls) {
        const allowedCalls = config.maxToolCalls - totalToolCalls;
        toolCalls.splice(allowedCalls);
      }

      // Execute tool calls in parallel
      const toolExecutionPromises = toolCalls.map(async (call) => {
        try {
          const toolResult = await config.toolExecutor(call.name, call.input);

          return {
            call,
            success: true,
            result: toolResult,
            toolResult: {
              tool_use_id: call.id,
              content: [{
                type: 'tool_result',
                tool_use_id: call.id,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
              }]
            },
            iterationResult: {
              toolName: call.name,
              success: true,
              result: toolResult
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Tool execution failed: ${call.name} -`, errorMessage);
          return {
            call,
            success: false,
            error: errorMessage,
            toolResult: {
              tool_use_id: call.id,
              content: [{
                type: 'tool_result',
                tool_use_id: call.id,
                content: `Error: ${errorMessage}`
              }]
            },
            iterationResult: {
              toolName: call.name,
              success: false,
              error: errorMessage
            }
          };
        }
      });

      // Wait for all tool executions to complete
      const executionResults = await Promise.all(toolExecutionPromises);
      
      // Process results
      const toolResults = [];
      const iterationResults = [];
      
      for (const execResult of executionResults) {
        toolResults.push(execResult.toolResult);
        iterationResults.push(execResult.iterationResult);
        totalToolCalls++;
      }

      // Record this iteration's history
      toolCallHistory.push({
        iteration,
        toolCalls,
        results: iterationResults
      });

      // Add assistant message with tool calls
      const assistantWithTools = {
        role: 'assistant',
        content: buildToolCallContent(toolCalls)
      };
      currentMessages.push(assistantWithTools);
      
      // Add user message with tool results
      const userWithResults = {
        role: 'user',
        content: toolResults.flatMap(tr => tr.content as Array<Record<string, unknown>>)
      };
      currentMessages.push(userWithResults);

    } catch (error) {
      console.error(`Multi-tool execution failed at iteration ${iteration}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // If we've exhausted all iterations, make one final call without expecting tools
  try {
    const finalPayload = buildPayloadFn(currentMessages, modelId, maxTokens, temperature, tools);
    
    const finalResponse = await fetchAideAPI(`${config.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'usecaseid': config.useCaseId,
        'Authorization': `Bearer ${config.authToken}`,
      },
      body: JSON.stringify(finalPayload),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error(`Final AIDE API call failed: ${finalResponse.status} - ${errorText}`);
      throw new Error(`AIDE API error on final call: ${finalResponse.status} - ${errorText}`);
    }

    const finalResult = await finalResponse.json();
    const finalContent = extractResponseContent(finalResult);
    
    return {
      finalContent,
      totalToolCalls,
      toolCallHistory
    };
  } catch (error) {
    console.error('Final API call failed, attempting LLM summary fallback:', error instanceof Error ? error.message : error);
    // If final API call fails but we have tool history, ask LLM to summarize
    if (toolCallHistory.length > 0) {
      const summarizedContent = await requestLLMSummary(currentMessages, modelId, maxTokens, temperature, buildPayloadFn, config, toolCallHistory);
      return {
        finalContent: summarizedContent,
        totalToolCalls,
        toolCallHistory
      };
    }
    
    throw error;
  }
}

/**
 * Requests the LLM to provide a final summary based on tool execution history
 */
async function requestLLMSummary(
  currentMessages: Array<{ role: string; content: Array<Record<string, unknown>> }>,
  modelId: string,
  maxTokens: number,
  temperature: number | undefined,
  buildPayloadFn: (messages: Array<{ role: string; content: Array<Record<string, unknown>> }>, modelId: string, maxTokens: number, temperature?: number, tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>) => Record<string, unknown>,
  config: MultiToolCallConfig,
  toolCallHistory: MultiToolCallResult['toolCallHistory']
): Promise<string> {
  // Create a summary request message
  const summaryMessages = [...currentMessages];
  
  // Add a request for the LLM to summarize everything
  summaryMessages.push({
    role: 'user',
    content: [{
      type: 'text',
      text: `Based on all the tool executions and information gathered above, please provide a comprehensive final response that summarizes the key findings and provides actionable recommendations. Do not use any tools - just analyze and summarize the information that has already been collected.`
    }]
  });

  try {
    const summaryPayload = buildPayloadFn(summaryMessages, modelId, maxTokens, temperature);
    
    const summaryResponse = await fetchAideAPI(`${config.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'usecaseid': config.useCaseId,
        'Authorization': `Bearer ${config.authToken}`,
      },
      body: JSON.stringify(summaryPayload),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error(`LLM summary request failed: ${summaryResponse.status} - ${errorText}`);
      throw new Error(`Summary API error: ${summaryResponse.status}`);
    }

    const summaryResult = await summaryResponse.json();
    return extractResponseContent(summaryResult);
  } catch (error) {
    console.error('LLM summary generation failed, using fallback:', error instanceof Error ? error.message : error);
    // Fallback to a simple summary if LLM call fails
    return `Tool execution completed. ${toolCallHistory.length} iterations were performed with a total of tools executed. Please review the conversation history above for detailed results.`;
  }
}
