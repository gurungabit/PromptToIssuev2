"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { 
  Plus, 
  Search, 
  Edit3,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

interface ConversationSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isCollapsed,
  onToggle
}) => {
  const { 
    conversations, 
    currentConversationId,
    currentMode,
    createNewConversation,
    loadConversation,
    deleteConversation,
    updateConversationTitle,
    loadConversationsForUser
  } = useChat();
  
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Load user conversations when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadConversationsForUser(user.id);
    }
  }, [user?.id, loadConversationsForUser]);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return dateObj.toLocaleDateString();
    }
  };

  const startNewConversation = () => {
    createNewConversation();
  };

  const handleConversationClick = (conversationId: string) => {
    if (editingId) return; // Don't load if editing
    loadConversation(conversationId);
  };

  const handleEditStart = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditTitle(currentTitle);
  };

  const handleEditSave = async () => {
    if (editingId && editTitle.trim()) {
      try {
        await updateConversationTitle(editingId, editTitle.trim());
        setEditingId(null);
        setEditTitle('');
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteClick = (conversationId: string, title: string) => {
    setDeleteConfirm({ id: conversationId, title });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      try {
        await deleteConversation(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed chat-sidebar border-r border-border flex flex-col items-center py-6 space-y-4 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-chat-sidebar-foreground hover:bg-muted rounded-2xl transition-all duration-200"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={startNewConversation}
          className="text-chat-sidebar-foreground hover:bg-muted rounded-2xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-expanded chat-sidebar border-r border-border flex flex-col h-full overflow-hidden">
        <div className="sidebar-content flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-chat-sidebar-foreground">Conversations</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="text-chat-sidebar-foreground hover:bg-muted rounded-2xl w-8 h-8 transition-all duration-200"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              onClick={startNewConversation}
              className="w-full bg-muted hover:opacity-80 text-chat-sidebar-foreground border-0 rounded-2xl py-3 transition-all duration-200 hover:scale-[1.02] btn-hover"
              variant="ghost"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 p-6 border-b border-border">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-chat-sidebar-foreground/60" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-2xl text-chat-sidebar-foreground placeholder-chat-sidebar-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-area">
            <div className="p-4 space-y-3">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-chat-sidebar-foreground/60 text-sm">No conversations yet</p>
                  <p className="text-chat-sidebar-foreground/40 text-xs mt-1">Start chatting to see your conversations here</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredId(conversation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button 
                      className={`conversation-item w-full text-left p-4 pr-16 hover:bg-muted transition-all rounded-2xl ${
                        currentConversationId === conversation.id ? 'bg-muted border border-primary/30' : ''
                      }`}
                      onClick={() => handleConversationClick(conversation.id)}
                      disabled={editingId === conversation.id}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {conversation.mode === 'ticket' ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
                            )}
                            
                            {editingId === conversation.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-sm font-medium text-chat-sidebar-foreground bg-transparent border-b border-primary/40 focus:outline-none flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSave();
                                  if (e.key === 'Escape') handleEditCancel();
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-chat-sidebar-foreground truncate">
                                {conversation.title}
                              </span>
                            )}
                          </div>
                          
                          {editingId !== conversation.id && (
                            <>
                              <p className="text-xs text-chat-sidebar-foreground/60 truncate mb-3">
                                {conversation.lastMessage}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-chat-sidebar-foreground/40">
                                  {formatDate(conversation.timestamp)}
                                </span>
                                <span className="text-xs text-chat-sidebar-foreground/40">
                                  {conversation.messageCount} messages
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Edit Mode Actions */}
                    {editingId === conversation.id ? (
                      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditSave}
                          className="w-6 h-6 text-green-500 hover:text-green-600 hover:bg-muted rounded-lg"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditCancel}
                          className="w-6 h-6 text-red-500 hover:text-red-600 hover:bg-muted rounded-lg"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      /* Hover actions */
                      hoveredId === conversation.id && (
                        <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStart(conversation.id, conversation.title)}
                            className="w-6 h-6 text-chat-sidebar-foreground/60 hover:text-chat-sidebar-foreground hover:bg-muted rounded-lg"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(conversation.id, conversation.title)}
                            className="w-6 h-6 text-chat-sidebar-foreground/60 hover:text-red-400 hover:bg-muted rounded-lg"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer - Always at bottom */}
          <div className="flex-shrink-0 p-6 border-t border-border bg-chat-sidebar">
            <div className="bg-muted/50 rounded-2xl p-4 text-center">
              <div className="text-xs text-chat-sidebar-foreground/60">
                <p className="mb-1 font-medium">AI Ticket Automation</p>
                <p>Using {currentMode === 'ticket' ? 'Ticket' : 'Assistant'} Mode</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-background border-2 border-border rounded-2xl p-6 max-w-md w-full shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete Conversation</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-foreground mb-6 bg-muted/30 p-4 rounded-lg border border-border/50">
              Are you sure you want to delete &quot;<span className="font-medium text-primary">{deleteConfirm.title}</span>&quot;? 
              All messages in this conversation will be permanently removed.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                className="px-6 cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="px-6 bg-red-500 hover:bg-red-600 text-white cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { ConversationSidebar }; 