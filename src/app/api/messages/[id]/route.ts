import { NextRequest, NextResponse } from 'next/server';
import { MessageRepository } from '@/lib/db/repositories';
import { stringifyJsonField } from '@/lib/db/utils';

// Helper function to validate nanoid format (21 characters)
function isValidId(id: string): boolean {
  // nanoid generates 21 character IDs by default
  return id.length === 21 && /^[A-Za-z0-9_-]+$/.test(id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const messageId = id;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Validate ID format
    if (!isValidId(messageId)) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { metadata, conversationId } = await request.json();

    if (!metadata) {
      return NextResponse.json({ error: 'Metadata is required' }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const messageRepo = new MessageRepository();

    // Update the message metadata
    const updatedMessage = await messageRepo.updateMessage(messageId, conversationId, {
      metadata: stringifyJsonField(metadata),
    });

    if (!updatedMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
