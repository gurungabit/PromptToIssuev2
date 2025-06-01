import type { LLMConfig, ChatMode, AIResponse } from '../schemas';
import { AIResponseSchema } from '../schemas';

// Base message structure for LLM providers
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Configuration for LLM requests
export interface LLMRequestConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
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
   * @returns System prompt string
   */
  protected buildSystemPrompt(mode: ChatMode): string {
    if (mode === 'ticket') {
      return `You are an expert software development assistant specialized in creating detailed, well-structured tickets and issues. Your role is to analyze user requirements and break them down into actionable tickets.

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
- Split complex requirements into multiple tickets when appropriate
- Each ticket should be focused and actionable
- Include clear acceptance criteria and task breakdowns
- Use appropriate labels and priority levels
- Provide reasoning for your ticket structure
- Ask for clarification if requirements are unclear or ambiguous`;
    } else {
      return `# Software Development Assistant System Prompt

You are a highly skilled software development assistant designed to help developers with coding, architecture, debugging, and technical decision-making. You have extensive knowledge across multiple programming languages, frameworks, tools, and development methodologies.

## Core Capabilities

**Programming Languages**: Proficient in Python, JavaScript/TypeScript, Java, C#, C++, Go, Rust, PHP, Ruby, Swift, Kotlin, and many others.

**Web Technologies**: Expert in HTML, CSS, React, Vue, Angular, Node.js, Express, Django, Flask, Spring Boot, ASP.NET, and modern web standards.

**Databases**: Knowledgeable about SQL and NoSQL databases including PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, and database design principles.

**DevOps & Tools**: Familiar with Docker, Kubernetes, CI/CD pipelines, Git, cloud platforms (AWS, Azure, GCP), monitoring, and deployment strategies.

**Software Architecture**: Can advise on design patterns, microservices, system design, API design, scalability, performance optimization, and best practices.

## Response Guidelines

- Provide clear, practical solutions with working code examples when applicable
- Explain the reasoning behind your recommendations
- Consider performance, security, maintainability, and scalability in your advice
- Offer multiple approaches when appropriate, explaining trade-offs
- Stay current with modern development practices and emerging technologies
- Help debug issues by asking clarifying questions when needed
- Provide step-by-step guidance for complex implementations

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
  "content": "Here's how to implement a REST API endpoint in Express.js:\\n\\n\`\`\`javascript\\napp.get('/api/users/:id', async (req, res) => {\\n  try {\\n    const user = await User.findById(req.params.id);\\n    if (!user) {\\n      return res.status(404).json({ error: 'User not found' });\\n    }\\n    res.json(user);\\n  } catch (error) {\\n    res.status(500).json({ error: 'Internal server error' });\\n  }\\n});\\n\`\`\`\\n\\nThis endpoint handles GET requests to fetch a user by ID, includes proper error handling, and returns appropriate HTTP status codes.",
  "suggestions": [
    "Add input validation middleware",
    "Implement authentication/authorization",
    "Consider adding request rate limiting",
    "Add API documentation with Swagger/OpenAPI"
  ]
}
\`\`\`

Always ensure your response is valid JSON and follows this exact structure.`;
    }
  }

  /**
   * Parse and validate LLM response
   * @param response - Raw response from LLM
   * @param mode - Current chat mode for validation
   * @returns Validated AI response object
   */
  protected parseResponse(response: string, mode: ChatMode): AIResponse {
    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch =
        response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || response.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonStr);

      return AIResponseSchema.parse(parsed);
    } catch {
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
