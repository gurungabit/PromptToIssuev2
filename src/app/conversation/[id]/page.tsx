'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { LoginForm } from '@/components/auth/LoginForm';

const ConversationPage = () => {
  const params = useParams();
  const router = useRouter();
  const { loadConversation, currentConversationId } = useChat();
  const { isAuthenticated } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const conversationId = params.id as string;

  // Load conversation when component mounts or ID changes
  useEffect(() => {
    if (isAuthenticated && conversationId && conversationId !== currentConversationId) {
      loadConversation(conversationId).catch((error: Error) => {
        // If conversation not found (deleted), redirect to home
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          router.push('/');
        }
      });
    }
  }, [conversationId, currentConversationId, loadConversation, isAuthenticated, router]);

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <main className="h-screen overflow-hidden">
      <ChatInterface onOpenSettings={() => setShowSettings(true)} />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </main>
  );
};

export default ConversationPage;
