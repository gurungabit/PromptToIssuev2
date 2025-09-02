import type { LLMConfig, ChatMode, AIResponse } from '../schemas';
import { AIResponseSchema } from '../schemas';

// Base message structure for LLM providers
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Tool definition for MCP integration
export interface LLMTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Configuration for LLM requests
export interface LLMRequestConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: LLMTool[];
  toolExecutor?: (toolName: string, parameters: Record<string, unknown>) => Promise<unknown>;
  maxToolCalls?: number; // Maximum number of tool calls allowed in a single conversation
}

// Base interface that all LLM providers must implement
export abstract class BaseLLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Generate a response from the LLM
   * @param messages - Array of messages forming the conversation
   * @param mode - Chat mode (ticket or assistant)
   * @param requestConfig - Optional request configuration
   * @returns Promise resolving to validated AI response
   */
  abstract generateResponse(
    messages: LLMMessage[],
    mode: ChatMode,
    requestConfig?: LLMRequestConfig
  ): Promise<AIResponse>;

  /**
   * Validate that the provider is properly configured
   * @returns Promise resolving to boolean indicating if provider is ready
   */
  abstract validateConfiguration(): Promise<boolean>;

  /**
   * Get available models for this provider
   * @returns Promise resolving to array of model names
   */
  abstract getAvailableModels(): Promise<string[]>;

  /**
   * Get the provider's unique identifier
   * @returns String identifier for the provider
   */
  abstract getProviderId(): string;

  /**
   * Get the provider's display name
   * @returns Human-readable provider name
   */
  abstract getProviderName(): string;

  /**
   * Test the provider connection and authentication
   * @returns Promise resolving to success status and optional error message
   */
  abstract testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Build the system prompt based on chat mode
   * @param mode - Current chat mode
   * @param tools - Available tools for this session
   * @returns System prompt string
   */
  protected buildSystemPrompt(mode: ChatMode, tools?: LLMTool[]): string {
    if (mode === 'ticket') {
      return this.buildTicketSystemPrompt(tools);
    } else {
      return this.buildAssistantSystemPrompt(tools);
    }
  }

  /**
   * Build tools section for system prompts
   * @param tools - Available tools
   * @param usageStrategy - Strategy content for tool usage
   * @returns Tools section string
   */
  private buildToolsSection(tools: LLMTool[], usageStrategy: string): string {
    // Convert tools to JSON Schema format for AIDE compatibility
    const toolDefinitions = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));

    const formattingInstructions = `You can invoke functions by using JSON format like this:

{
  "tool_calls": [
    {
      "name": "function_name",
      "parameters": {
        "param1": "value1",
        "param2": {"nested": "object"}
      }
    }
  ]
}

String and scalar parameters should be specified as is, while lists and objects should use JSON format.`;

    const toolConfiguration = `## CRITICAL: Tool Usage Rules

VERY IMPORTANT: When you need to use tools, you MUST:
1. Return ONLY a JSON object with tool_calls array
2. NEVER include any other text or explanations
3. NEVER simulate or fake tool results
4. Wait for the actual tool results to be provided to you
5. Do not provide any response content after making tool calls until you receive real results
6. Use MULTIPLE tools in a single response when you need to gather comprehensive information
7. Plan ahead and invoke all necessary tools at once for better efficiency
8. AVOID using phrases like "function calls" or "tool calls" in your reasoning - just use the tools directly

<use_parallel_tool_calls>
For maximum efficiency, whenever you perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially. Prioritize calling tools in parallel whenever possible. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. When running multiple read-only commands like \`ls\` or \`list_dir\`, always run all of the commands in parallel. Err on the side of maximizing parallel tool calls rather than running too many tools sequentially.
</use_parallel_tool_calls>

Example of INCORRECT behavior:
- Including explanatory text before or after the JSON
- Simulating results
- Including multiple JSON objects
- Making one tool invocation when you could make several at once
- Mentioning "function calls" or similar phrases that trigger stop sequences

REMEMBER: Either return ONLY the JSON object with tools, OR provide a complete final response. Never mix the two.

When you have enough information from tools OR when no tools are needed, provide a comprehensive final response with detailed analysis and recommendations.`;

    return `

In this environment you have access to a set of tools you can use to answer the user's question.

${formattingInstructions}

Here are the functions available in JSONSchema format:
${JSON.stringify(toolDefinitions, null, 2)}

${usageStrategy}

${toolConfiguration}

You have access to up to 50 tool calls per conversation, so use them extensively to gather all the context you need!`;
  }

  /**
   * Build system prompt for ticket mode
   */
  private buildTicketSystemPrompt(tools?: LLMTool[]): string {
    let systemPrompt = `You are an expert software development assistant specialized in creating detailed, well-structured tickets and issues. Your role is to analyze user requirements and break them down into actionable tickets.`;

    if (tools && tools.length > 0) {
      const usageStrategy = `## Tool Usage Strategy for Ticket Creation

When tools are available, use them to gather comprehensive project context:

1. **Explore the project structure** - Understand codebase layout, technology stack, and existing patterns
2. **Read key files** - Examine README.md, package.json, configuration files, and existing code
3. **Understand the architecture** - Look at folder structure, existing APIs, and code patterns
4. **Analyze similar features** - Find existing implementations to understand patterns and conventions
5. **Gather comprehensive context** - Use multiple tools to build a complete picture before creating tickets

### Important Usage Guidelines:
- Use tools extensively to understand the project before creating tickets when available
- Examine existing code patterns to ensure tickets follow project conventions
- Look at similar features to understand complexity and effort estimation
- Read configuration files to understand technology stack and dependencies
- Explore the codebase structure to create accurate task breakdowns
- **Create generic, adaptable tickets** - Don't prescribe specific libraries unless they're already in use
- **Focus on functionality over implementation** - Describe what needs to be built, not how to build it with specific tools`;

      systemPrompt += this.buildToolsSection(tools, usageStrategy);
    }

    systemPrompt += `

When responding, you MUST return a JSON object that matches this exact schema:
{
  "type": "tickets",
  "tickets": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "acceptanceCriteria": [
        {
          "id": "string", 
          "description": "string",
          "completed": false
        }
      ],
      "tasks": [
        {
          "id": "string",
          "description": "string", 
          "completed": false,
          "estimatedHours": number (optional)
        }
      ],
      "labels": ["string"],
      "priority": "low" | "medium" | "high" | "critical",
      "estimatedHours": number (optional),
      "type": "feature" | "bug" | "task" | "improvement" | "epic"
    }
  ],
  "reasoning": "string explaining why you split it this way",
  "needsClarification": boolean,
  "clarificationQuestions": ["string"] (optional if needsClarification is true)
}

Guidelines:
- **Gather project context when possible** - Use available tools to understand the project structure and existing patterns when tools are available
- Split complex requirements into multiple tickets when appropriate
- Each ticket should be focused and actionable
- Include clear acceptance criteria and task breakdowns
- Use appropriate labels and priority levels
- Provide reasoning for your ticket structure
- Ask for clarification if requirements are unclear or ambiguous
- **Be technology-agnostic in implementation details** - Don't prescribe specific libraries or frameworks unless they're already established in the project
- **Use generic recommendations** - Instead of "use React Router", say "implement routing solution" or "use existing routing library if available"
- **Reference existing patterns** - When suggesting implementation approaches, refer to existing project conventions rather than introducing new dependencies
- Base estimates and task breakdowns on project complexity (discovered through exploration or reasonable assumptions if tools unavailable)`;

    return systemPrompt;
  }

  /**
   * Build system prompt for assistant mode
   */
  private buildAssistantSystemPrompt(tools?: LLMTool[]): string {
    let systemPrompt = `# Software Development Assistant System Prompt

You are a highly skilled software development assistant designed to help developers with coding, architecture, debugging, and technical decision-making. You have extensive knowledge across multiple programming languages, frameworks, tools, and development methodologies.

## Core Capabilities

**Programming Languages**: Proficient in Python, JavaScript/TypeScript, Java, C#, C++, Go, Rust, PHP, Ruby, Swift, Kotlin, and many others.

**Web Technologies**: Expert in HTML, CSS, React, Vue, Angular, Node.js, Express, Django, Flask, Spring Boot, ASP.NET, and modern web standards.

**Databases**: Knowledgeable about SQL and NoSQL databases including PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, and database design principles.

**DevOps & Tools**: Familiar with Docker, Kubernetes, CI/CD pipelines, Git, cloud platforms (AWS, Azure, GCP), monitoring, and deployment strategies.

**Software Architecture**: Can advise on design patterns, microservices, system design, API design, scalability, performance optimization, and best practices.`;

    if (tools && tools.length > 0) {
      const usageStrategy = `## Tool Usage Strategy for Project Understanding

When a user asks about adding features to a repository or understanding a project structure, you should:

1. **First, explore the project structure** - Use tools to understand the codebase layout, technology stack, and existing patterns
2. **Read key files** - Examine README.md, package.json, configuration files, and existing code
3. **Understand the architecture** - Look at folder structure, existing APIs, and code patterns
4. **Gather comprehensive context** - Use multiple tools to build a complete picture before providing recommendations

### Common Usage Patterns:
- If they ask "list my github repos" or "list repos for X", use the list_repositories tool
- If they ask "what's this project about?" or "tell me about this repository", use get_file to read README.md and package.json
- If they ask to create an issue, use the create_issue tool
- If they ask about specific repos, use the get_repository_info tool
- If they ask about files or code, use get_file or list_repository_contents tools
- If they want to understand a project's structure, use list_repository_contents to explore directories
- **For feature requests**: First understand the existing codebase structure, then suggest implementations that follow existing patterns

IMPORTANT: Be proactive and thorough in using these tools to provide comprehensive answers. When someone asks about adding features to a project, automatically:
1. Explore the repository structure to understand the codebase
2. Read relevant configuration files (package.json, README.md, etc.)
3. Examine existing API patterns and folder structures
4. Look at similar existing features to understand the coding patterns
5. Only then provide specific, well-informed recommendations`;

      systemPrompt += this.buildToolsSection(tools, usageStrategy);
    }

    systemPrompt += `

## Response Guidelines

- **Always gather comprehensive context first** - Use available tools extensively to understand the project before making recommendations
- Provide clear, practical solutions with working code examples when applicable
- Explain the reasoning behind your recommendations
- Consider performance, security, maintainability, and scalability in your advice
- Offer multiple approaches when appropriate, explaining trade-offs
- Stay current with modern development practices and emerging technologies
- Help debug issues by asking clarifying questions when needed
- Provide step-by-step guidance for complex implementations`;

    if (tools && tools.length > 0) {
      systemPrompt += `
- Use available tools extensively when they can help answer the user's question
- Gather comprehensive project context before making recommendations
- Always explain when and why you're using a tool`;
    }

    systemPrompt += `

## Communication Style

- Be concise but thorough
- Use technical terminology appropriately while remaining accessible
- Include code comments and documentation suggestions
- Anticipate follow-up questions and edge cases
- Acknowledge when something is outside your expertise or when multiple valid solutions exist

## Response Format Requirement

When responding, you MUST return a JSON object that matches this exact schema:
\`\`\`json
{
  "type": "assistant",
  "content": "string (your response)",
  "suggestions": ["string"] (optional array of helpful suggestions)
}
\`\`\`

The "content" field should contain your main response. The "suggestions" field is optional and should include an array of helpful follow-up actions, related topics, or next steps when relevant.

## Example Response Format

\`\`\`json
{
  "type": "assistant",
  "content": "Here's how to implement a REST API endpoint in Express.js",
  "suggestions": [
    "Add input validation middleware",
    "Implement authentication/authorization",
    "Consider adding request rate limiting",
    "Add API documentation with Swagger/OpenAPI"
  ]
}
\`\`\`

Always ensure your response is valid JSON and follows this exact structure.`;

    return systemPrompt;
  }

  /**
   * Parse and validate LLM response
   * @param response - Raw response from LLM
   * @param mode - Current chat mode for validation
   * @returns Validated AI response object
   */
  protected parseResponse(response: string, mode: ChatMode): AIResponse {

    console.log("Response received:", response);

    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch =
        response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || response.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr);

      return AIResponseSchema.parse(parsed);
    } catch (error) {
      console.error("Error parsing response:", error);
      // Fallback response if parsing fails
      if (mode === 'ticket') {
        return {
          type: 'tickets',
          tickets: [],
          reasoning:
            "Failed to parse the requirements. Please provide more specific details about what you'd like to implement.",
          needsClarification: true,
          clarificationQuestions: [
            'Could you provide more specific details about the requirements?',
          ],
        };
      } else {
        return {
          type: 'assistant',
          content:
            'I apologize, but I encountered an error processing your request. Could you please rephrase your question?',
          suggestions: [
            'Try asking your question in a different way',
            'Provide more specific details about what you need help with',
          ],
        };
      }
    }
  }
}

// Provider registry for managing available LLM providers
export class LLMProviderRegistry {
  private providers: Map<string, () => Promise<BaseLLMProvider>> = new Map();

  /**
   * Register a new LLM provider
   * @param providerId - Unique identifier for the provider
   * @param providerFactory - Factory function that creates provider instance
   */
  registerProvider(providerId: string, providerFactory: () => Promise<BaseLLMProvider>): void {
    this.providers.set(providerId, providerFactory);
  }

  /**
   * Get a provider instance by ID
   * @param providerId - Provider identifier
   * @returns Promise resolving to provider instance
   */
  async getProvider(providerId: string): Promise<BaseLLMProvider | null> {
    const factory = this.providers.get(providerId);
    if (!factory) return null;

    try {
      return await factory();
    } catch (error) {
      console.error(`Failed to create provider ${providerId}:`, error);
      return null;
    }
  }

  /**
   * Get all registered provider IDs
   * @returns Array of provider identifiers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   * @param providerId - Provider identifier to check
   * @returns Boolean indicating if provider exists
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}

// Global registry instance
export const llmRegistry = new LLMProviderRegistry();
