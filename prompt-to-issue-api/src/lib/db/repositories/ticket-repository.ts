import { docClient, TABLE_NAME } from '../index';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { 
  Ticket, 
  NewTicket,
  createTicketItem,
  createTimestamp
} from '../schema';

export class TicketRepository {
  async createTicket(ticketData: NewTicket): Promise<Ticket> {
    const ticket = createTicketItem(ticketData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: ticket,
    }));

    return ticket;
  }

  async getConversationTickets(conversationId: string): Promise<Ticket[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `CONV#${conversationId}`,
        ':sk': 'TICKET#',
        ':type': 'TICKET',
      },
    }));

    return result.Items as Ticket[] || [];
  }

  async getTicketById(ticketId: string, conversationId: string): Promise<Ticket | null> {
    const tickets = await this.getConversationTickets(conversationId);
    return tickets.find(t => t.id === ticketId) || null;
  }

  async updateTicket(ticketId: string, conversationId: string, updates: Partial<Omit<Ticket, 'PK' | 'SK' | 'type' | 'id' | 'conversationId' | 'createdAt'>>): Promise<Ticket | null> {
    // First get the ticket to find its exact SK
    const ticket = await this.getTicketById(ticketId, conversationId);
    if (!ticket) return null;

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
      return ticket;
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: ticket.PK,
        SK: ticket.SK,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Ticket || null;
  }

  async deleteTicket(ticketId: string, conversationId: string): Promise<boolean> {
    const ticket = await this.getTicketById(ticketId, conversationId);
    if (!ticket) return false;

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: ticket.PK,
        SK: ticket.SK,
      },
    }));

    return true;
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    // Note: This requires a scan operation across all conversations
    // In production, you might want to add a GSI for status-based queries
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#type = :type AND #status = :status',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':type': 'TICKET',
        ':status': status,
      },
    }));

    return result.Items as Ticket[] || [];
  }
}