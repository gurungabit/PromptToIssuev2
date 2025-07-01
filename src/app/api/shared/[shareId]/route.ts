import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository, MessageRepository } from '@/lib/db/repositories';
import { parseJsonField } from '@/lib/db/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Get conversation by share ID (no user authentication required)
    const conversation = await conversationRepo.getConversationByShareId(shareId);

    if (!conversation) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation
    const conversationMessages = await messageRepo.getConversationMessages(conversation.id);

    // Transform messages to match the expected format
    const transformedMessages = conversationMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt || new Date().toISOString(),
      mode: msg.mode as 'ticket' | 'assistant',
      metadata: parseJsonField(msg.metadata, {}),
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
