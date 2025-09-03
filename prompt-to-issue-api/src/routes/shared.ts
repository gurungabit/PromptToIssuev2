import { ConversationRepository, MessageRepository } from '../lib/db/repositories';
import { parseJsonField } from '../lib/db/utils';
import type { Context } from 'hono';

// GET /shared/:shareId - Get shared conversation (public access, no auth required)
export const sharedGet = async (c: Context) => {
  try {
    const shareId = c.req.param('shareId');

    if (!shareId) {
      return c.json({ error: 'Share ID is required' }, 400);
    }

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Get conversation by share ID (no user authentication required)
    const conversation = await conversationRepo.getConversationByShareId(shareId);

    if (!conversation) {
      return c.json({ error: 'Shared conversation not found' }, 404);
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

    return c.json({
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
    return c.json({ error: 'Internal server error' }, 500);
  }
};