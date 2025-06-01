"use client";

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { LoginForm } from '@/components/auth/LoginForm';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <ChatProvider>
      <main className="h-screen overflow-hidden">
        <ChatInterface onOpenSettings={() => setShowSettings(true)} />
        
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </main>
    </ChatProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
