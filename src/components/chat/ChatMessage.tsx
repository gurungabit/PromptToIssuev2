/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { cn, formatDate } from '@/lib/utils';
import type { Message, Ticket } from '@/lib/schemas';
import { User, Bot, Copy, Check, ExternalLink, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useChat } from '@/contexts/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message & { metadata?: { tickets?: Ticket[] } };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showCopied, setShowCopied] = useState(false);
  const [showTicketsRestored, setShowTicketsRestored] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<Set<string>>(new Set());
  
  const { setPendingTickets } = useChat();
  
  // Check if this message has tickets in metadata
  const hasTickets = message.metadata?.tickets && Array.isArray(message.metadata.tickets) && message.metadata.tickets.length > 0;

  // Custom theme detection
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRestoreTickets = () => {
    if (message.metadata?.tickets) {
      setPendingTickets(message.metadata.tickets);
      setShowTicketsRestored(true);
      setTimeout(() => setShowTicketsRestored(false), 2000);
    }
  };

  // Simple hash function for code content
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const handleCodeCopy = async (code: string, blockKey: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlocks(prev => new Set(prev).add(blockKey));
      
      setTimeout(() => {
        setCopiedCodeBlocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(blockKey);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Custom components for react-markdown
  const markdownComponents = {
    // Handle links - make them clickable and style them
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-500/30 hover:decoration-blue-500/60 transition-colors inline-flex items-center gap-1"
        {...props}
      >
        {children}
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    ),
    
    // Handle code blocks with syntax highlighting
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language) {
        const codeContent = String(children).replace(/\n$/, '');
        // Create a stable key using content hash and language
        const blockKey = `${language}-${hashCode(codeContent)}`;
        const isCopied = copiedCodeBlocks.has(blockKey);
        
        return (
          <div className="relative group">
            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={language}
              PreTag="div"
              className="rounded-lg !mt-2 !mb-2"
              showLineNumbers={true}
              wrapLines={true}
              lineProps={{
                style: { display: 'block', width: 'fit-content' }
              }}
              {...props}
            >
              {codeContent}
            </SyntaxHighlighter>
            {/* Copy button for code blocks */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 px-2 text-xs bg-background/80 backdrop-blur-sm border border-border/30 hover:bg-background/90"
              onClick={() => handleCodeCopy(codeContent, blockKey)}
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-green-500" />
                  <span className="text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        );
      }
      
      // Inline code
      return (
        <code 
          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border/30" 
          {...props}
        >
          {children}
        </code>
      );
    },
    
    // Handle paragraphs
    p: ({ children, ...props }: any) => (
      <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    
    // Handle lists
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside mb-3 space-y-1" {...props}>
        {children}
      </ul>
    ),
    
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside mb-3 space-y-1" {...props}>
        {children}
      </ol>
    ),
    
    li: ({ children, ...props }: any) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),
    
    // Handle headers
    h1: ({ children, ...props }: any) => (
      <h1 className="text-xl font-bold mb-3 text-foreground" {...props}>
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }: any) => (
      <h2 className="text-lg font-semibold mb-2 text-foreground" {...props}>
        {children}
      </h2>
    ),
    
    h3: ({ children, ...props }: any) => (
      <h3 className="text-base font-semibold mb-2 text-foreground" {...props}>
        {children}
      </h3>
    ),
    
    // Handle blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground mb-3" {...props}>
        {children}
      </blockquote>
    ),
    
    // Handle tables
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-3">
        <table className="min-w-full border border-border rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),
    
    th: ({ children, ...props }: any) => (
      <th className="border border-border px-3 py-2 bg-muted font-semibold text-left" {...props}>
        {children}
      </th>
    ),
    
    td: ({ children, ...props }: any) => (
      <td className="border border-border px-3 py-2" {...props}>
        {children}
      </td>
    ),
  };

  return (
    <div className={cn(
      "group relative",
      isUser ? "ml-16" : "mr-16"
    )}>
      <div className={cn(
        "flex gap-4 p-6 rounded-[24px]",
        isUser 
          ? "chat-message-user ml-auto max-w-[80%]" 
          : "chat-message-assistant"
      )}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-[16px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-semibold text-sm">
              {isUser ? 'You' : 'Assistant'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(message.timestamp)}
            </span>
            {message.mode && (
              <span className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                message.mode === 'ticket' 
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-300/50 dark:text-blue-400 border border-blue-300 dark:border-blue-800/50"
                  : "bg-green-50 text-green-600 dark:bg-green-200/50 dark:text-green-400 border border-green-300 dark:border-green-800/50"
              )}>
                {message.mode === 'ticket' ? 'Ticket Mode' : 'Assistant Mode'}
              </span>
            )}
          </div>
          
          {/* Message Text with Markdown Support */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="text-foreground leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex-shrink-0 w-9 h-9 rounded-[16px] bg-primary text-primary-foreground flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Actions - Copy Button for both user and assistant */}
      <div className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        isUser ? "flex justify-end mr-1 mt-2" : "ml-16 -mt-5"
      )}>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-background/95 backdrop-blur-sm border border-border/30 rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={handleCopy}
          >
            {showCopied ? (
              <>
                <Check className="w-3 h-3 mr-1.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1.5" />
                Copy
              </>
            )}
          </Button>
          
          {/* Show Tickets Button - only for messages with ticket metadata */}
          {hasTickets && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-background/95 backdrop-blur-sm border border-border/30 rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={handleRestoreTickets}
            >
              {showTicketsRestored ? (
                <>
                  <Check className="w-3 h-3 mr-1.5 text-green-500" />
                  Restored
                </>
              ) : (
                <>
                  <TicketIcon className="w-3 h-3 mr-1.5" />
                  Show Tickets
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export { ChatMessage }; 