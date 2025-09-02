/**
 * Utility functions for extracting and parsing tool calls from AIDE API responses
 */

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Extracts tool calls from AIDE API response in various formats (JSON, XML, Anthropic)
 */
export function extractToolCalls(result: unknown): ToolCall[] | null {
  try {
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      
      // First try to extract the text content to look for JSON tool calls
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
      
      // Check for JSON-style tool calls in the text content
      const jsonToolCalls = extractJsonToolCalls(textContent);
      if (jsonToolCalls && jsonToolCalls.length > 0) {
        return jsonToolCalls;
      }
      
      // Fallback: Check for XML-style function calls in the text content (for backward compatibility)
      const xmlToolCalls = extractXmlToolCalls(textContent);
      if (xmlToolCalls && xmlToolCalls.length > 0) {
        return xmlToolCalls;
      }
      
      // Fallback: Check for standard Anthropic tool_use format (JSON)
      const anthropicToolCalls = extractAnthropicToolCalls(resultObj);
      if (anthropicToolCalls && anthropicToolCalls.length > 0) {
        return anthropicToolCalls;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting tool calls:', error);
    return null;
  }
}

/**
 * Extracts tool calls from JSON format response
 */
function extractJsonToolCalls(textContent: string): ToolCall[] | null {
  if (!textContent.includes('tool_calls')) {
    return null;
  }

  try {
    // Find the start of JSON block containing tool_calls
    const toolCallsIndex = textContent.indexOf('"tool_calls"');
    if (toolCallsIndex === -1) return null;
    
    // Find the opening brace before tool_calls
    let startIndex = toolCallsIndex;
    while (startIndex > 0 && textContent[startIndex] !== '{') {
      startIndex--;
    }
    
    if (startIndex === 0 && textContent[0] !== '{') return null;
    
    // Find the matching closing brace
    let braceCount = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < textContent.length; i++) {
      if (textContent[i] === '{') {
        braceCount++;
      } else if (textContent[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (braceCount !== 0) return null;
    
    const jsonString = textContent.substring(startIndex, endIndex + 1);
    const jsonResponse = JSON.parse(jsonString);
    
    if (jsonResponse.tool_calls && Array.isArray(jsonResponse.tool_calls)) {
      return parseToolCallsArray(jsonResponse.tool_calls);
    }
  } catch (error) {
    console.error('Error parsing JSON tool calls:', error);
  }
  
  return null;
}

/**
 * Helper function to parse tool calls array
 */
function parseToolCallsArray(toolCallsArray: unknown[]): ToolCall[] | null {
  const toolCalls: ToolCall[] = [];
  
  for (const call of toolCallsArray) {
    if (typeof call === 'object' && call !== null) {
      const callObj = call as Record<string, unknown>;
      if (callObj.name && callObj.parameters && typeof callObj.name === 'string') {
        // Generate a unique ID matching Bedrock pattern ^[a-zA-Z0-9_-]+$
        const randomId = Math.random().toString(36).substring(2, 15);
        toolCalls.push({
          id: `tool_${Date.now()}_${randomId}`,
          name: callObj.name,
          input: callObj.parameters as Record<string, unknown>
        });
      }
    }
  }
  
  return toolCalls.length > 0 ? toolCalls : null;
}

/**
 * Extracts tool calls from XML format response (legacy support)
 */
function extractXmlToolCalls(textContent: string): ToolCall[] | null {
  if (textContent.includes('<function_calls>')) {
    const toolCalls: ToolCall[] = [];
    
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
      
      // Generate a unique ID matching Bedrock pattern ^[a-zA-Z0-9_-]+$
      const randomId = Math.random().toString(36).substring(2, 15);
      toolCalls.push({
        id: `tool_${Date.now()}_${randomId}`,
        name: toolName,
        input: parameters
      });
    }
    
    return toolCalls.length > 0 ? toolCalls : null;
  }
  return null;
}

/**
 * Extracts tool calls from standard Anthropic format
 */
function extractAnthropicToolCalls(resultObj: Record<string, unknown>): ToolCall[] | null {
  if (Array.isArray(resultObj.content)) {
    const toolCalls: ToolCall[] = [];
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
  return null;
}

/**
 * Builds tool call content in Anthropic format
 */
export function buildToolCallContent(toolCalls: ToolCall[]): Array<Record<string, unknown>> {
  return toolCalls.map(call => ({
    type: 'tool_use',
    id: call.id,
    name: call.name,
    input: call.input
  }));
}
