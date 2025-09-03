import { z } from '@hono/zod-openapi';

// Common response schemas
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Health check schemas
export const HealthCheckResponseSchema = z.object({
  message: z.string(),
  version: z.string().optional(),
  status: z.string().optional(),
});

// Chat API schemas
export const ChatRequestSchema = z.object({
  message: z.string(),
  mode: z.enum(['ticket', 'assistant']),
  provider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'aide']),
  config: z.object({
    apiKey: z.string().optional(),
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
  }),
  conversationHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
    mode: z.enum(['ticket', 'assistant']),
  })).optional(),
  conversationId: z.string().optional(),
  mcpConfig: z.object({
    enabled: z.boolean(),
    servers: z.array(z.object({
      id: z.string(),
      enabled: z.boolean(),
      command: z.string(),
      args: z.array(z.string()),
      cwd: z.string(),
      env: z.record(z.string()),
    })),
  }).optional(),
});

export const AcceptanceCriteriaSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
});

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
  estimatedHours: z.number().optional(),
});

export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(AcceptanceCriteriaSchema),
  tasks: z.array(TaskSchema),
  labels: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimatedHours: z.number().optional(),
  type: z.enum(['feature', 'bug', 'task', 'improvement', 'epic']).default('feature'),
});

export const ChatAssistantResponseSchema = z.object({
  type: z.literal('assistant'),
  content: z.string(),
});

export const ChatTicketsResponseSchema = z.object({
  type: z.literal('tickets'),
  tickets: z.array(TicketSchema),
  reasoning: z.string(),
  needsClarification: z.boolean().optional(),
  clarificationQuestions: z.array(z.string()).optional(),
});

export const ChatResponseSchema = z.union([
  ChatAssistantResponseSchema,
  ChatTicketsResponseSchema,
]);

// Conversation API schemas
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  lastMessage: z.string(),
  timestamp: z.string(),
  mode: z.enum(['ticket', 'assistant']),
  messageCount: z.number(),
  provider: z.string(),
  isArchived: z.boolean(),
});

export const ConversationsResponseSchema = z.object({
  success: z.boolean(),
  conversations: z.array(ConversationSchema),
});

export const CreateConversationRequestSchema = z.object({
  userId: z.string(),
  title: z.string(),
  mode: z.enum(['ticket', 'assistant']),
  provider: z.string(),
});

export const ConversationResponseSchema = z.object({
  success: z.boolean(),
  conversation: ConversationSchema.optional(),
});

export const UpdateConversationRequestSchema = z.object({
  title: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export const ShareConversationResponseSchema = z.object({
  success: z.boolean(),
  shareId: z.string().optional(),
});

// Messages API schemas
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
  mode: z.enum(['ticket', 'assistant']),
  metadata: z.record(z.unknown()).optional(),
});

export const MessagesResponseSchema = z.object({
  success: z.boolean(),
  messages: z.array(MessageSchema),
});

export const CreateMessageRequestSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  mode: z.enum(['ticket', 'assistant']),
  metadata: z.string().optional(),
});

export const MessageResponseSchema = z.object({
  success: z.boolean(),
  message: MessageSchema.optional(),
});

// Providers API schemas
export const TestConnectionRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'aide']),
  config: z.object({
    apiKey: z.string().optional(),
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    baseUrl: z.string().optional(),
  }),
});

export const TestConnectionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// GitLab API schemas
export const GitLabConfigSchema = z.object({
  baseUrl: z.string(),
  accessToken: z.string(),
});

export const ProjectSelectionSchema = z.object({
  projectId: z.number(),
  milestoneId: z.number().optional(),
});

export const MultiProjectSelectionSchema = z.object({
  tickets: z.array(z.object({
    ticketId: z.string(),
    projectId: z.number(),
    milestoneId: z.number().optional(),
  })),
});

export const GitLabCreateIssuesRequestSchema = z.object({
  tickets: z.array(TicketSchema),
  projectSelection: ProjectSelectionSchema,
  gitlabConfig: GitLabConfigSchema,
});

export const GitLabCreateIssuesMultiRequestSchema = z.object({
  tickets: z.array(TicketSchema),
  multiProjectSelection: MultiProjectSelectionSchema,
  gitlabConfig: GitLabConfigSchema,
});

export const GitLabIssueResultSchema = z.object({
  ticket: TicketSchema,
  issue: z.record(z.unknown()),
});

export const GitLabErrorResultSchema = z.object({
  ticket: TicketSchema,
  error: z.string(),
});

export const GitLabCreateIssuesResponseSchema = z.object({
  success: z.boolean(),
  created: z.number(),
  total: z.number(),
  issues: z.array(GitLabIssueResultSchema),
  errors: z.array(GitLabErrorResultSchema),
  message: z.string(),
});

export const GitLabProjectResultSchema = z.object({
  projectId: z.number(),
  createdIssues: z.array(GitLabIssueResultSchema),
  errors: z.array(GitLabErrorResultSchema),
});

export const GitLabCreateIssuesMultiResponseSchema = z.object({
  success: z.boolean(),
  created: z.number(),
  total: z.number(),
  results: z.array(GitLabProjectResultSchema),
  message: z.string(),
});

// Shared API schemas
export const SharedConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.string(),
  provider: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isShared: z.boolean(),
});

export const SharedResponseSchema = z.object({
  success: z.boolean(),
  conversation: SharedConversationSchema.optional(),
  messages: z.array(MessageSchema).optional(),
});

// Common parameter schemas
export const IdParamSchema = z.object({
  id: z.string(),
});

export const ShareIdParamSchema = z.object({
  shareId: z.string(),
});

// Query parameter schemas
export const ConversationIdQuerySchema = z.object({
  conversationId: z.string(),
});

// Error response types
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;