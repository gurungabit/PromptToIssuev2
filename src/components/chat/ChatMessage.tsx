/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn, formatDate } from '@/lib/utils';
import type { Message, Ticket } from '@/lib/schemas';
import { User, Bot, Copy, Check, ExternalLink, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { useChat } from '@/contexts/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message & { metadata?: { tickets?: Ticket[] } };
  readOnly?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, readOnly }) => {
  const isUser = message.role === 'user';
  const [showCopied, setShowCopied] = useState(false);
  const [showTicketsRestored, setShowTicketsRestored] = useState(false);
  const [showTicketsExpanded, setShowTicketsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState<Set<string>>(new Set());
  const [copiedTickets, setCopiedTickets] = useState(false);

  const { setPendingTickets } = useChat();

  // Check if this message has tickets in metadata
  const hasTickets =
    message.metadata?.tickets &&
    Array.isArray(message.metadata.tickets) &&
    message.metadata.tickets.length > 0;

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
      attributeFilter: ['class'],
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
    if (readOnly) {
      // In read-only mode, just toggle the expanded view
      setShowTicketsExpanded(!showTicketsExpanded);
    } else {
      // In interactive mode, restore tickets to pending state
      if (message.metadata?.tickets) {
        setPendingTickets(message.metadata.tickets);
        setShowTicketsRestored(true);
        setTimeout(() => setShowTicketsRestored(false), 2000);
      }
    }
  };

  const handleCopyTickets = async () => {
    if (message.metadata?.tickets) {
      try {
        // Convert tickets to markdown format
        const ticketsMarkdown = message.metadata.tickets
          .map(ticket => {
            let markdown = `## ${ticket.title}\n\n`;
            markdown += `**Type:** ${ticket.type}\n`;
            markdown += `**Priority:** ${ticket.priority}\n\n`;
            markdown += `**Description:**\n${ticket.description}\n\n`;

            if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
              markdown += `**Acceptance Criteria:**\n`;
              ticket.acceptanceCriteria.forEach((criteria, index) => {
                markdown += `${index + 1}. ${criteria.description}\n`;
              });
              markdown += '\n';
            }

            if (ticket.tasks && ticket.tasks.length > 0) {
              markdown += `**Tasks:**\n`;
              ticket.tasks.forEach(task => {
                markdown += `- [ ] ${task.description}\n`;
              });
              markdown += '\n';
            }

            if (ticket.labels && ticket.labels.length > 0) {
              markdown += `**Labels:** ${ticket.labels.join(', ')}\n\n`;
            }

            if (ticket.estimatedHours) {
              markdown += `**Estimated Hours:** ${ticket.estimatedHours}\n\n`;
            }

            return markdown;
          })
          .join('---\n\n');

        await navigator.clipboard.writeText(ticketsMarkdown);
        setCopiedTickets(true);
        setTimeout(() => setCopiedTickets(false), 2000);
      } catch (err) {
        console.error('Failed to copy tickets:', err);
      }
    }
  };

  // Simple hash function for code content
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const handleCodeCopy = useCallback(async (code: string, blockKey: string) => {
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
  }, []);

  // Custom components for react-markdown
  const markdownComponents = {
    // Handle links - make them clickable and style them
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-500/30 hover:decoration-blue-500/60 transition-colors inline-flex items-center gap-1 break-all"
        {...props}
      >
        {children}
        <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
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
          <CodeBlock
            code={codeContent}
            language={language}
            blockKey={blockKey}
            isCopied={isCopied}
            onCopy={handleCodeCopy}
            isDark={isDark}
          />
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
      <blockquote
        className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground mb-3"
        {...props}
      >
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
    <div className={cn('group relative', isUser ? 'ml-8' : 'mr-8')}>
      <div
        className={cn(
          'flex gap-4 p-6 rounded-[24px]',
          isUser ? 'chat-message-user ml-auto max-w-[85%]' : 'chat-message-assistant max-w-[85%]'
        )}
      >
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
            <span className="font-semibold text-sm">{isUser ? 'You' : 'Assistant'}</span>
            <span className="text-xs text-muted-foreground">{formatDate(message.timestamp)}</span>
            {message.mode && (
              <span
                className={cn(
                  'text-xs px-3 py-1 rounded-full font-medium',
                  message.mode === 'ticket'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-300/50 dark:text-blue-400 border border-blue-300 dark:border-blue-800/50'
                    : 'bg-green-50 text-green-600 dark:bg-green-200/50 dark:text-green-400 border border-green-300 dark:border-green-800/50'
                )}
              >
                {message.mode === 'ticket' ? 'Ticket Mode' : 'Assistant Mode'}
              </span>
            )}
          </div>

          {/* Message Text with Markdown Support */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="text-foreground leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
      <div
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          isUser ? 'flex justify-end mr-1 mt-2' : 'ml-16 -mt-5'
        )}
      >
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
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-background/95 backdrop-blur-sm border border-border/30 rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={handleRestoreTickets}
              >
                {readOnly ? (
                  <>
                    <TicketIcon className="w-3 h-3 mr-1.5" />
                    {showTicketsExpanded ? 'Hide Tickets' : 'View Tickets'}
                  </>
                ) : showTicketsRestored ? (
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

              {/* Copy Tickets Button - only in read-only mode when tickets are expanded */}
              {readOnly && showTicketsExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-background/95 backdrop-blur-sm border border-border/30 rounded-[12px] shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={handleCopyTickets}
                >
                  {copiedTickets ? (
                    <>
                      <Check className="w-3 h-3 mr-1.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy Tickets
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Tickets View - only in read-only mode */}
      {readOnly && hasTickets && showTicketsExpanded && (
        <div
          className={cn(
            'mt-4 p-6 bg-muted/30 border border-border rounded-[20px]',
            isUser ? 'mr-1' : 'ml-16'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <TicketIcon className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm">Generated Tickets</span>
            <span className="text-xs text-muted-foreground">
              ({message.metadata?.tickets?.length} tickets)
            </span>
          </div>

          <div className="space-y-6">
            {message.metadata?.tickets?.map(ticket => (
              <div key={ticket.id} className="bg-background border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-2">{ticket.title}</h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full font-medium',
                          ticket.type === 'feature'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : ticket.type === 'bug'
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : ticket.type === 'task'
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : ticket.type === 'improvement'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                  : 'bg-orange-100 text-orange-700 border border-orange-300'
                        )}
                      >
                        {ticket.type}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full font-medium',
                          ticket.priority === 'critical'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : ticket.priority === 'high'
                              ? 'bg-orange-100 text-orange-700 border border-orange-300'
                              : ticket.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                        )}
                      >
                        {ticket.priority} priority
                      </span>
                      {ticket.estimatedHours && (
                        <span className="text-muted-foreground">~{ticket.estimatedHours}h</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {ticket.description}
                  </ReactMarkdown>
                </div>

                {ticket.acceptanceCriteria.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm mb-2 text-muted-foreground">
                      Acceptance Criteria
                    </h5>
                    <ul className="list-decimal list-inside space-y-1 text-sm">
                      {ticket.acceptanceCriteria.map(criteria => (
                        <li key={criteria.id} className="text-foreground">
                          {criteria.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ticket.tasks.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-sm mb-2 text-muted-foreground">Tasks</h5>
                    <ul className="space-y-1 text-sm">
                      {ticket.tasks.map(task => (
                        <li key={task.id} className="flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          <span className="text-foreground">{task.description}</span>
                          {task.estimatedHours && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              ({task.estimatedHours}h)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ticket.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ticket.labels.map((label, labelIndex) => (
                      <span
                        key={labelIndex}
                        className="px-2 py-1 bg-accent text-accent-foreground rounded-md text-xs font-medium border border-border"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { ChatMessage };
