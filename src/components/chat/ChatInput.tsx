'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/Button';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage?: (message: string) => Promise<string | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const { sendMessage, isLoading, currentMode } = useChat();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    // Use custom send function if provided, otherwise use context
    if (onSendMessage) {
      await onSendMessage(message);
    } else {
      await sendMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const placeholder =
    currentMode === 'ticket'
      ? 'Describe your feature, bug, or requirements...'
      : 'Ask me anything...';

  const canSend = input.trim() && !isLoading;

  return (
    <div className="relative">
      {/* Input Container */}
      <div className="chat-input relative flex items-center gap-3 p-4 rounded-3xl shadow-lg border border-border/50 focus-within:shadow-xl focus-within:border-primary/20 transition-all duration-300 bg-background">
        {/* TODO: Add later : Attachment Button */}
        {/* <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
          disabled={isLoading}
        >
          <Paperclip className="w-4 h-4" />
        </Button> */}

        {/* Text Input Container */}
        <div className="flex-1 relative min-h-[40px] flex items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60',
              'border-0 outline-0 focus:ring-0 min-h-[24px] max-h-[200px] py-2',
              'leading-6 text-base font-medium placeholder:font-normal',
              'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent'
            )}
            rows={1}
          />
        </div>

        {/* TODO: Add later : Voice Button */}
        {/* <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
          disabled={isLoading}
        >
          <Mic className="w-4 h-4" />
        </Button> */}

        {/* Send/Stop Button */}
        <Button
          onClick={isLoading ? undefined : handleSubmit}
          disabled={!canSend && !isLoading}
          size="icon"
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer',
            canSend || isLoading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isLoading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-3 text-xs text-muted-foreground/70 text-center">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className="mx-2">•</span>
        <span>AI can make mistakes. Check important info.</span>
      </div>
    </div>
  );
};

export { ChatInput };
