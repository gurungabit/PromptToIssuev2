import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, role, content, mode } = await request.json();

    if (!conversationId || !role || !content || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Verify conversation exists
    const existingConversation = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (existingConversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Insert the message
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        role,
        content,
        mode,
        metadata: {},
      })
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
