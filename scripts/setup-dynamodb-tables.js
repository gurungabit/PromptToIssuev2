const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'fakeMyKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
  },
});

const TABLE_NAME = 'prompt-to-issue-local';

async function createTable() {
  try {
    // Check if table exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log('✅ Table already exists:', TABLE_NAME);
      return;
    } catch (error) {
      // Table doesn't exist, create it
      console.log('📋 Table does not exist, creating:', TABLE_NAME);
    }

    const createTableParams = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' }, // Partition key
        { AttributeName: 'SK', KeyType: 'RANGE' }, // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };

    console.log('🏗️  Creating table:', TABLE_NAME);
    await client.send(new CreateTableCommand(createTableParams));
    console.log('✅ Table created successfully!');
    console.log('📊 Table structure:');
    console.log('   - Primary Key: PK (Partition) + SK (Sort)');
    console.log('   - Global Secondary Index: GSI1PK + GSI1SK');
    console.log('   - Billing Mode: Provisioned (5 RCU/WCU)');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Setting up DynamoDB tables...');
    await createTable();
    console.log('🎉 DynamoDB setup complete!');
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

main();
