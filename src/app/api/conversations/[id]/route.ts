import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository, MessageRepository } from '@/lib/db/repositories';
import { parseJsonField } from '@/lib/db/utils';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate ID format
    if (!isValidId(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get user ID from request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Get conversation with user validation
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation
    const conversationMessages = await messageRepo.getConversationMessages(conversationId);

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
      },
      messages: transformedMessages,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conversationId = id;
    const { title } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate ID format
    if (!isValidId(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get user ID from request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationRepo = new ConversationRepository();

    const updatedConversation = await conversationRepo.updateConversation(conversationId, userId, {
      title,
    });

    if (!updatedConversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate ID format
    if (!isValidId(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get user ID from request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationRepo = new ConversationRepository();

    // Delete conversation (messages will be cascade deleted by the repository)
    const deleted = await conversationRepo.deleteConversation(conversationId, userId);

    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
