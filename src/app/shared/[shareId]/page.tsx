'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Message } from '@/lib/schemas';

interface SharedConversation {
  id: string;
  title: string;
  mode: 'ticket' | 'assistant';
  provider: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
}

const SharedConversationPage = () => {
  const params = useParams();
  const shareId = params.shareId as string;

  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedConversation = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/shared/${shareId}`);

        if (response.ok) {
          const data = await response.json();
          setConversation(data.conversation);
          setMessages(data.messages || []);
        } else if (response.status === 404) {
          setError(
            'This shared conversation could not be found. It may have been removed or the link is invalid.'
          );
        } else {
          setError('Failed to load shared conversation. Please try again later.');
        }
      } catch (error) {
        console.error('Error loading shared conversation:', error);
        setError('Failed to load shared conversation. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (shareId) {
      loadSharedConversation();
    }
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <ExternalLink className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Conversation Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link href="/">
            <Button
              variant="outline"
              className="cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{conversation.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="capitalize">
                  {conversation.mode === 'ticket' ? '🎫 Ticket Mode' : '🤖 Assistant Mode'}
                </span>
                <span>•</span>
                <span>Powered by {conversation.provider}</span>
                <span>•</span>
                <span>{messages.length} messages</span>
              </div>
            </div>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">This conversation has no messages yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} readOnly={true} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            This is a shared conversation.
            <Link href="/" className="text-primary hover:underline ml-1">
              Create your own conversations
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedConversationPage;
