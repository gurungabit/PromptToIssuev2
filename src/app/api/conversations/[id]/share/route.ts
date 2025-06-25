import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository } from '@/lib/db/repositories';

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if conversation exists and belongs to user
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // If conversation already has a share ID, return it
    if (conversation.shareId) {
      return NextResponse.json({
        success: true,
        shareId: conversation.shareId,
        shareUrl: `${request.nextUrl.origin}/shared/${conversation.shareId}`,
      });
    }

    // Generate new share ID and share the conversation
    const shareId = await conversationRepo.shareConversation(conversationId, userId);

    if (!shareId) {
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${shareId}`,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
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

    // Remove share from conversation
    const success = await conversationRepo.unshareConversation(conversationId, userId);

    if (!success) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Share link removed',
    });
  } catch (error) {
    console.error('Error removing share link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
