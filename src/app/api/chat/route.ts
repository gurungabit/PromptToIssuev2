import { NextRequest, NextResponse } from 'next/server';
import { createProviderWithConfig } from '@/lib/llm';
import { ConversationRepository, MessageRepository } from '@/lib/db/repositories';
import type { LLMMessage } from '@/lib/llm/base';
import type { Message } from '@/lib/schemas';
import { generateId } from '@/lib/utils';
import { stringifyJsonField } from '@/lib/db/utils';

// Helper function to get user ID from request headers
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId && userId.length === 21 && /^[A-Za-z0-9_-]+$/.test(userId) ? userId : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract data including conversationId for database storage
    const { message, mode, provider, config, conversationHistory = [], conversationId } = body;

    // Get user ID from headers for authentication
    const userId = getUserIdFromRequest(request);

    // Create the LLM provider with the provided config
    const llmProvider = await createProviderWithConfig({
      ...config,
      provider,
    });

    // Validate provider configuration
    const isConfigValid = await llmProvider.validateConfiguration();
    if (!isConfigValid) {
      return NextResponse.json(
        { error: `${provider} provider is not properly configured. Please check your API key.` },
        { status: 400 }
      );
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Save user message to database if conversationId exists
    if (conversationId && userId) {
      try {
        // First check if conversation exists by trying to get it
        const existingConversation = await conversationRepo.getConversationById(conversationId, userId);

        if (!existingConversation) {
          console.warn(`Conversation ${conversationId} not found for user ${userId}, skipping message save`);
          // Continue without saving to database
        } else {
          await messageRepo.createMessage({
            conversationId,
            role: 'user',
            content: message,
            mode,
            metadata: stringifyJsonField({}),
          });

          // Update conversation lastMessageAt
          await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
            lastMessageAt: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.error('Database error saving user message:', dbError);
        // Continue with API call even if database save fails
      }
    } else if (conversationId && !userId) {
      console.warn('No user ID provided, skipping message save');
    }

    // Convert conversation history to LLM format
    const llmMessages: LLMMessage[] = [
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Generate response from LLM
    const aiResponse = await llmProvider.generateResponse(llmMessages, mode);

    // Save assistant response to database if conversationId exists
    if (conversationId && aiResponse.type === 'assistant' && userId) {
      try {
        // Check if conversation still exists
        const existingConversation = await conversationRepo.getConversationById(conversationId, userId);

        if (existingConversation) {
          await messageRepo.createMessage({
            conversationId,
            role: 'assistant',
            content: aiResponse.content,
            mode,
            metadata: stringifyJsonField({}),
          });

          // Update conversation lastMessageAt again
          await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
            lastMessageAt: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.error('Database error saving assistant message:', dbError);
        // Continue without affecting the response
      }
    }

    // For ticket mode, add unique IDs to tickets if they don't have them
    if (aiResponse.type === 'tickets') {
      aiResponse.tickets = aiResponse.tickets.map(ticket => ({
        ...ticket,
        id: ticket.id || generateId(),
        acceptanceCriteria: ticket.acceptanceCriteria.map(ac => ({
          ...ac,
          id: ac.id || generateId(),
        })),
        tasks: ticket.tasks.map(task => ({
          ...task,
          id: task.id || generateId(),
        })),
      }));

      // Save assistant ticket response to database if conversationId exists
      if (conversationId && userId) {
        try {
          // Check if conversation still exists
          const existingConversation = await conversationRepo.getConversationById(conversationId, userId);

          if (existingConversation) {
            let responseContent = `I've analyzed your requirements and created ${aiResponse.tickets.length} ticket(s). `;
            responseContent += aiResponse.reasoning;

            if (aiResponse.needsClarification && aiResponse.clarificationQuestions) {
              responseContent +=
                '\n\nI have some questions to better understand your requirements:\n';
              responseContent += aiResponse.clarificationQuestions.map(q => `• ${q}`).join('\n');
            }

            await messageRepo.createMessage({
              conversationId,
              role: 'assistant',
              content: responseContent,
              mode,
              metadata: stringifyJsonField({ tickets: aiResponse.tickets }),
            });

            // Update conversation lastMessageAt
            await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
              lastMessageAt: new Date().toISOString(),
            });
          }
        } catch (dbError) {
          console.error('Database error saving ticket response:', dbError);
          // Continue without affecting the response
        }
      }
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to process request: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Chat API is running' }, { status: 200 });
}
