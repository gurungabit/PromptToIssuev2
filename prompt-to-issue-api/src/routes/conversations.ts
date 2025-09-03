import { ConversationRepository, MessageRepository } from '../lib/db/repositories';
import type { Context } from 'hono';

// GET /conversations - Get user's conversations
export const conversationsGet = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;

    const conversationRepo = new ConversationRepository();
    const messageRepo = new MessageRepository();

    // Get user's conversations
    const userConversations = await conversationRepo.getUserConversations(userId);

    // Transform the data to match the expected format with message counts
    const transformedConversations = await Promise.all(
      userConversations.map(async conv => {
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

    return c.json({
      success: true,
      conversations: transformedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// POST /conversations - Create new conversation
export const conversationsPost = async (c: Context) => {
  try {
    const { userId, title, mode, provider } = await c.req.json();

    if (!userId || !title || !mode || !provider) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const conversationRepo = new ConversationRepository();
    const newConversation = await conversationRepo.createConversation({
      userId,
      title,
      mode,
      provider,
      lastMessageAt: new Date().toISOString(),
      isArchived: false,
    });

    return c.json({
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
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// GET /conversations/:id - Get specific conversation
export const conversationGetById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id');

    const conversationRepo = new ConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId, userId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// PUT /conversations/:id - Update conversation
export const conversationPutById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id');
    const updates = await c.req.json();

    const conversationRepo = new ConversationRepository();
    const updatedConversation = await conversationRepo.updateConversation(
      conversationId, 
      userId, 
      updates
    );

    if (!updatedConversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// DELETE /conversations/:id - Delete conversation
export const conversationDeleteById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id');

    const conversationRepo = new ConversationRepository();
    const deleted = await conversationRepo.deleteConversation(conversationId, userId);

    if (!deleted) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// POST /conversations/:id/share - Share conversation
export const conversationShareById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id');

    const conversationRepo = new ConversationRepository();
    const shareId = await conversationRepo.shareConversation(conversationId, userId);

    if (!shareId) {
      return c.json({ error: 'Failed to share conversation' }, 400);
    }

    return c.json({
      success: true,
      shareId,
    });
  } catch (error) {
    console.error('Error sharing conversation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

// DELETE /conversations/:id/share - Unshare conversation
export const conversationUnshareById = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id');

    const conversationRepo = new ConversationRepository();
    const unshared = await conversationRepo.unshareConversation(conversationId, userId);

    if (!unshared) {
      return c.json({ error: 'Failed to unshare conversation' }, 400);
    }

    return c.json({
      success: true,
      message: 'Conversation unshared',
    });
  } catch (error) {
    console.error('Error unsharing conversation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};