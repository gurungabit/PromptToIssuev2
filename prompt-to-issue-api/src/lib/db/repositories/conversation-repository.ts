import { docClient, TABLE_NAME } from '../index';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { 
  Conversation, 
  NewConversation,
  createConversationItem,
  createShareKeys,
  createTimestamp,
  generateId
} from '../schema';

export class ConversationRepository {
  async createConversation(conversationData: NewConversation): Promise<Conversation> {
    const conversation = createConversationItem(conversationData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: conversation,
    }));

    return conversation;
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    // Need to query by userId since we don't know the timestamp
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CONV#',
        ':id': conversationId,
      },
    }));

    return result.Items?.[0] as Conversation || null;
  }

  async getUserConversations(userId: string, archived = false): Promise<Conversation[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type AND isArchived = :archived',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CONV#',
        ':type': 'CONVERSATION',
        ':archived': archived,
      },
      ScanIndexForward: false, // Latest first
    }));

    return result.Items as Conversation[] || [];
  }

  async getConversationByShareId(shareId: string): Promise<Conversation | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SHARE#${shareId}`,
      },
    }));

    return result.Items?.[0] as Conversation || null;
  }

  async updateConversation(conversationId: string, userId: string, updates: Partial<Omit<Conversation, 'PK' | 'SK' | 'type' | 'id' | 'userId' | 'createdAt'>>): Promise<Conversation | null> {
    // First get the conversation to find its exact SK
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) return null;

    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'PK' && key !== 'SK' && key !== 'type' && key !== 'id' && key !== 'userId' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return conversation;
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    // Handle shareId updates - need to update GSI keys
    if (updates.shareId !== undefined) {
      if (updates.shareId) {
        const gsiKeys = createShareKeys(updates.shareId, conversationId);
        updateExpression.push('#GSI1PK = :GSI1PK', '#GSI1SK = :GSI1SK');
        expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
        expressionAttributeNames['#GSI1SK'] = 'GSI1SK';
        expressionAttributeValues[':GSI1PK'] = gsiKeys.GSI1PK;
        expressionAttributeValues[':GSI1SK'] = gsiKeys.GSI1SK;
      } else {
        // Remove GSI keys if shareId is being cleared
        updateExpression.push('#GSI1PK = :null', '#GSI1SK = :null');
        expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
        expressionAttributeNames['#GSI1SK'] = 'GSI1SK';
        expressionAttributeValues[':null'] = null;
      }
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: conversation.PK,
        SK: conversation.SK,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Conversation || null;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    // First get the conversation to find its exact SK
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) return false;

    // TODO: Also delete all related messages and tickets
    // This would typically be done in a transaction or batch operation

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: conversation.PK,
        SK: conversation.SK,
      },
    }));

    return true;
  }

  async shareConversation(conversationId: string, userId: string): Promise<string | null> {
    const shareId = generateId();
    
    const updatedConversation = await this.updateConversation(conversationId, userId, {
      shareId,
    });

    return updatedConversation ? shareId : null;
  }

  async unshareConversation(conversationId: string, userId: string): Promise<boolean> {
    const updatedConversation = await this.updateConversation(conversationId, userId, {
      shareId: undefined,
    });

    return updatedConversation !== null;
  }
}