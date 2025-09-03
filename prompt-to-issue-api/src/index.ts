import { OpenAPIHono } from '@hono/zod-openapi';
import { handle } from 'hono/aws-lambda';
import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { corsMiddleware } from './middleware/cors';
import { optionalAuthMiddleware, authMiddleware } from './middleware/auth';

// Import all OpenAPI routes
import {
  healthRoute,
  chatHealthRoute,
  chatPostRoute,
  conversationsGetRoute,
  conversationsPostRoute,
  conversationGetByIdRoute,
  conversationPutByIdRoute,
  conversationDeleteByIdRoute,
  conversationShareByIdRoute,
  conversationUnshareByIdRoute,
  messagesGetRoute,
  messagesPostRoute,
  messageGetByIdRoute,
  messagePutByIdRoute,
  messageDeleteByIdRoute,
  providersTestConnectionRoute,
  gitlabCreateIssuesGetRoute,
  gitlabCreateIssuesRoute,
  gitlabCreateIssuesMultiGetRoute,
  gitlabCreateIssuesMultiRoute,
  sharedGetRoute,
} from './lib/openapi-routes';

// Import route handlers
import { chatGet, chatPost } from './routes/chat';
import { 
  conversationsGet, 
  conversationsPost, 
  conversationGetById, 
  conversationPutById, 
  conversationDeleteById, 
  conversationShareById, 
  conversationUnshareById 
} from './routes/conversations';
import { 
  messagesGet, 
  messagesPost, 
  messageGetById, 
  messagePutById, 
  messageDeleteById 
} from './routes/messages';
import { providersTestConnection } from './routes/providers';
import { 
  gitlabCreateIssuesGet, 
  gitlabCreateIssues, 
  gitlabCreateIssuesMultiGet, 
  gitlabCreateIssuesMulti 
} from './routes/gitlab';
import { sharedGet } from './routes/shared';

const app = new OpenAPIHono();

// Apply CORS middleware globally
app.use('*', corsMiddleware);

// Health check endpoint
app.openapi(healthRoute, (c) => {
  return c.json({ 
    message: 'PromptToIssue Hono API Server', 
    version: '1.0.0',
    status: 'running'
  });
});

// Chat API routes
app.openapi(chatHealthRoute, chatGet);
app.openapi(chatPostRoute, optionalAuthMiddleware, chatPost);

// Conversations API routes
app.openapi(conversationsGetRoute, authMiddleware, conversationsGet);
app.openapi(conversationsPostRoute, conversationsPost);
app.openapi(conversationGetByIdRoute, authMiddleware, conversationGetById);
app.openapi(conversationPutByIdRoute, authMiddleware, conversationPutById);
app.openapi(conversationDeleteByIdRoute, authMiddleware, conversationDeleteById);
app.openapi(conversationShareByIdRoute, authMiddleware, conversationShareById);
app.openapi(conversationUnshareByIdRoute, authMiddleware, conversationUnshareById);

// Messages API routes
app.openapi(messagesGetRoute, authMiddleware, messagesGet);
app.openapi(messagesPostRoute, authMiddleware, messagesPost);
app.openapi(messageGetByIdRoute, authMiddleware, messageGetById);
app.openapi(messagePutByIdRoute, authMiddleware, messagePutById);
app.openapi(messageDeleteByIdRoute, authMiddleware, messageDeleteById);

// Providers API routes
app.openapi(providersTestConnectionRoute, providersTestConnection);

// GitLab API routes
app.openapi(gitlabCreateIssuesGetRoute, gitlabCreateIssuesGet);
app.openapi(gitlabCreateIssuesRoute, gitlabCreateIssues);
app.openapi(gitlabCreateIssuesMultiGetRoute, gitlabCreateIssuesMultiGet);
app.openapi(gitlabCreateIssuesMultiRoute, gitlabCreateIssuesMulti);

// Shared API routes (public, no auth required)
app.openapi(sharedGetRoute, sharedGet);

// OpenAPI Documentation
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'PromptToIssue API',
    description: 'AI-powered ticket generation API with multi-provider LLM support and GitLab integration',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Chat',
      description: 'AI chat and ticket generation',
    },
    {
      name: 'Conversations',
      description: 'Conversation management',
    },
    {
      name: 'Messages',
      description: 'Message management',
    },
    {
      name: 'Providers',
      description: 'AI provider testing',
    },
    {
      name: 'GitLab',
      description: 'GitLab integration for issue creation',
    },
    {
      name: 'Shared',
      description: 'Public shared conversation access',
    },
  ],
});

// Swagger UI
app.get('/ui', swaggerUI({ url: '/doc' }));

// Only run the server if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/ui`);
  console.log(`OpenAPI spec available at: http://localhost:${port}/doc`);
  
  serve({
    fetch: app.fetch,
    port
  });
}

export const handler = handle(app);