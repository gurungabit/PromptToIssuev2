import { ConversationRepository, MessageRepository } from '../lib/db/repositories';
import type { Context } from 'hono';

// GET /messages - Get conversation messages (requires conversationId query param)
export const messagesGet = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.query('conversationId');

    if (!conversationId) {
      return c.json({ error: 'conversationId query parameter is required' }, 400);
    }

    // First verify user has access to this conversation
    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    const messageRepo = new MessageRepository();
    const messages = await messageRepo.getConversationMessages(conversationId);

    return c.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// POST /messages - Create new message
export const messagesPost = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const { conversationId, role, content, mode, metadata = '{}' } = await c.req.json();

    if (!conversationId || !role || !content || !mode) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // First verify user has access to this conversation
    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    const messageRepo = new MessageRepository();
    const newMessage = await messageRepo.createMessage({
      conversationId,
      role,
      content,
      mode,
      metadata,
    });

    // Update conversation lastMessageAt
    await conversationRepo.updateConversation(conversationId, userId, {
      lastMessageAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// GET /messages/:id - Get specific message
export const messageGetById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id');
    const conversationId = c.req.query('conversationId');

    if (!conversationId) {
      return c.json({ error: 'conversationId query parameter is required' }, 400);
    }

    // First verify user has access to this conversation
    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    const messageRepo = new MessageRepository();
    const messages = await messageRepo.getConversationMessages(conversationId);
    const message = messages.find(m => m.id === messageId);

    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// PUT /messages/:id - Update message
export const messagePutById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id');
    const updates = await c.req.json();
    const conversationId = updates.conversationId || c.req.query('conversationId');

    if (!conversationId) {
      return c.json({ error: 'conversationId is required' }, 400);
    }

    // First verify user has access to this conversation
    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    const messageRepo = new MessageRepository();
    const updatedMessage = await messageRepo.updateMessage(messageId, conversationId, updates);

    if (!updatedMessage) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// DELETE /messages/:id - Delete message
export const messageDeleteById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id');
    const conversationId = c.req.query('conversationId');

    if (!conversationId) {
      return c.json({ error: 'conversationId query parameter is required' }, 400);
    }

    // First verify user has access to this conversation
    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found or access denied' }, 404);
    }

    const messageRepo = new MessageRepository();
    const deleted = await messageRepo.deleteMessage(messageId, conversationId);

    if (!deleted) {
      return c.json({ error: 'Message not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};