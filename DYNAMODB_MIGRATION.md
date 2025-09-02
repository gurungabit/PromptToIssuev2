# DynamoDB Migration Guide

This project has been successfully migrated from SQLite + Drizzle to DynamoDB with a single table design.

## ✅ Migration Complete

### What Changed

1. **Database**: SQLite → DynamoDB (with local development support)
2. **ORM**: Drizzle → Custom repositories with AWS SDK
3. **Schema**: Relational tables → Single table design with composite keys
4. **Dependencies**: Removed SQLite/Drizzle, added AWS SDK

### What Was Preserved

- All your existing environment variables (.env.local)
- All AI provider configurations (OpenAI, Anthropic, Google, Ollama)
- All existing functionality and API routes
- JWT authentication setup
- Platform integrations (GitHub, GitLab)

## 🏗️ New Architecture

### Single Table Design

All data is stored in one DynamoDB table with this structure:

```
Table: prompt-to-issue-local
Primary Key: PK (Partition Key) + SK (Sort Key)
Global Secondary Index: GSI1PK + GSI1SK (for shared conversations)
```

### Data Layout

| Entity          | PK            | SK                      | Purpose                  |
| --------------- | ------------- | ----------------------- | ------------------------ |
| User            | `USER#userId` | `PROFILE`               | User profile data        |
| User Settings   | `USER#userId` | `SETTINGS`              | User preferences         |
| Conversation    | `USER#userId` | `CONV#timestamp#convId` | User's conversations     |
| Message         | `CONV#convId` | `MSG#timestamp#msgId`   | Messages in conversation |
| Ticket          | `CONV#convId` | `TICKET#ticketId`       | Tickets in conversation  |
| Provider Config | `USER#userId` | `PROVIDER#providerName` | AI provider settings     |

## 🚀 Development Setup

### Quick Start

**One-time setup:**

```bash
npm install
```

**Daily development:**

Terminal 1 - Start DynamoDB:

```bash
npm run dynamodb:start
npm run db:setup          # First time only: create tables and seed data
```

Terminal 2 - Start Next.js:

```bash
npm run dev
```

### Detailed Steps

1. **Start DynamoDB Local**

   ```bash
   npm run dynamodb:start
   ```

   This starts DynamoDB Local on `http://localhost:8000`

2. **Setup Tables**

   ```bash
   npm run dynamodb:setup
   ```

   Creates the main table with proper indexes.

3. **Seed Database**

   ```bash
   npm run db:seed
   ```

   Creates demo user, conversation, and messages.

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📝 Available Scripts

| Script                   | Description                        |
| ------------------------ | ---------------------------------- |
| `npm run dynamodb:start` | Start DynamoDB Local in background |
| `npm run dynamodb:setup` | Create tables with proper schema   |
| `npm run db:seed`        | Seed database with demo data       |
| `npm run db:setup`       | Create tables and seed (combined)  |
| `npm run dev`            | Start Next.js development server   |

## 🔧 Environment Configuration

Your `.env.local` includes:

```env
# Development mode
NODE_ENV=development

# DynamoDB Local Configuration
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=prompt-to-issue-local
AWS_ACCESS_KEY_ID=fakeMyKeyId
AWS_SECRET_ACCESS_KEY=fakeSecretAccessKey
AWS_REGION=us-east-1

# Your existing AI provider keys are preserved
OLLAMA_BASE_URL=http://localhost:11434
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# etc...
```

## 🏭 Production Deployment

For production, update your environment variables:

```env
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_real_access_key
AWS_SECRET_ACCESS_KEY=your_real_secret_key
DYNAMODB_TABLE_NAME=prompt-to-issue-prod
# Remove DYNAMODB_ENDPOINT for production AWS DynamoDB
```

### AWS DynamoDB Setup

For production deployment:

1. **Create DynamoDB Table**: Named `prompt-to-issue-prod` (or your chosen name)
2. **Set Primary Key**:
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)
3. **Create Global Secondary Index**:
   - Index name: `GSI1`
   - Partition key: `GSI1PK` (String)
   - Sort key: `GSI1SK` (String)
4. **Configure IAM**: Ensure your AWS credentials have DynamoDB read/write permissions
5. **Update Environment**: Remove `DYNAMODB_ENDPOINT` and use real AWS credentials

## 📊 Data Access Patterns

### Repositories Available

- `UserRepository` - User management and settings
- `ConversationRepository` - Conversation management
- `MessageRepository` - Message operations
- `TicketRepository` - Ticket management
- `ProviderConfigRepository` - AI provider configurations

### Example Usage

```typescript
import { UserRepository, ConversationRepository } from '@/lib/db';

const userRepo = new UserRepository();
const conversationRepo = new ConversationRepository();

// Get user
const user = await userRepo.getUserById('userId');

// Get user's conversations
const conversations = await conversationRepo.getUserConversations('userId');

// Get conversation messages
const messageRepo = new MessageRepository();
const messages = await messageRepo.getConversationMessages('conversationId');
```

## 🔍 DynamoDB Local Tools

### Web Shell

Access the DynamoDB Local web interface at: `http://localhost:8000/shell/`

### Query Examples

```javascript
// Configure AWS SDK for local DynamoDB
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'fakeMyKeyId',
  secretAccessKey: 'fakeSecretAccessKey',
});

var docClient = new AWS.DynamoDB.DocumentClient({
  endpoint: 'http://localhost:8000',
});

// Get all conversations for a user
var params = {
  TableName: 'prompt-to-issue-local',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'USER#userId',
    ':sk': 'CONV#',
  },
};

docClient.query(params, function (err, data) {
  console.log(data.Items);
});
```

## 🎯 Benefits of This Migration

1. **Scalability**: DynamoDB scales automatically with your application load
2. **Performance**: Single-digit millisecond latency for all operations
3. **Serverless**: No infrastructure management or maintenance required
4. **Cost-effective**: Pay only for the read/write capacity you actually use
5. **AWS Integration**: Works seamlessly with other AWS services
6. **Local Development**: Full offline development with DynamoDB Local
7. **Production Ready**: Same code works for both local development and AWS production

## 🔄 Local to Production Transition

The database client automatically detects the environment and switches configuration:

- **Development**: Uses DynamoDB Local with fake credentials
- **Production**: Uses AWS DynamoDB with real credentials

No code changes required - just update environment variables!

## 📚 Next Steps

1. **Test all functionality** with the new DynamoDB backend
2. **Add your API keys** to `.env.local` for AI providers you want to use
3. **Start developing** with `npm run dev`
4. **Deploy to production** with real AWS DynamoDB when ready
5. **Monitor performance** and adjust read/write capacity as needed

The migration is complete and your application now runs on a modern, scalable NoSQL database while maintaining all existing functionality! 🚀
