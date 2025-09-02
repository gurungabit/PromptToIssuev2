import { z } from 'zod';

// Chat Mode Types
export const ChatModeSchema = z.enum(['ticket', 'assistant']);
export type ChatMode = z.infer<typeof ChatModeSchema>;

// LLM Provider Types
export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'google', 'ollama', 'aide']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Message Types
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.date(),
  mode: ChatModeSchema,
});
export type Message = z.infer<typeof MessageSchema>;

// Ticket Structure Schema
export const AcceptanceCriteriaSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
});
export type AcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
  estimatedHours: z.number().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

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
export type Ticket = z.infer<typeof TicketSchema>;

// AI Response Schemas
export const AssistantResponseSchema = z.object({
  type: z.literal('assistant'),
  content: z.string(),
  suggestions: z.array(z.string()).optional(),
});
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

export const TicketResponseSchema = z.object({
  type: z.literal('tickets'),
  tickets: z.array(TicketSchema),
  reasoning: z.string(),
  needsClarification: z.boolean().default(false),
  clarificationQuestions: z.array(z.string()).optional(),
});
export type TicketResponse = z.infer<typeof TicketResponseSchema>;

export const AIResponseSchema = z.union([AssistantResponseSchema, TicketResponseSchema]);
export type AIResponse = z.infer<typeof AIResponseSchema>;

// Platform Integration Schemas
export const PlatformConfigSchema = z.object({
  type: z.enum(['github', 'gitlab']),
  token: z.string(),
  owner: z.string(),
  repository: z.string(),
  url: z.string().optional(), // For GitLab instances
});
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

// API Request/Response Schemas
export const ChatRequestSchema = z.object({
  message: z.string(),
  mode: ChatModeSchema,
  provider: LLMProviderSchema,
  conversationHistory: z.array(MessageSchema).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const CreateTicketsRequestSchema = z.object({
  tickets: z.array(TicketSchema),
  platform: PlatformConfigSchema,
});
export type CreateTicketsRequest = z.infer<typeof CreateTicketsRequestSchema>;

// LLM Configuration Schema
export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(), // For Ollama
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// MCP Integration Schemas
export const MCPServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().default(true),
});
export type MCPServer = z.infer<typeof MCPServerSchema>;

export const MCPConfigSchema = z.object({
  servers: z.array(MCPServerSchema).default([]),
  enabled: z.boolean().default(false),
});
export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  defaultProvider: LLMProviderSchema.default('openai'),
  defaultMode: ChatModeSchema.default('ticket'),
  platforms: z.array(PlatformConfigSchema).default([]),
  llmConfigs: z.array(LLMConfigSchema).default([]),
  mcpConfig: MCPConfigSchema.optional(),
  ticketTemplate: TicketSchema.partial().optional(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// GitLab Integration Schemas
export const GitLabProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  path_with_namespace: z.string(),
  description: z.string().nullable(),
  web_url: z.string(),
  namespace: z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    kind: z.string(),
    full_path: z.string(),
    parent_id: z.number().nullable(),
  }),
  created_at: z.string(),
  last_activity_at: z.string(),
});

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(['active', 'closed']),
  created_at: z.string(),
  updated_at: z.string(),
  due_date: z.string().nullable(),
  start_date: z.string().nullable(),
  web_url: z.string(),
  project_id: z.number().optional(),
  group_id: z.number().optional(),
});

export const GitLabGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  full_path: z.string(),
  parent_id: z.number().nullable(),
  web_url: z.string(),
});

export const GitLabConfigSchema = z.object({
  baseUrl: z.string().url(),
  accessToken: z.string(),
  defaultProjectId: z.number().optional(),
});

export const GitLabIssueCreateSchema = z.object({
  title: z.string(),
  description: z.string(),
  labels: z.array(z.string()).optional(),
  milestone_id: z.number().optional(),
  assignee_ids: z.array(z.number()).optional(),
  weight: z.number().optional(),
});

export const ProjectSelectionSchema = z.object({
  projectId: z.number(),
  milestoneId: z.number().optional(),
});

export const TicketProjectSelectionSchema = z.object({
  ticketId: z.string(),
  projectId: z.number(),
  milestoneId: z.number().optional(),
});

export const MultiProjectSelectionSchema = z.object({
  tickets: z.array(TicketProjectSelectionSchema),
});

// Type exports
export type GitLabProject = z.infer<typeof GitLabProjectSchema>;
export type GitLabMilestone = z.infer<typeof GitLabMilestoneSchema>;
export type GitLabGroup = z.infer<typeof GitLabGroupSchema>;
export type GitLabConfig = z.infer<typeof GitLabConfigSchema>;
export type GitLabIssueCreate = z.infer<typeof GitLabIssueCreateSchema>;
export type ProjectSelection = z.infer<typeof ProjectSelectionSchema>;
export type TicketProjectSelection = z.infer<typeof TicketProjectSelectionSchema>;
export type MultiProjectSelection = z.infer<typeof MultiProjectSelectionSchema>;
