import { createProviderWithConfig } from '../lib/llm';
import { ConversationRepository, MessageRepository } from '../lib/db/repositories';
import type { LLMMessage, LLMTool } from '../lib/llm/base';
import type { Message } from '../lib/schemas';
import { generateId } from '../lib/utils';
import { stringifyJsonField } from '../lib/db/utils';
import { optionalAuthMiddleware } from '../middleware/auth';
import type { Context } from 'hono';

// GET endpoint for health check
export const chatGet = (c: Context) => {
  return c.json({ message: 'Chat API is running' });
};

// POST endpoint for chat processing
export const chatPost = async (c: Context) => {
  try {
    const body = await c.req.json();

    // Extract data including conversationId for database storage
    const {
      message,
      mode,
      provider,
      config,
      conversationHistory = [],
      conversationId,
      mcpConfig,
    } = body;

    // Get user ID from middleware context
    const userId = c.get('userId') as string | null;

    // Create the LLM provider with the provided config
    const llmProvider = await createProviderWithConfig({
      ...config,
      provider,
    });

    // Initialize MCP tools if available
    const availableTools: LLMTool[] = [];
    if (mcpConfig?.enabled && mcpConfig?.servers?.length > 0) {
      // Get tools from enabled MCP servers
      const enabledServers = mcpConfig.servers.filter(
        (server: Record<string, unknown>) => server.enabled
      );

      for (const server of enabledServers) {
        if (server.id === 'github-mcp') {
          // Add GitHub MCP tools
          availableTools.push(
            {
              name: 'list_repositories',
              description: 'List repositories for a user or organization',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'GitHub username or organization' },
                  per_page: {
                    type: 'number',
                    description: 'Number of repositories per page',
                    default: 30,
                  },
                },
                required: ['owner'],
              },
            },
            {
              name: 'get_repository_info',
              description: 'Get detailed information about a specific repository',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'Repository owner' },
                  repo: { type: 'string', description: 'Repository name' },
                },
                required: ['owner', 'repo'],
              },
            },
            {
              name: 'list_issues',
              description: 'List issues for a repository',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'Repository owner' },
                  repo: { type: 'string', description: 'Repository name' },
                  state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
                  per_page: {
                    type: 'number',
                    description: 'Number of issues per page',
                    default: 30,
                  },
                },
                required: ['owner', 'repo'],
              },
            },
            {
              name: 'create_issue',
              description: 'Create a new issue in a repository',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'Repository owner' },
                  repo: { type: 'string', description: 'Repository name' },
                  title: { type: 'string', description: 'Issue title' },
                  body: { type: 'string', description: 'Issue description' },
                  labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' },
                  assignees: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Issue assignees',
                  },
                },
                required: ['owner', 'repo', 'title'],
              },
            },
            {
              name: 'get_file',
              description:
                'Get the content of any file from a repository (README, package.json, source code, etc.)',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'Repository owner' },
                  repo: { type: 'string', description: 'Repository name' },
                  file_path: {
                    type: 'string',
                    description:
                      'Path to the file (e.g. "README.md", "package.json", "src/index.js")',
                  },
                  branch: { type: 'string', description: 'Branch name', default: 'main' },
                },
                required: ['owner', 'repo', 'file_path'],
              },
            },
            {
              name: 'list_repository_contents',
              description: 'List the contents of a directory in a repository',
              parameters: {
                type: 'object',
                properties: {
                  owner: { type: 'string', description: 'Repository owner' },
                  repo: { type: 'string', description: 'Repository name' },
                  path: {
                    type: 'string',
                    description: 'Directory path (empty for root)',
                    default: '',
                  },
                  branch: { type: 'string', description: 'Branch name', default: 'main' },
                },
                required: ['owner', 'repo'],
              },
            },
            {
              name: 'search_repositories',
              description: 'Search for repositories on GitHub',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' },
                  sort: { type: 'string', enum: ['stars', 'forks', 'updated'], default: 'stars' },
                  order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                  per_page: {
                    type: 'number',
                    description: 'Number of results per page',
                    default: 30,
                  },
                },
                required: ['query'],
              },
            }
          );
        } else if (server.id === 'gitlab-mcp') {
          // Add GitLab MCP tools (same as in original file)
          availableTools.push(
            {
              name: 'list_projects',
              description: 'List projects for a user/group or all accessible projects',
              parameters: {
                type: 'object',
                properties: {
                  owner: {
                    type: 'string',
                    description: 'GitLab username or group name (optional)',
                  },
                  per_page: {
                    type: 'number',
                    description: 'Number of projects per page',
                    default: 30,
                  },
                },
                required: [],
              },
            },
            {
              name: 'get_project_info',
              description: 'Get detailed information about a specific project',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                },
                required: ['project_id'],
              },
            },
            {
              name: 'gitlab_list_issues',
              description: 'List issues for a GitLab project',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  state: { type: 'string', enum: ['opened', 'closed', 'all'], default: 'opened' },
                  per_page: {
                    type: 'number',
                    description: 'Number of issues per page',
                    default: 30,
                  },
                },
                required: ['project_id'],
              },
            },
            {
              name: 'gitlab_create_issue',
              description: 'Create a new issue in a GitLab project',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  title: { type: 'string', description: 'Issue title' },
                  description: { type: 'string', description: 'Issue description' },
                  labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' },
                  assignee_ids: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'User IDs to assign',
                  },
                },
                required: ['project_id', 'title'],
              },
            },
            {
              name: 'gitlab_get_issue',
              description: 'Get detailed information about a specific GitLab issue',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  issue_iid: {
                    type: 'number',
                    description: 'Issue internal ID (the number shown in UI)',
                  },
                },
                required: ['project_id', 'issue_iid'],
              },
            },
            {
              name: 'gitlab_get_file',
              description:
                'Get the content of any file from a GitLab project (README, package.json, source code, etc.)',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  file_path: {
                    type: 'string',
                    description:
                      'Path to the file (e.g. "README.md", "package.json", "src/index.js")',
                  },
                  branch: { type: 'string', description: 'Branch name', default: 'main' },
                },
                required: ['project_id', 'file_path'],
              },
            },
            {
              name: 'list_repository_tree',
              description: 'List the contents of a directory in a project repository',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  path: {
                    type: 'string',
                    description: 'Directory path (empty for root)',
                    default: '',
                  },
                  branch: { type: 'string', description: 'Branch name', default: 'main' },
                },
                required: ['project_id'],
              },
            },
            {
              name: 'search_projects',
              description: 'Search for projects on GitLab',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' },
                  order_by: {
                    type: 'string',
                    enum: ['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at'],
                    default: 'last_activity_at',
                  },
                  sort: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                  per_page: {
                    type: 'number',
                    description: 'Number of results per page',
                    default: 30,
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'list_merge_requests',
              description: 'List merge requests for a project',
              parameters: {
                type: 'object',
                properties: {
                  project_id: {
                    type: 'string',
                    description: 'Project ID or path (e.g., "123" or "group/project")',
                  },
                  state: {
                    type: 'string',
                    enum: ['opened', 'closed', 'merged', 'all'],
                    default: 'opened',
                  },
                  per_page: {
                    type: 'number',
                    description: 'Number of merge requests per page',
                    default: 30,
                  },
                },
                required: ['project_id'],
              },
            }
          );
        } else if (server.id === 'fetch-mcp') {
          // Add Fetch MCP tools
          availableTools.push({
            name: 'fetch',
            description: 'Fetch content from a URL (web scraping, API calls)',
            parameters: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL to fetch content from' },
                method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
                headers: { type: 'object', description: 'HTTP headers to include' },
                body: { type: 'string', description: 'Request body for POST requests' },
              },
              required: ['url'],
            },
          });
        }
      }
    }

    // Tool execution function - call the actual MCP server
    const executeTool = async (toolName: string, parameters: Record<string, unknown>) => {
      if (!mcpConfig?.enabled) return null;

      // Find the appropriate server for this tool
      let server;
      if (
        [
          'list_repositories',
          'get_repository_info',
          'list_issues',
          'create_issue',
          'get_issue',
          'get_file',
          'list_repository_contents',
          'search_repositories',
        ].includes(toolName)
      ) {
        server = mcpConfig.servers.find(
          (s: Record<string, unknown>) => s.id === 'github-mcp' && s.enabled
        );
      } else if (
        [
          'list_projects',
          'get_project_info',
          'gitlab_list_issues',
          'gitlab_create_issue',
          'gitlab_get_issue',
          'gitlab_get_file',
          'list_repository_tree',
          'search_projects',
          'list_merge_requests',
        ].includes(toolName)
      ) {
        server = mcpConfig.servers.find(
          (s: Record<string, unknown>) => s.id === 'gitlab-mcp' && s.enabled
        );
      } else if (toolName === 'fetch') {
        server = mcpConfig.servers.find(
          (s: Record<string, unknown>) => s.id === 'fetch-mcp' && s.enabled
        );
      }
      if (!server) return null;

      try {
        // Call the actual MCP server using stdio
        const { spawn } = await import('child_process');
        return new Promise((resolve, reject) => {
          // For UV, we need to run it properly
          const mcpProcess = spawn(server.command, server.args, {
            cwd: server.cwd,
            env: {
              ...process.env,
              ...server.env,
              PATH: process.env.PATH, // Ensure PATH is preserved
            },
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true, // Use shell to properly resolve UV
          });

          let responseData = '';
          let initialized = false;

          mcpProcess.stdout.on('data', data => {
            responseData += data.toString();

            // Process line by line for MCP protocol
            const lines = responseData.split('\n');
            responseData = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const response = JSON.parse(line);

                if (!initialized && response.id === 1) {
                  // Send initialized notification first
                  const initNotification = {
                    jsonrpc: '2.0',
                    method: 'notifications/initialized',
                  };
                  mcpProcess.stdin.write(JSON.stringify(initNotification) + '\n');

                  // Now call the tool
                  initialized = true;
                  const toolRequest = {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                      name: toolName,
                      arguments: parameters,
                    },
                  };
                  mcpProcess.stdin.write(JSON.stringify(toolRequest) + '\n');
                } else if (response.id === 2) {
                  // Tool call response
                  if (response.error) {
                    reject(new Error(response.error.message || 'Tool call failed'));
                  } else {
                    // Extract the actual result from MCP response structure
                    const result =
                      response.result?.structuredContent?.result ||
                      response.result?.content?.[0]?.text ||
                      response.result;
                    resolve(result);
                  }
                  mcpProcess.kill();
                }
              } catch {
                // Ignore non-JSON lines (like the banner)
              }
            }
          });

          mcpProcess.on('close', code => {
            if (!initialized) {
              reject(new Error(`MCP server failed to initialize (code ${code})`));
            }
          });

          mcpProcess.stderr.on('data', () => {
            // Ignore stderr output from MCP server
          });

          // Start MCP initialization
          const initRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'PromptToIssue',
                version: '1.0.0',
              },
            },
          };

          mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
        });
      } catch (error) {
        console.error('MCP execution error:', error);
        return null;
      }
    };

    // Validate provider configuration
    const isConfigValid = await llmProvider.validateConfiguration();
    if (!isConfigValid) {
      return c.json(
        { error: `${provider} provider is not properly configured. Please check your API key.` },
        400
      );
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Save user message to database if conversationId exists
    if (conversationId && userId) {
      try {
        // First check if conversation exists by trying to get it
        const existingConversation = await conversationRepo.getConversationById(
          conversationId,
          userId
        );

        if (!existingConversation) {
          console.warn(
            `Conversation ${conversationId} not found for user ${userId}, skipping message save`
          );
          // Continue without saving to database
        } else {
          await messageRepo.createMessage({
            conversationId,
            role: 'user',
            content: message,
            mode,
            metadata: stringifyJsonField({}),
          });

          // Update conversation lastMessageAt
          await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
            lastMessageAt: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.error('Database error saving user message:', dbError);
        // Continue with API call even if database save fails
      }
    } else if (conversationId && !userId) {
      console.warn('No user ID provided, skipping message save');
    }

    // Convert conversation history to LLM format
    const llmMessages: LLMMessage[] = [
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Generate response from LLM with available tools and tool execution capability
    const aiResponse = await llmProvider.generateResponse(llmMessages, mode, {
      tools: availableTools,
      toolExecutor: executeTool,
    });

    // Save assistant response to database if conversationId exists
    if (conversationId && aiResponse.type === 'assistant' && userId) {
      try {
        // Check if conversation still exists
        const existingConversation = await conversationRepo.getConversationById(
          conversationId,
          userId
        );

        if (existingConversation) {
          await messageRepo.createMessage({
            conversationId,
            role: 'assistant',
            content: aiResponse.content,
            mode,
            metadata: stringifyJsonField({}),
          });

          // Update conversation lastMessageAt again
          await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
            lastMessageAt: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.error('Database error saving assistant message:', dbError);
        // Continue without affecting the response
      }
    }

    // For ticket mode, add unique IDs to tickets if they don't have them
    if (aiResponse.type === 'tickets') {
      aiResponse.tickets = aiResponse.tickets.map((ticket: any) => ({
        ...ticket,
        id: ticket.id || generateId(),
        acceptanceCriteria: ticket.acceptanceCriteria.map((ac: any) => ({
          ...ac,
          id: ac.id || generateId(),
        })),
        tasks: ticket.tasks.map((task: any) => ({
          ...task,
          id: task.id || generateId(),
        })),
      }));

      // Save assistant ticket response to database if conversationId exists
      if (conversationId && userId) {
        try {
          // Check if conversation still exists
          const existingConversation = await conversationRepo.getConversationById(
            conversationId,
            userId
          );

          if (existingConversation) {
            let responseContent = `I've analyzed your requirements and created ${aiResponse.tickets.length} ticket(s). `;
            responseContent += aiResponse.reasoning;

            if (aiResponse.needsClarification && aiResponse.clarificationQuestions) {
              responseContent +=
                '\n\nI have some questions to better understand your requirements:\n';
              responseContent += aiResponse.clarificationQuestions.map((q: any) => `• ${q}`).join('\n');
            }

            await messageRepo.createMessage({
              conversationId,
              role: 'assistant',
              content: responseContent,
              mode,
              metadata: stringifyJsonField({ tickets: aiResponse.tickets }),
            });

            // Update conversation lastMessageAt
            await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
              lastMessageAt: new Date().toISOString(),
            });
          }
        } catch (dbError) {
          console.error('Database error saving ticket response:', dbError);
          // Continue without affecting the response
        }
      }
    }

    return c.json(aiResponse);
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      return c.json(
        { error: `Failed to process request: ${error.message}` },
        500
      );
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
};