import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const isDevelopment = process.env.NODE_ENV === 'development';

const clientConfig = isDevelopment 
  ? {
      // DynamoDB Local configuration
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'fakeMyKeyId',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'fakeSecretAccessKey',
      },
    }
  : {
      // Production AWS configuration
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

const client = new DynamoDBClient(clientConfig);
export const docClient = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'prompt-to-issue-local';

export type Database = typeof docClient;

export * from './schema';
export * from './repositories';
