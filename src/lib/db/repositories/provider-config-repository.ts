import { docClient, TABLE_NAME } from '../index';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { 
  ProviderConfig, 
  NewProviderConfig,
  createProviderConfigItem,
  createProviderConfigKeys,
  createTimestamp
} from '../schema';

export class ProviderConfigRepository {
  async createProviderConfig(configData: NewProviderConfig): Promise<ProviderConfig> {
    const config = createProviderConfigItem(configData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: config,
    }));

    return config;
  }

  async getUserProviderConfigs(userId: string): Promise<ProviderConfig[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'PROVIDER#',
        ':type': 'PROVIDER_CONFIG',
      },
    }));

    return result.Items as ProviderConfig[] || [];
  }

  async getProviderConfig(userId: string, provider: string): Promise<ProviderConfig | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `PROVIDER#${provider}`,
      },
    }));

    return result.Items?.[0] as ProviderConfig || null;
  }

  async updateProviderConfig(userId: string, provider: string, updates: Partial<Omit<ProviderConfig, 'PK' | 'SK' | 'type' | 'id' | 'userId' | 'provider' | 'createdAt'>>): Promise<ProviderConfig | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'PK' && key !== 'SK' && key !== 'type' && key !== 'id' && key !== 'userId' && key !== 'provider' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getProviderConfig(userId, provider);
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: createProviderConfigKeys(userId, provider),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as ProviderConfig || null;
  }

  async deleteProviderConfig(userId: string, provider: string): Promise<boolean> {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: createProviderConfigKeys(userId, provider),
    }));

    return true;
  }

  async getActiveProviderConfigs(userId: string): Promise<ProviderConfig[]> {
    const configs = await this.getUserProviderConfigs(userId);
    return configs.filter(config => config.isActive);
  }
} 