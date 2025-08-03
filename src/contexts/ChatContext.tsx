'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from '@/lib/utils';
import type {
  Message,
  ChatMode,
  LLMProvider,
  LLMConfig,
  AIResponse,
  Ticket,
  GitLabConfig,
  ProjectSelection,
  MCPServer,
  MCPConfig,
} from '@/lib/schemas';

// Custom conversation type for UI
type UIConversation = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date | string;
  mode: 'ticket' | 'assistant';
  messageCount: number;
  provider: string;
  isArchived: boolean;
};

// Chat context interface
interface ChatContextType {
  // State
  messages: Message[];
  currentMode: ChatMode;
  currentProvider: LLMProvider;
  isLoading: boolean;
  pendingTickets: Ticket[];

  // Conversation Management
  conversations: UIConversation[];
  currentConversationId: string | null;

  // GitLab Integration
  gitlabConfig: GitLabConfig | null;
  showProjectSelection: boolean;

  // MCP Integration
  mcpConfig: MCPConfig;

  // Actions
  sendMessage: (content: string) => Promise<string | null>;
  setMode: (mode: ChatMode) => void;
  setProvider: (provider: LLMProvider) => void;
  clearMessages: () => void;
  addMessage: (content: string, role: 'user' | 'assistant', conversationId?: string) => void;
  approveTickets: () => void;
  rejectTickets: () => void;
  editTicket: (ticketId: string, updates: Partial<Ticket>) => Promise<void>;
  setPendingTickets: (tickets: Ticket[]) => void;

  // Conversation Actions
  createNewConversation: (title?: string, clearUI?: boolean) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  loadConversationsForUser: (userId: string) => void;

  // Share Actions
  createShareLink: (conversationId: string) => Promise<{ shareId: string; shareUrl: string }>;
  removeShareLink: (conversationId: string) => Promise<void>;

  // GitLab Actions
  setGitLabConfig: (config: GitLabConfig) => void;
  createGitLabIssues: (tickets: Ticket[], projectSelection: ProjectSelection) => Promise<void>;
  setShowProjectSelection: (show: boolean) => void;

  // MCP Actions
  updateMCPConfig: (config: Partial<MCPConfig>) => void;
  updateMCPServers: (servers: MCPServer[]) => void;

  // Configuration
  providerConfigs: Record<LLMProvider, LLMConfig>;
  updateProviderConfig: (provider: LLMProvider, config: Partial<LLMConfig>) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Chat provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<ChatMode>('ticket');
  const [currentProvider, setCurrentProvider] = useState<LLMProvider>('ollama');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);

  // Conversation state - using a custom type that matches our API response
  const [conversations, setConversations] = useState<UIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Provider configurations
  const [providerConfigs, setProviderConfigs] = useState<Record<LLMProvider, LLMConfig>>({
    openai: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 4000,
      temperature: 0.7,
      baseUrl: '',
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      maxTokens: 4000,
      temperature: 0.7,
    },
    google: {
      provider: 'google',
      model: 'gemini-pro',
      maxTokens: 4000,
      temperature: 0.7,
    },
    ollama: {
      provider: 'ollama',
      model: 'mistral:latest',
      baseUrl: 'http://localhost:11434',
      maxTokens: 4000,
      temperature: 0.7,
    },
  });

  const [gitlabConfig, setGitlabConfig] = useState<GitLabConfig | null>(null);
  const [showProjectSelection, setShowProjectSelection] = useState(false);

  // MCP Configuration
  const [mcpConfig, setMcpConfig] = useState<MCPConfig>({
    servers: [],
    enabled: false,
  });

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (user?.id) {
      headers['x-user-id'] = user.id;
    }

    return headers;
  }, [user?.id]);

  // Load persisted state from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('chatMode') as ChatMode;
    const savedProvider = localStorage.getItem('chatProvider') as LLMProvider;
    const savedConfigs = localStorage.getItem('providerConfigs');
    const savedMcpConfig = localStorage.getItem('mcpConfig');

    if (savedMode) setCurrentMode(savedMode);
    if (savedProvider) setCurrentProvider(savedProvider);
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        // Force update if Ollama config has wrong model name
        if (configs.ollama?.model === 'mistral' || configs.ollama?.model === 'llama2') {
          configs.ollama.model = 'mistral:latest';
        }
        setProviderConfigs(configs);
      } catch (error) {
        console.error('Failed to parse saved provider configs:', error);
        // Clear corrupted localStorage
        localStorage.removeItem('providerConfigs');
      }
    }
    if (savedMcpConfig) {
      try {
        setMcpConfig(JSON.parse(savedMcpConfig));
      } catch (error) {
        console.error('Failed to parse saved MCP config:', error);
        localStorage.removeItem('mcpConfig');
      }
    }
  }, []);

  // Load GitLab config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gitlabConfig');
    if (saved) {
      try {
        setGitlabConfig(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse GitLab config:', error);
      }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('chatMode', currentMode);
  }, [currentMode]);

  useEffect(() => {
    localStorage.setItem('chatProvider', currentProvider);
  }, [currentProvider]);

  useEffect(() => {
    localStorage.setItem('providerConfigs', JSON.stringify(providerConfigs));
  }, [providerConfigs]);

  // Persist MCP config
  useEffect(() => {
    localStorage.setItem('mcpConfig', JSON.stringify(mcpConfig));
  }, [mcpConfig]);

  // Persist GitLab config
  useEffect(() => {
    if (gitlabConfig) {
      localStorage.setItem('gitlabConfig', JSON.stringify(gitlabConfig));
    }
  }, [gitlabConfig]);

  // Helper function to save messages to database
  const saveMessageToDatabase = useCallback(
    async (conversationId: string, role: 'user' | 'assistant', content: string) => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            role,
            content,
            mode: currentMode,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save message');
        }
      } catch (error) {
        console.error('Database error saving message:', error);
        // Don't throw - we don't want to break the UI if database save fails
      }
    },
    [currentMode]
  );

  const addMessage = useCallback(
    (content: string, role: 'user' | 'assistant', conversationId?: string) => {
      const newMessage: Message = {
        id: generateId(),
        role,
        content,
        timestamp: new Date(),
        mode: currentMode,
      };

      setMessages(prev => [...prev, newMessage]);

      // Use the provided conversationId or fall back to currentConversationId
      const targetConversationId = conversationId || currentConversationId;

      // Update message count for current conversation
      if (targetConversationId) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === targetConversationId
              ? {
                  ...conv,
                  messageCount: conv.messageCount + 1,
                  lastMessage: content.length > 50 ? content.substring(0, 50) + '...' : content,
                  timestamp: new Date(),
                }
              : conv
          )
        );

        // Only save message to database if conversationId is not provided (no active conversation)
        // When conversationId is provided, the API already handles saving to avoid duplicates
        if (!conversationId && targetConversationId) {
          saveMessageToDatabase(targetConversationId, role, content).catch(error => {
            console.error('Failed to save message to database:', error);
          });
        }
      }

      return newMessage;
    },
    [currentConversationId, currentMode, saveMessageToDatabase]
  );

  // Add message to UI only (don't save to database)
  const addMessageToUIOnly = useCallback(
    (content: string, role: 'user' | 'assistant', conversationId?: string) => {
      const newMessage: Message = {
        id: generateId(),
        role,
        content,
        timestamp: new Date(),
        mode: currentMode,
      };

      setMessages(prev => [...prev, newMessage]);

      // Use the provided conversationId or fall back to currentConversationId
      const targetConversationId = conversationId || currentConversationId;

      // Update message count for current conversation but don't save to database
      if (targetConversationId) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === targetConversationId
              ? {
                  ...conv,
                  messageCount: conv.messageCount + 1,
                  lastMessage: content.length > 50 ? content.substring(0, 50) + '...' : content,
                  timestamp: new Date(),
                }
              : conv
          )
        );
      }

      return newMessage;
    },
    [currentConversationId, currentMode]
  );

  const generateConversationTitle = (content: string): string => {
    // Extract first meaningful part of the message for title
    const cleanContent = content.trim();
    if (cleanContent.length <= 50) {
      return cleanContent;
    }

    // Try to find a good break point
    const words = cleanContent.split(' ');
    let title = '';
    for (const word of words) {
      if ((title + word).length > 50) break;
      title += (title ? ' ' : '') + word;
    }

    return title + '...';
  };

  // Real conversation management functions
  const loadUserConversations = useCallback(
    async (userId?: string) => {
      if (!userId || !user?.id) return;

      try {
        const response = await fetch('/api/conversations', {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    },
    [getAuthHeaders, user?.id]
  );

  const createNewConversation = useCallback(
    async (title?: string, clearUI = true) => {
      try {
        // Only clear current state if explicitly requested (for manual "New Chat" button)
        if (clearUI) {
          setMessages([]);
          setPendingTickets([]);
          setCurrentConversationId(null);
        }

        if (!title) {
          // Just clear the UI, don't create DB entry yet
          if (clearUI) {
            setMessages([]);
            setPendingTickets([]);
            setCurrentConversationId(null);
          }
          return { id: null };
        }

        // Get current user ID - this should be passed from parent component
        const userId =
          typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('currentUser') || '{}').id
            : null;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId,
            title,
            mode: currentMode,
            provider: currentProvider,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newConversation = data.conversation;

          setCurrentConversationId(newConversation.id);
          setConversations(prev => [newConversation, ...prev]);

          return newConversation;
        } else {
          throw new Error('Failed to create conversation');
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },
    [currentMode, currentProvider, getAuthHeaders]
  );

  const sendMessage = useCallback(
    async (content: string): Promise<string | null> => {
      if (!content.trim() || isLoading) return null;

      setIsLoading(true);
      setPendingTickets([]);

      // Declare conversationId outside try block so it's accessible in catch
      let conversationId = currentConversationId;

      try {
        // If no current conversation, create one first
        if (!conversationId) {
          const title = generateConversationTitle(content);
          const newConv = await createNewConversation(title, false); // Don't clear UI
          conversationId = newConv?.id;

          // Set the conversation ID immediately so the message count updates work
          setCurrentConversationId(conversationId);
        }

        // Only proceed if we have a valid conversation ID
        if (!conversationId) {
          throw new Error('Failed to create or get conversation ID');
        }

        // Add user message after conversation is created
        addMessage(content, 'user', conversationId);

        // Add minimum delay to ensure loading indicator is visible
        const apiCallPromise = fetch('/api/chat', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            message: content,
            mode: currentMode,
            provider: currentProvider,
            config: providerConfigs[currentProvider],
            conversationHistory: messages.slice(-10), // Last 10 messages for context: Increase this number to increase context if needed
            conversationId, // Include conversation ID for database storage
            mcpConfig, // Include MCP configuration for tool access
          }),
        });

        const delayPromise = new Promise(resolve => setTimeout(resolve, 800)); // Minimum 800ms delay

        // Wait for both API call and minimum delay
        const [response] = await Promise.all([apiCallPromise, delayPromise]);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`
          );
        }

        const aiResponse: AIResponse = await response.json();

        if (aiResponse.type === 'assistant') {
          addMessage(aiResponse.content, 'assistant', conversationId);
        } else if (aiResponse.type === 'tickets') {
          // Handle ticket response
          setPendingTickets(aiResponse.tickets);

          let responseContent = `I've analyzed your requirements and created ${aiResponse.tickets.length} ticket(s). `;
          responseContent += aiResponse.reasoning;

          if (aiResponse.needsClarification && aiResponse.clarificationQuestions) {
            responseContent +=
              '\n\nI have some questions to better understand your requirements:\n';
            responseContent += aiResponse.clarificationQuestions.map(q => `• ${q}`).join('\n');
          }

          // Add message to UI but don't save to database (API already saved it with metadata)
          addMessageToUIOnly(responseContent, 'assistant', conversationId);
        }

        // Return the conversation ID for navigation
        return conversationId;
      } catch (error) {
        console.error('Error sending message:', error);
        // Only add error message if we have a valid conversation ID
        if (conversationId) {
          addMessage(
            'I apologize, but I encountered an error. Please try again.',
            'assistant',
            conversationId
          );
        } else {
          addMessage('I apologize, but I encountered an error. Please try again.', 'assistant');
        }
        return conversationId; // Return the ID even on error if we have one
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      currentConversationId,
      currentMode,
      currentProvider,
      providerConfigs,
      mcpConfig,
      messages,
      createNewConversation,
      addMessage,
      addMessageToUIOnly,
      getAuthHeaders,
    ]
  );

  const setMode = (mode: ChatMode) => {
    setCurrentMode(mode);
    // Clear pending tickets when switching modes
    if (mode === 'assistant') {
      setPendingTickets([]);
    }
  };

  const setProvider = (provider: LLMProvider) => {
    setCurrentProvider(provider);
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingTickets([]);
    setCurrentConversationId(null);
  }, []);

  const approveTickets = () => {
    // Check if GitLab is configured
    if (!gitlabConfig || !gitlabConfig.baseUrl || !gitlabConfig.accessToken) {
      addMessage(
        '⚠️ GitLab integration is not configured. Please configure GitLab settings first.',
        'assistant'
      );
      return;
    }

    // Show project selection modal
    setShowProjectSelection(true);
  };

  const createGitLabIssues = async (tickets: Ticket[], projectSelection: ProjectSelection) => {
    if (!gitlabConfig) {
      addMessage('❌ GitLab configuration is missing.', 'assistant');
      return;
    }

    try {
      setIsLoading(true);
      setShowProjectSelection(false);

      // Call GitLab API to create issues
      const response = await fetch('/api/gitlab/create-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets,
          projectSelection,
          gitlabConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create GitLab issues');
      }

      const result = await response.json();

      // Build success message
      let message = `✅ ${result.message}`;

      if (result.issues && result.issues.length > 0) {
        message += '\n\n**Created Issues:**\n';
        result.issues.forEach((issue: { issueNumber: number; url: string; title: string }) => {
          message += `• [#${issue.issueNumber}](${issue.url}) - ${issue.title}\n`;
        });
      }

      if (result.errors && result.errors.length > 0) {
        message += '\n\n**Failed to create:**\n';
        result.errors.forEach((error: { title: string; error: string }) => {
          message += `• ${error.title}: ${error.error}\n`;
        });
      }

      addMessage(message, 'assistant');
      setPendingTickets([]);
    } catch (error) {
      console.error('Error creating GitLab issues:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addMessage(`❌ Failed to create GitLab issues: ${errorMessage}`, 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const rejectTickets = () => {
    setPendingTickets([]);
    addMessage('Please provide more details or clarify your requirements.', 'assistant');
  };

  const editTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    // Update local state immediately for responsive UI
    setPendingTickets(prev =>
      prev.map(ticket => (ticket.id === ticketId ? { ...ticket, ...updates } : ticket))
    );

    // Also update the message metadata in the database if we have a current conversation
    if (currentConversationId) {
      try {
        // Find the message that contains these tickets
        const messageWithTickets = messages.find(
          msg =>
            msg.role === 'assistant' &&
            (msg as Message & { metadata?: { tickets?: Ticket[] } }).metadata?.tickets &&
            Array.isArray(
              (msg as Message & { metadata?: { tickets?: Ticket[] } }).metadata!.tickets
            ) &&
            (msg as Message & { metadata?: { tickets?: Ticket[] } }).metadata!.tickets!.some(
              (ticket: Ticket) => ticket.id === ticketId
            )
        );

        if (messageWithTickets) {
          // Update the tickets in the message metadata
          const extendedMessage = messageWithTickets as Message & {
            metadata?: { tickets?: Ticket[] };
          };
          const updatedTickets = extendedMessage.metadata!.tickets!.map((ticket: Ticket) =>
            ticket.id === ticketId ? { ...ticket, ...updates } : ticket
          );

          // Update the message in the database
          await fetch(`/api/messages/${messageWithTickets.id}`, {
            method: 'PATCH',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationId: currentConversationId,
              metadata: { ...extendedMessage.metadata, tickets: updatedTickets },
            }),
          });

          // Update local messages state to reflect the change
          setMessages(prev =>
            prev.map(msg => {
              if (msg.id === messageWithTickets.id) {
                const extendedMsg = msg as Message & { metadata?: { tickets?: Ticket[] } };
                return {
                  ...msg,
                  metadata: { ...extendedMsg.metadata, tickets: updatedTickets },
                } as Message & { metadata?: { tickets?: Ticket[] } };
              }
              return msg;
            })
          );
        }
      } catch (error) {
        console.error('Failed to persist ticket changes:', error);
        // Note: We don't revert the local state since the user might try to save again
      }
    }
  };

  const updateProviderConfig = (provider: LLMProvider, config: Partial<LLMConfig>) => {
    setProviderConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], ...config },
    }));
  };

  // MCP Configuration functions
  const updateMCPConfig = useCallback((config: Partial<MCPConfig>) => {
    setMcpConfig(prev => ({ ...prev, ...config }));
  }, []);

  const updateMCPServers = useCallback((servers: MCPServer[]) => {
    setMcpConfig(prev => ({ ...prev, servers }));
  }, []);

  // Add a function to load conversations from parent component
  const loadConversationsForUser = useCallback(
    (userId: string) => {
      loadUserConversations(userId);
    },
    [loadUserConversations]
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/conversations/${conversationId}`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();

          // Load conversation messages
          setMessages(data.messages || []);
          setCurrentConversationId(conversationId);

          // Update current mode/provider based on conversation
          setCurrentMode(data.conversation.mode);
          setCurrentProvider(data.conversation.provider);

          setPendingTickets([]); // Clear any pending tickets
        } else if (response.status === 404 || response.status === 401) {
          // Conversation not found or unauthorized - don't show error message
          // Clear current state silently
          setMessages([]);
          setCurrentConversationId(null);
          setPendingTickets([]);
          // Throw a special error that the component can handle
          throw new Error('CONVERSATION_NOT_FOUND');
        } else {
          // // For other errors (500, etc.), also treat as not found
          // console.log(
          //   'Error loading conversation (treating as not found):',
          //   response.status,
          //   conversationId
          // );
          setMessages([]);
          setCurrentConversationId(null);
          setPendingTickets([]);
          throw new Error('CONVERSATION_NOT_FOUND');
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);

        // If it's already our special error, re-throw it
        if (error instanceof Error && error.message === 'CONVERSATION_NOT_FOUND') {
          throw error;
        }

        // For network errors or other issues, also treat as not found
        // console.log(
        //   'Network or other error loading conversation (treating as not found):',
        //   conversationId
        // );
        setMessages([]);
        setCurrentConversationId(null);
        setPendingTickets([]);
        throw new Error('CONVERSATION_NOT_FOUND');
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          // Remove from local state
          setConversations(prev => prev.filter(conv => conv.id !== conversationId));

          // If this was the current conversation, clear it
          if (currentConversationId === conversationId) {
            setMessages([]);
            setCurrentConversationId(null);
            setPendingTickets([]);
          }
        } else {
          throw new Error('Failed to delete conversation');
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        throw error;
      }
    },
    [currentConversationId, getAuthHeaders]
  );

  const updateConversationTitle = useCallback(
    async (conversationId: string, title: string) => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title }),
        });

        if (response.ok) {
          // Update local state
          setConversations(prev =>
            prev.map(conv => (conv.id === conversationId ? { ...conv, title } : conv))
          );
        } else {
          throw new Error('Failed to update conversation title');
        }
      } catch (error) {
        console.error('Failed to update conversation title:', error);
        throw error;
      }
    },
    [getAuthHeaders]
  );

  const createShareLink = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/share`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            shareId: data.shareId,
            shareUrl: data.shareUrl,
          };
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create share link');
        }
      } catch (error) {
        console.error('Failed to create share link:', error);
        throw error;
      }
    },
    [getAuthHeaders]
  );

  const removeShareLink = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/share`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove share link');
        }
      } catch (error) {
        console.error('Failed to remove share link:', error);
        throw error;
      }
    },
    [getAuthHeaders]
  );

  const contextValue: ChatContextType = {
    // State
    messages,
    currentMode,
    currentProvider,
    isLoading,
    pendingTickets,

    // Conversation Management
    conversations,
    currentConversationId,

    // GitLab Integration
    gitlabConfig,
    showProjectSelection,

    // MCP Integration
    mcpConfig,

    // Actions
    sendMessage,
    setMode,
    setProvider,
    clearMessages,
    addMessage,
    approveTickets,
    rejectTickets,
    editTicket,
    setPendingTickets,

    // Conversation Actions
    createNewConversation,
    loadConversation,
    deleteConversation,
    updateConversationTitle,
    loadConversationsForUser,

    // Share Actions
    createShareLink,
    removeShareLink,

    // GitLab Actions
    setGitLabConfig: setGitlabConfig,
    createGitLabIssues,
    setShowProjectSelection,

    // MCP Actions
    updateMCPConfig,
    updateMCPServers,

    // Configuration
    providerConfigs,
    updateProviderConfig,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

// Custom hook to use chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
};
