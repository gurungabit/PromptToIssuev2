import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { shareId: string } }) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    // Get conversation by share ID (no user authentication required)
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.shareId, shareId))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    // Transform messages to match the expected format
    const transformedMessages = conversationMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
      mode: msg.mode as 'ticket' | 'assistant',
      metadata: msg.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        mode: conversation.mode,
        provider: conversation.provider,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        isShared: true,
      },
      messages: transformedMessages,
    });
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
