/**
 * Utility functions for extracting response content from AIDE API responses
 */

/**
 * Extracts text content from AIDE API response
 */
export function extractResponseContent(result: unknown): string {
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
          console.log('Extracted from direct content array:', content.text.substring(0, 100));
          return content.text;
        }
      }
      
      // Fallback: Check for body.content (another possible format)
      if (resultObj.body && typeof resultObj.body === 'object' && resultObj.body !== null) {
        const body = resultObj.body as Record<string, unknown>;
        if (Array.isArray(body.content) && body.content[0] && typeof body.content[0] === 'object') {
          const content = body.content[0] as Record<string, unknown>;
          if (typeof content.text === 'string') {
            console.log('Extracted from body.content:', content.text.substring(0, 100));
            return content.text;
          }
        }
      }
    }
    
    // If we can't find the expected structure, return empty string
    if (typeof result === 'string') {
      return result;
    }
    
    console.warn('Could not extract text content from AIDE response structure:', Object.keys(result as Record<string, unknown>));
    return '';
  } catch (error) {
    console.error('Error extracting AIDE response content:', error);
    return '';
  }
}