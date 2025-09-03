import { docClient, TABLE_NAME } from '../index';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { 
  Message, 
  NewMessage,
  createMessageItem,
  createTimestamp
} from '../schema';

export class MessageRepository {
  async createMessage(messageData: NewMessage): Promise<Message> {
    const message = createMessageItem(messageData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: message,
    }));

    return message;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `CONV#${conversationId}`,
        ':sk': 'MSG#',
        ':type': 'MESSAGE',
      },
      ScanIndexForward: true, // Oldest first (chronological order)
    }));

    return result.Items as Message[] || [];
  }

  async updateMessage(messageId: string, conversationId: string, updates: Partial<Omit<Message, 'PK' | 'SK' | 'type' | 'id' | 'conversationId' | 'createdAt'>>): Promise<Message | null> {
    // First get the message to find its exact SK
    const messages = await this.getConversationMessages(conversationId);
    const message = messages.find(m => m.id === messageId);
    if (!message) return null;

    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'PK' && key !== 'SK' && key !== 'type' && key !== 'id' && key !== 'conversationId' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return message;
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: message.PK,
        SK: message.SK,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Message || null;
  }

  async deleteMessage(messageId: string, conversationId: string): Promise<boolean> {
    // First get the message to find its exact SK
    const messages = await this.getConversationMessages(conversationId);
    const message = messages.find(m => m.id === messageId);
    if (!message) return false;

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: message.PK,
        SK: message.SK,
      },
    }));

    return true;
  }

  async getMessageCount(conversationId: string): Promise<number> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `CONV#${conversationId}`,
        ':sk': 'MSG#',
        ':type': 'MESSAGE',
      },
      Select: 'COUNT',
    }));

    return result.Count || 0;
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `CONV#${conversationId}`,
        ':sk': 'MSG#',
        ':type': 'MESSAGE',
      },
      ScanIndexForward: false, // Latest first
      Limit: 1,
    }));

    return result.Items?.[0] as Message || null;
  }
}