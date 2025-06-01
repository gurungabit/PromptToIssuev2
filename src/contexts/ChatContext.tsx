"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { generateId } from '@/lib/utils';
import type { 
  Message, 
  ChatMode, 
  LLMProvider, 
  LLMConfig, 
  AIResponse,
  Ticket,
  GitLabConfig,
  ProjectSelection
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
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  setMode: (mode: ChatMode) => void;
  setProvider: (provider: LLMProvider) => void;
  clearMessages: () => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  approveTickets: () => void;
  rejectTickets: () => void;
  editTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  setPendingTickets: (tickets: Ticket[]) => void;
  
  // Conversation Actions
  createNewConversation: (title?: string, clearUI?: boolean) => void;
  loadConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  loadConversationsForUser: (userId: string) => void;
  
  // GitLab Actions
  setGitLabConfig: (config: GitLabConfig) => void;
  createGitLabIssues: (tickets: Ticket[], projectSelection: ProjectSelection) => Promise<void>;
  setShowProjectSelection: (show: boolean) => void;
  
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

  // Load persisted state from localStorage
  useEffect(() => {

    const savedMode = localStorage.getItem('chatMode') as ChatMode;
    const savedProvider = localStorage.getItem('chatProvider') as LLMProvider;
    const savedConfigs = localStorage.getItem('providerConfigs');
    
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

  // Persist GitLab config
  useEffect(() => {
    if (gitlabConfig) {
      localStorage.setItem('gitlabConfig', JSON.stringify(gitlabConfig));
    }
  }, [gitlabConfig]);

  // Helper function to save messages to database
  const saveMessageToDatabase = useCallback(async (conversationId: string, role: 'user' | 'assistant', content: string) => {
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
  }, [currentMode]);

  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const newMessage: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      mode: currentMode,
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Update message count for current conversation
    if (currentConversationId) {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversationId 
            ? { 
                ...conv, 
                messageCount: conv.messageCount + 1,
                lastMessage: content.length > 50 ? content.substring(0, 50) + '...' : content,
                timestamp: new Date()
              }
            : conv
        )
      );
      
      // Save message to database if we have a conversation ID
      if (currentConversationId) {
        saveMessageToDatabase(currentConversationId, role, content).catch(error => {
          console.error('Failed to save message to database:', error);
        });
      }
    }
    
    return newMessage;
  }, [currentConversationId, currentMode, saveMessageToDatabase]);

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
  const loadUserConversations = useCallback(async (userId?: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/conversations?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const createNewConversation = useCallback(async (title?: string, clearUI = true) => {
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
      const userId = typeof window !== 'undefined' ? 
        JSON.parse(localStorage.getItem('currentUser') || '{}').id : null;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, [currentMode, currentProvider]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setPendingTickets([]);

    // Add user message immediately to show chat interface
    addMessage(content, 'user');

    try {
      // If no current conversation, create one but don't clear the UI since we already added the message
      let conversationId = currentConversationId;
      if (!conversationId) {
        const title = generateConversationTitle(content);
        const newConv = await createNewConversation(title, false); // Don't clear UI
        conversationId = newConv?.id;
      }

      // Only proceed if we have a valid conversation ID
      if (!conversationId) {
        throw new Error('Failed to create or get conversation ID');
      }

      // Add minimum delay to ensure loading indicator is visible
      const apiCallPromise = fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          provider: currentProvider,
          config: providerConfigs[currentProvider],
          conversationHistory: messages.slice(-10), // Last 10 messages for context: Increase this number to increase context if needed
          conversationId, // Include conversation ID for database storage
        }),
      });

      const delayPromise = new Promise(resolve => setTimeout(resolve, 800)); // Minimum 800ms delay

      // Wait for both API call and minimum delay
      const [response] = await Promise.all([apiCallPromise, delayPromise]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const aiResponse: AIResponse = await response.json();

      if (aiResponse.type === 'assistant') {
        addMessage(aiResponse.content, 'assistant');
      } else if (aiResponse.type === 'tickets') {
        // Handle ticket response
        setPendingTickets(aiResponse.tickets);
        
        let responseContent = `I've analyzed your requirements and created ${aiResponse.tickets.length} ticket(s). `;
        responseContent += aiResponse.reasoning;
        
        if (aiResponse.needsClarification && aiResponse.clarificationQuestions) {
          responseContent += '\n\nI have some questions to better understand your requirements:\n';
          responseContent += aiResponse.clarificationQuestions.map(q => `• ${q}`).join('\n');
        }
        
        addMessage(responseContent, 'assistant');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('I apologize, but I encountered an error. Please try again.', 'assistant');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentConversationId, currentMode, currentProvider, providerConfigs, messages, createNewConversation, addMessage]);

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

  const clearMessages = () => {
    setMessages([]);
    setPendingTickets([]);
    setCurrentConversationId(null);
  };

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

  const editTicket = (ticketId: string, updates: Partial<Ticket>) => {
    setPendingTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ...updates }
          : ticket
      )
    );
  };

  const updateProviderConfig = (provider: LLMProvider, config: Partial<LLMConfig>) => {
    setProviderConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], ...config }
    }));
  };

  // Add a function to load conversations from parent component
  const loadConversationsForUser = useCallback((userId: string) => {
    loadUserConversations(userId);
  }, [loadUserConversations]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Load conversation messages
        setMessages(data.messages || []);
        setCurrentConversationId(conversationId);
        
        // Update current mode/provider based on conversation
        setCurrentMode(data.conversation.mode);
        setCurrentProvider(data.conversation.provider);
        
        setPendingTickets([]); // Clear any pending tickets
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      addMessage('Failed to load conversation. Please try again.', 'assistant');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
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
  }, [currentConversationId]);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        // Update local state
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title }
              : conv
          )
        );
      } else {
        throw new Error('Failed to update conversation title');
      }
    } catch (error) {
      console.error('Failed to update conversation title:', error);
      throw error;
    }
  }, []);

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
    
    // GitLab Actions
    setGitLabConfig: setGitlabConfig,
    createGitLabIssues,
    setShowProjectSelection,
    
    // Configuration
    providerConfigs,
    updateProviderConfig,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
}; 