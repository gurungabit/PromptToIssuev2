import { NextRequest, NextResponse } from 'next/server';
import { createProviderWithConfig } from '@/lib/llm';
import { db } from '@/lib/db';
import { messages as dbMessages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { LLMMessage } from '@/lib/llm/base';
import type { Message } from '@/lib/schemas';
import { generateId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract data including conversationId for database storage
    const { message, mode, provider, config, conversationHistory = [], conversationId } = body;

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

    // Save user message to database if conversationId exists
    if (conversationId) {
      try {
        // First check if conversation exists
        const existingConversation = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        if (existingConversation.length === 0) {
          console.warn(`Conversation ${conversationId} not found, skipping message save`);
          // Continue without saving to database
        } else {
          await db.insert(dbMessages).values({
            conversationId,
            role: 'user',
            content: message,
            mode,
            metadata: {},
          });

          // Update conversation lastMessageAt
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));
        }
      } catch (dbError) {
        console.error('Database error saving user message:', dbError);
        // Continue with API call even if database save fails
      }
    }

    console.log('conversationHistory', conversationHistory);

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
    if (conversationId && aiResponse.type === 'assistant') {
      try {
        // Check if conversation still exists
        const existingConversation = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);

        if (existingConversation.length > 0) {
          await db.insert(dbMessages).values({
            conversationId,
            role: 'assistant',
            content: aiResponse.content,
            mode,
            metadata: {},
          });

          // Update conversation lastMessageAt again
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));
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
      if (conversationId) {
        try {
          // Check if conversation still exists
          const existingConversation = await db
            .select({ id: conversations.id })
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

          if (existingConversation.length > 0) {
            let responseContent = `I've analyzed your requirements and created ${aiResponse.tickets.length} ticket(s). `;
            responseContent += aiResponse.reasoning;

            if (aiResponse.needsClarification && aiResponse.clarificationQuestions) {
              responseContent +=
                '\n\nI have some questions to better understand your requirements:\n';
              responseContent += aiResponse.clarificationQuestions.map(q => `• ${q}`).join('\n');
            }

            await db.insert(dbMessages).values({
              conversationId,
              role: 'assistant',
              content: responseContent,
              mode,
              metadata: { tickets: aiResponse.tickets },
            });

            // Update conversation lastMessageAt
            await db
              .update(conversations)
              .set({
                lastMessageAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(conversations.id, conversationId));
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
