'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { LoginForm } from '@/components/auth/LoginForm';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { clearMessages } = useChat();
  const [showSettings, setShowSettings] = useState(false);

  // Clear conversation state when home page loads (for New Chat functionality)
  useEffect(() => {
    clearMessages();
  }, [clearMessages]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <main className="h-screen overflow-hidden">
      <ChatInterface onOpenSettings={() => setShowSettings(true)} />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </main>
  );
}

export default function Home() {
  return <AppContent />;
}
