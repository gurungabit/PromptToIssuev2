'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TicketsPreview } from '../tickets/TicketsPreview';
import { Button } from '@/components/ui/Button';
import { Settings, Sparkles, Ticket, MessageSquare, ChevronDown, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface ChatInterfaceProps {
  onOpenSettings?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onOpenSettings }) => {
  const {
    messages,
    currentMode,
    setMode,
    currentProvider,
    setProvider,
    isLoading,
    pendingTickets,
    sendMessage,
    currentConversationId,
  } = useChat();

  const { user, logout } = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [ticketPanelCollapsed, setTicketPanelCollapsed] = useState(false);

  const router = useRouter();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTickets]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Close provider menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(event.target as Node)) {
        setShowProviderMenu(false);
      }
    };

    if (showProviderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProviderMenu]);

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'ChatGPT';
      case 'anthropic':
        return 'Claude';
      case 'google':
        return 'Gemini';
      case 'ollama':
        return 'Ollama';
      default:
        return provider;
    }
  };

  const getProviderIcon = (provider: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      openai: <Sparkles className="w-4 h-4" />,
      anthropic: <Sparkles className="w-4 h-4" />,
      google: <Sparkles className="w-4 h-4" />,
      ollama: <Sparkles className="w-4 h-4" />,
    };

    return iconMap[provider] || <Sparkles className="w-4 h-4" />;
  };

  const hasMessages = messages.length > 0;

  // Handle sending message and navigation
  const handleSendMessage = async (content: string): Promise<string | null> => {
    const wasNewConversation = !currentConversationId;
    const conversationId = await sendMessage(content);

    // If this was a new conversation and we got a conversation ID, navigate to it
    if (wasNewConversation && conversationId) {
      router.push(`/conversation/${conversationId}`);
    }

    return conversationId;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="chat-header px-8 py-3 flex items-center justify-between relative z-[9999]">
          {/* Left side - User info */}
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Welcome back, {user?.fullName || user?.username}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="rounded-2xl w-10 h-10 cursor-pointer hover:bg-gray-800/50 hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="rounded-2xl w-10 h-10 cursor-pointer hover:bg-gray-800/50 hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </Button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 glass rounded-[16px] shadow-xl z-[9999] border border-border/50">
                  <div className="p-3">
                    <div className="pb-3 border-b border-border/50">
                      <p className="font-medium text-sm">{user?.fullName || user?.username}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full justify-start text-left hover:bg-red-500/10 hover:text-red-500 text-muted-foreground cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {!hasMessages ? (
              // Welcome Screen
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-2xl mx-auto text-center space-y-8 fade-in">
                  {/* Logo/Icon */}
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                    {currentMode === 'ticket' ? (
                      <Ticket className="w-10 h-10 text-white" />
                    ) : (
                      <MessageSquare className="w-10 h-10 text-white" />
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold gradient-text">
                      {currentMode === 'ticket'
                        ? 'Create Perfect Tickets'
                        : 'How can I help you today?'}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                      {currentMode === 'ticket'
                        ? "Describe your features, bugs, or requirements. I'll create structured tickets with acceptance criteria and task breakdowns."
                        : 'Ask me anything about software development, architecture, or get help with your coding challenges.'}
                    </p>
                  </div>

                  {/* Example Cards */}
                  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {currentMode === 'ticket' ? (
                      <>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'Create a user authentication system with JWT tokens and role-based access'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">🔐 Authentication System</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Create a user authentication system with JWT tokens and role-based
                            access
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'Fix the memory leak in the data processing pipeline affecting performance'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">🐛 Bug Fix</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Fix the memory leak in the data processing pipeline affecting
                            performance
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'Add dark mode support to the dashboard with user preferences'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">🎨 UI Enhancement</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Add dark mode support to the dashboard with user preferences
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'Implement real-time analytics dashboard with charts and metrics'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">📊 Analytics Feature</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Implement real-time analytics dashboard with charts and metrics
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage('How do I implement effective caching in my API?')
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">💾 Caching Strategy</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            How do I implement effective caching in my API?
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              "What's the best way to structure a large React project?"
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">⚛️ React Best Practices</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            What&apos;s the best way to structure a large React project?
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'Explain the differences between SQL and NoSQL databases'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">🗄️ Database Choice</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Explain the differences between SQL and NoSQL databases
                          </p>
                        </div>
                        <div
                          className="example-card cursor-pointer"
                          onClick={() =>
                            handleSendMessage(
                              'How can I optimize my web application for better performance?'
                            )
                          }
                        >
                          <h3 className="font-semibold mb-3 text-lg">🚀 Performance</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            How can I optimize my web application for better performance?
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              <div className="flex-1 overflow-y-auto scroll-area">
                <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
                  {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}

                  {/* Inline Loading Message */}
                  {isLoading && (
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <div className="w-5 h-5 text-white">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </div>
                      </div>

                      {/* Loading Bubble */}
                      <div className="flex-1 max-w-3xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">Assistant</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date().toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="chat-message assistant">
                          <div className="flex items-center gap-1 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full typing-dot"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Chat Input Area */}
            <div className="p-6 pb-8">
              <div className="max-w-4xl mx-auto">
                {/* Redesigned Input Container */}
                <div className="relative">
                  {/* Provider & Mode Controls - integrated into input */}
                  <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
                    {/* Provider Selector - minimal */}
                    <div className="relative" ref={providerMenuRef}>
                      <Button
                        variant="ghost"
                        onClick={() => setShowProviderMenu(!showProviderMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[12px] cursor-pointer hover:scale-110 hover:shadow-md"
                      >
                        {getProviderIcon(currentProvider)}
                        {getProviderDisplayName(currentProvider)}
                        <ChevronDown className="w-3 h-3" />
                      </Button>

                      {showProviderMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-44 glass rounded-[16px] shadow-xl z-50">
                          <div className="p-2 space-y-1">
                            {(['openai', 'anthropic', 'google', 'ollama'] as const).map(
                              provider => (
                                <button
                                  key={provider}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-[8px] transition-colors cursor-pointer hover:scale-110 hover:shadow-md"
                                  onClick={() => {
                                    setProvider(provider);
                                    setShowProviderMenu(false);
                                  }}
                                >
                                  {getProviderIcon(provider)}
                                  {getProviderDisplayName(provider)}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mode Toggle - minimal */}
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          'font-medium transition-colors',
                          currentMode === 'ticket'
                            ? 'text-foreground font-bold text-green-500'
                            : 'text-muted-foreground'
                        )}
                      >
                        Tickets
                      </span>

                      <button
                        onClick={() => setMode(currentMode === 'ticket' ? 'assistant' : 'ticket')}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer',
                          currentMode === 'ticket' ? 'bg-green-500' : 'bg-blue-400'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                            currentMode === 'ticket' ? 'translate-x-5' : 'translate-x-1'
                          )}
                        />
                      </button>

                      <span
                        className={cn(
                          'font-medium transition-colors',
                          currentMode === 'assistant'
                            ? 'text-foreground font-bold text-blue-500'
                            : 'text-muted-foreground'
                        )}
                      >
                        Assistant
                      </span>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <ChatInput onSendMessage={handleSendMessage} />
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Preview Panel */}
          {pendingTickets.length > 0 && currentMode === 'ticket' && (
            <div
              className={cn(
                'border-l bg-muted/20 overflow-y-auto scroll-area transition-all duration-300 ease-in-out relative z-10',
                ticketPanelCollapsed ? 'w-12' : 'w-[500px]'
              )}
            >
              {/* Toggle Button */}
              <button
                onClick={() => setTicketPanelCollapsed(!ticketPanelCollapsed)}
                className={`absolute z-10 w-8 h-8 rounded-full bg-background border shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center ${ticketPanelCollapsed ? 'top-1 left-1' : 'top-4 left-4'}`}
                title={ticketPanelCollapsed ? 'Expand Tickets Panel' : 'Collapse Tickets Panel'}
              >
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200 cursor-pointer hover:scale-110 hover:shadow-md',
                    ticketPanelCollapsed ? 'rotate-90 text-green-500' : '-rotate-90 text-blue-500'
                  )}
                />
              </button>

              {/* Panel Content */}
              <div
                className={cn(
                  'transition-all duration-300 ease-in-out',
                  ticketPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
              >
                <div className="p-6 pt-16">
                  <TicketsPreview />
                </div>
              </div>

              {/* Collapsed State Indicator */}
              {ticketPanelCollapsed && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 -rotate-90 whitespace-nowrap text-xs text-muted-foreground">
                  {pendingTickets.length} Ticket{pendingTickets.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ChatInterface };
