'use client';

import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

const ModeToggle: React.FC = () => {
  const { currentMode, setMode } = useChat();

  const isTicketMode = currentMode === 'ticket';

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'text-sm font-medium transition-colors',
          isTicketMode ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        Tickets
      </span>

      <button
        onClick={() => setMode(isTicketMode ? 'assistant' : 'ticket')}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          !isTicketMode ? 'bg-green-600' : 'bg-blue-600'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            !isTicketMode ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>

      <span
        className={cn(
          'text-sm font-medium transition-colors',
          !isTicketMode ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        Assistant
      </span>
    </div>
  );
};

export { ModeToggle };
