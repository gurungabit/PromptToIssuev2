import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository, MessageRepository } from '@/lib/db';

// Helper function to validate nanoid format (21 characters)
function isValidId(id: string): boolean {
  // nanoid generates 21 character IDs by default
  return id.length === 21 && /^[A-Za-z0-9_-]+$/.test(id);
}

// Helper function to get user ID from request headers
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId && isValidId(userId) ? userId : null;
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from headers for authentication
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Get user's conversations
    const userConversations = await conversationRepo.getUserConversations(userId);

    // Transform the data to match the expected format with message counts
    const transformedConversations = await Promise.all(
      userConversations.map(async (conv) => {
        const messageCount = await messageRepo.getMessageCount(conv.id);
        const lastMessage = await messageRepo.getLastMessage(conv.id);
        
        return {
          id: conv.id,
          title: conv.title,
          lastMessage: lastMessage?.content || 'No messages yet',
          timestamp: conv.lastMessageAt || conv.createdAt,
          mode: conv.mode as 'ticket' | 'assistant',
          messageCount,
          provider: conv.provider,
          isArchived: conv.isArchived,
        };
      })
    );

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, mode, provider } = await request.json();

    if (!userId || !title || !mode || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conversationRepo = new ConversationRepository();
    const newConversation = await conversationRepo.createConversation({
      userId,
      title,
      mode,
      provider,
      lastMessageAt: new Date().toISOString(),
      isArchived: false
    });

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
