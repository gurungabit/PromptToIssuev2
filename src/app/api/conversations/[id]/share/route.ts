import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Helper function to get user ID from request headers
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId && isValidUUID(userId) ? userId : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate UUID format
    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get user ID from request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if conversation exists and belongs to user
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

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

    // Generate new share ID
    const shareId = nanoid(12); // Short, URL-safe unique ID

    // Update conversation with share ID
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        shareId,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .returning();

    if (!updatedConversation) {
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shareId: updatedConversation.shareId,
      shareUrl: `${request.nextUrl.origin}/shared/${updatedConversation.shareId}`,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const conversationId = id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Validate UUID format
    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get user ID from request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove share ID from conversation
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        shareId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .returning();

    if (!updatedConversation) {
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
