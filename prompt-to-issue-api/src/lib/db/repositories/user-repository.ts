import { docClient, TABLE_NAME } from '../index';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { 
  User, 
  UserSettings, 
  NewUser, 
  NewUserSettings,
  createUserItem,
  createUserSettingsItem,
  createUserKeys,
  createUserSettingsKeys,
  createTimestamp
} from '../schema';

export class UserRepository {
  async createUser(userData: NewUser): Promise<User> {
    const user = createUserItem(userData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwrite
    }));

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: createUserKeys(userId),
    }));

    return result.Item as User || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // Note: This requires a scan operation since email is not indexed
    // In production, you might want to add a GSI for email lookups
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#email = :email AND #type = :type',
      ExpressionAttributeNames: {
        '#email': 'email',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':email': email,
        ':type': 'USER',
      },
    }));

    return result.Items?.[0] as User || null;
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'PK' | 'SK' | 'type' | 'id' | 'createdAt'>>): Promise<User | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'PK' && key !== 'SK' && key !== 'type' && key !== 'id' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getUserById(userId);
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: createUserKeys(userId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as User || null;
  }

  async createUserSettings(settingsData: NewUserSettings): Promise<UserSettings> {
    const settings = createUserSettingsItem(settingsData);

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: settings,
    }));

    return settings;
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: createUserSettingsKeys(userId),
    }));

    return result.Item as UserSettings || null;
  }

  async updateUserSettings(userId: string, updates: Partial<Omit<UserSettings, 'PK' | 'SK' | 'type' | 'userId' | 'createdAt'>>): Promise<UserSettings | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'PK' && key !== 'SK' && key !== 'type' && key !== 'userId' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getUserSettings(userId);
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = createTimestamp();

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: createUserSettingsKeys(userId),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as UserSettings || null;
  }
}