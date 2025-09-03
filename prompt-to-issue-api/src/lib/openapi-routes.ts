import { createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { 
  ChatRequestSchema, 
  ChatResponseSchema, 
  HealthCheckResponseSchema,
  ErrorResponseSchema,
  ConversationsResponseSchema,
  CreateConversationRequestSchema,
  ConversationResponseSchema,
  UpdateConversationRequestSchema,
  ShareConversationResponseSchema,
  MessagesResponseSchema,
  CreateMessageRequestSchema,
  MessageResponseSchema,
  TestConnectionRequestSchema,
  TestConnectionResponseSchema,
  GitLabCreateIssuesRequestSchema,
  GitLabCreateIssuesResponseSchema,
  GitLabCreateIssuesMultiRequestSchema,
  GitLabCreateIssuesMultiResponseSchema,
  SharedResponseSchema
} from './api-schemas';

// Common parameter schemas
const IdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: 'abc123',
  }),
});

const ShareIdParamSchema = z.object({
  shareId: z.string().openapi({
    param: {
      name: 'shareId', 
      in: 'path',
    },
    example: 'def456',
  }),
});

const ConversationIdQuerySchema = z.object({
  conversationId: z.string().optional().openapi({
    param: {
      name: 'conversationId',
      in: 'query',
    },
    example: 'conv123',
  }),
});

// Health Check Route
export const healthRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Health check endpoint',
  description: 'Returns the status of the API server',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Server status',
      content: {
        'application/json': {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

// Chat API Routes
export const chatHealthRoute = createRoute({
  method: 'get',
  path: '/api/chat',
  summary: 'Chat API health check',
  description: 'Returns the status of the chat API',
  tags: ['Chat'],
  responses: {
    200: {
      description: 'Chat API status',
      content: {
        'application/json': {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

export const chatPostRoute = createRoute({
  method: 'post',
  path: '/api/chat',
  summary: 'Process chat message',
  description: 'Process a chat message and return AI response or generated tickets',
  tags: ['Chat'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChatRequestSchema,
        },
      },
      description: 'Chat message and configuration',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'AI response or generated tickets',
      content: {
        'application/json': {
          schema: ChatResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid input or provider configuration',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Conversations API Routes
export const conversationsGetRoute = createRoute({
  method: 'get',
  path: '/api/conversations',
  summary: 'Get user conversations',
  description: 'Retrieve all conversations for the authenticated user',
  tags: ['Conversations'],
  responses: {
    200: {
      description: 'List of conversations',
      content: {
        'application/json': {
          schema: ConversationsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationsPostRoute = createRoute({
  method: 'post',
  path: '/api/conversations',
  summary: 'Create new conversation',
  description: 'Create a new conversation',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateConversationRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Created conversation',
      content: {
        'application/json': {
          schema: ConversationResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationGetByIdRoute = createRoute({
  method: 'get',
  path: '/api/conversations/{id}',
  summary: 'Get conversation by ID',
  description: 'Retrieve a specific conversation by its ID',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Conversation details',
      content: {
        'application/json': {
          schema: ConversationResponseSchema,
        },
      },
    },
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationPutByIdRoute = createRoute({
  method: 'put',
  path: '/api/conversations/{id}',
  summary: 'Update conversation',
  description: 'Update a conversation',
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateConversationRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Updated conversation',
      content: {
        'application/json': {
          schema: ConversationResponseSchema,
        },
      },
    },
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationDeleteByIdRoute = createRoute({
  method: 'delete',
  path: '/api/conversations/{id}',
  summary: 'Delete conversation',
  description: 'Delete a conversation',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Conversation deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationShareByIdRoute = createRoute({
  method: 'post',
  path: '/api/conversations/{id}/share',
  summary: 'Share conversation',
  description: 'Generate a shareable link for a conversation',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Share link generated',
      content: {
        'application/json': {
          schema: ShareConversationResponseSchema,
        },
      },
    },
    400: {
      description: 'Failed to share conversation',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const conversationUnshareByIdRoute = createRoute({
  method: 'delete',
  path: '/api/conversations/{id}/share',
  summary: 'Unshare conversation',
  description: 'Remove shared access to a conversation',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Conversation unshared',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: 'Failed to unshare conversation',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Messages API Routes
export const messagesGetRoute = createRoute({
  method: 'get',
  path: '/api/messages',
  summary: 'Get conversation messages',
  description: 'Retrieve messages for a conversation',
  request: {
    query: ConversationIdQuerySchema,
  },
  responses: {
    200: {
      description: 'List of messages',
      content: {
        'application/json': {
          schema: MessagesResponseSchema,
        },
      },
    },
    400: {
      description: 'Missing conversationId parameter',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const messagesPostRoute = createRoute({
  method: 'post',
  path: '/api/messages',
  summary: 'Create message',
  description: 'Create a new message in a conversation',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMessageRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Created message',
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const messageGetByIdRoute = createRoute({
  method: 'get',
  path: '/api/messages/{id}',
  summary: 'Get message by ID',
  description: 'Retrieve a specific message by its ID',
  request: {
    params: IdParamSchema,
    query: ConversationIdQuerySchema,
  },
  responses: {
    200: {
      description: 'Message details',
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
    },
    404: {
      description: 'Message not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const messagePutByIdRoute = createRoute({
  method: 'put',
  path: '/api/messages/{id}',
  summary: 'Update message',
  description: 'Update a message',
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateMessageRequestSchema.partial(),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Updated message',
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
    },
    404: {
      description: 'Message not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const messageDeleteByIdRoute = createRoute({
  method: 'delete',
  path: '/api/messages/{id}',
  summary: 'Delete message',
  description: 'Delete a message',
  request: {
    params: IdParamSchema,
    query: ConversationIdQuerySchema,
  },
  responses: {
    200: {
      description: 'Message deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Message not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Providers API Routes
export const providersTestConnectionRoute = createRoute({
  method: 'post',
  path: '/api/providers/test-connection',
  summary: 'Test provider connection',
  description: 'Test connection to an AI provider',
  tags: ['Providers'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: TestConnectionRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Connection test result',
      content: {
        'application/json': {
          schema: TestConnectionResponseSchema,
        },
      },
    },
    500: {
      description: 'Test connection error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GitLab API Routes
export const gitlabCreateIssuesGetRoute = createRoute({
  method: 'get',
  path: '/api/gitlab/create-issues',
  summary: 'GitLab create issues health check',
  description: 'Health check for GitLab issue creation endpoint',
  responses: {
    200: {
      description: 'GitLab API status',
      content: {
        'application/json': {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

export const gitlabCreateIssuesRoute = createRoute({
  method: 'post',
  path: '/api/gitlab/create-issues',
  summary: 'Create GitLab issues',
  description: 'Create issues in a single GitLab project',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GitLabCreateIssuesRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Issues created successfully',
      content: {
        'application/json': {
          schema: GitLabCreateIssuesResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid input or GitLab configuration',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const gitlabCreateIssuesMultiGetRoute = createRoute({
  method: 'get',
  path: '/api/gitlab/create-issues-multi',
  summary: 'GitLab create multi-project issues health check',
  description: 'Health check for GitLab multi-project issue creation endpoint',
  responses: {
    200: {
      description: 'GitLab multi-project API status',
      content: {
        'application/json': {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

export const gitlabCreateIssuesMultiRoute = createRoute({
  method: 'post',
  path: '/api/gitlab/create-issues-multi',
  summary: 'Create GitLab issues across multiple projects',
  description: 'Create issues across multiple GitLab projects',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GitLabCreateIssuesMultiRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Issues created successfully across projects',
      content: {
        'application/json': {
          schema: GitLabCreateIssuesMultiResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request - invalid input or GitLab configuration',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Shared API Routes
export const sharedGetRoute = createRoute({
  method: 'get',
  path: '/api/shared/{shareId}',
  summary: 'Get shared conversation',
  description: 'Retrieve a shared conversation by share ID (public access)',
  request: {
    params: ShareIdParamSchema,
  },
  responses: {
    200: {
      description: 'Shared conversation details',
      content: {
        'application/json': {
          schema: SharedResponseSchema,
        },
      },
    },
    404: {
      description: 'Shared conversation not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});