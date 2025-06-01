import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get conversations with message counts and last message
    const userConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        mode: conversations.mode,
        provider: conversations.provider,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lastMessageAt: conversations.lastMessageAt,
        isArchived: conversations.isArchived,
        messageCount: count(messages.id),
        lastMessage: sql<string>`(
          SELECT content 
          FROM ${messages} 
          WHERE ${messages.conversationId} = ${conversations.id} 
          ORDER BY ${messages.createdAt} DESC 
          LIMIT 1
        )`,
      })
      .from(conversations)
      .leftJoin(messages, eq(conversations.id, messages.conversationId))
      .where(eq(conversations.userId, userId))
      .groupBy(conversations.id)
      .orderBy(desc(conversations.lastMessageAt));

    // Transform the data to match the expected format
    const transformedConversations = userConversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage || 'No messages yet',
      timestamp: conv.lastMessageAt || conv.createdAt,
      mode: conv.mode as 'ticket' | 'assistant',
      messageCount: Number(conv.messageCount),
      provider: conv.provider,
      isArchived: conv.isArchived,
    }));

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, mode, provider } = await request.json();

    if (!userId || !title || !mode || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [newConversation] = await db
      .insert(conversations)
      .values({
        userId,
        title,
        mode,
        provider,
        lastMessageAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      conversation: {
        id: newConversation.id,
        title: newConversation.title,
        lastMessage: 'No messages yet',
        timestamp: newConversation.createdAt,
        mode: newConversation.mode as 'ticket' | 'assistant',
        messageCount: 0,
        provider: newConversation.provider,
        isArchived: false,
      },
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 