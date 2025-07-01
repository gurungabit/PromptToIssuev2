import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository, MessageRepository } from '@/lib/db/repositories';
import { stringifyJsonField } from '@/lib/db/utils';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, role, content, mode, userId } = await request.json();

    if (!conversationId || !role || !content || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Verify conversation exists - we need userId for this
    // If userId is not provided, we'll try to get it from the conversation
    let targetUserId = userId;
    if (!targetUserId) {
      // This is a fallback - in production you'd get userId from auth
      targetUserId = 'user-id-placeholder';
    }

    const existingConversation = await conversationRepo.getConversationById(conversationId, targetUserId);

    if (!existingConversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Insert the message
    const newMessage = await messageRepo.createMessage({
      conversationId,
      role,
      content,
      mode,
      metadata: stringifyJsonField({}),
    });

    // Update conversation lastMessageAt
    await conversationRepo.updateConversation(conversationId, existingConversation.userId, {
      lastMessageAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
