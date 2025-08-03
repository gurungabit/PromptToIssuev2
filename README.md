# 🎯 AI Ticket Automation

An intelligent chatbot application that generates structured tickets from natural language descriptions using AI. Built with Next.js 15, TypeScript, Tailwind CSS, and DynamoDB.

## ✨ Features

- **Dual Modes**: Assistant for general help, Ticket mode for structured ticket generation
- **Multi-Provider AI**: Support for OpenAI, Anthropic, Google AI, and Ollama
- **MCP Server Integration**: GitHub MCP server for repository management
- **Professional UI**: ChatGPT-like interface with dark/light themes
- **Persistent Storage**: DynamoDB with single table design
- **Real-time Chat**: Smooth conversations with copy functionality
- **Ticket Management**: Generate, preview, and manage structured tickets
- **User Management**: User accounts, settings, and conversation history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Git

### 1. Clone and Install

```bash
git clone https://github.com/gurungabit/PromptToIssuev2.git
cd prompt-to-issue
npm install
```

### 2. Environment Setup

Copy the environment file and configure your settings:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your API keys:

```env
# DynamoDB Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=fakeMyKeyId
AWS_SECRET_ACCESS_KEY=fakeSecretAccessKey
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=PromptToIssueTable

# AI Provider Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. Database Setup

Set up tables (one-time setup):

```bash
npm run db:setup          # Create tables and seed data
```

### 4. Start Development

**Terminal 1 - Database:**
```bash
npm run dynamodb:start   # Start DynamoDB Local
npm run db:setup          # First time: create tables and seed data
```

**Terminal 2 - App:**
```bash
npm run dev              # Start Next.js development server
```

Visit [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Management

### Available Commands

```bash
# Database Operations
npm run dynamodb:start   # Start DynamoDB Local
npm run dynamodb:setup   # Create tables and seed data
npm run db:seed          # Seed database with demo data
npm run db:setup         # Full setup (create tables + seed)
```

### Database Schema

The application uses a single DynamoDB table with the following entity patterns:

- **Users**: `USER#userId` + `PROFILE`
- **User Settings**: `USER#userId` + `SETTINGS`
- **Conversations**: `USER#userId` + `CONV#timestamp#convId`
- **Messages**: `CONV#convId` + `MSG#timestamp#msgId`
- **Tickets**: `CONV#convId` + `TICKET#ticketId`
- **Provider Configs**: `USER#userId` + `PROVIDER#providerName`

### DynamoDB Local

For local development, the application uses DynamoDB Local which runs on port 8000.

The database automatically creates tables and seeds demo data when you run `npm run db:setup`.

## 🔧 Configuration

### AI Providers

Configure AI providers in your `.env.local`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Database Connection

DynamoDB configuration:

```env
# Local Development (DynamoDB Local)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=fakeMyKeyId
AWS_SECRET_ACCESS_KEY=fakeSecretAccessKey
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=PromptToIssueTable

# Production (AWS DynamoDB)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_TABLE_NAME=PromptToIssueTable
# DYNAMODB_ENDPOINT is not set for production (uses AWS)
```

## 🏗️ Project Structure

```
src/
├── app/                  # Next.js 15 app directory
│   ├── api/             # API routes
│   └── page.tsx         # Main page
├── components/          # React components
│   ├── chat/           # Chat interface components
│   ├── settings/       # Settings and configuration components
│   ├── tickets/        # Ticket management components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── lib/               # Utilities and core logic
│   ├── db/           # Database schema and repositories
│   ├── llm/          # LLM provider system
│   └── utils.ts      # Utility functions
├── styles/           # Global styles
└── mcp/              # MCP server implementations
    └── github-mcp/   # GitHub MCP server
```

## 🛠️ Development

### Adding New AI Providers

1. Create provider class in `src/lib/llm/providers/`
2. Register in `src/lib/llm/index.ts`
3. Update schemas in `src/lib/schemas.ts`

### MCP Server Development

The project includes MCP (Model Context Protocol) server integration:

- **GitHub MCP Server**: Located in `mcp/github-mcp/`
- **Configuration**: Managed through `MCPSettings` component
- **Security**: Use environment variables for API tokens

To develop MCP servers:

```bash
cd mcp/github-mcp
uv init
uv add fastmcp requests
uv run python github_mcp_server.py
```

### Database Operations

When you modify the schema or repositories:

```bash
npm run db:seed      # Re-seed data
npm run db:setup     # Full reset (restart DynamoDB + setup)
```

### Code Quality

```bash
npm run lint         # ESLint
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run build        # Test production build
```

### Code Formatting

This project uses Prettier for consistent code formatting:

- **Auto-format**: Code is automatically formatted on save (VS Code)
- **Manual format**: Run `npm run format` to format all files
- **Check format**: Run `npm run format:check` to verify formatting
- **Configuration**: See `.prettierrc` for formatting rules

The project integrates Prettier with ESLint to prevent conflicts between linting and formatting rules.

## 🚀 Production Deployment

### Environment Variables

Configure these in `.env.production`:

```env
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# AWS DynamoDB (Production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DYNAMODB_TABLE_NAME=PromptToIssueTable
```

### Build for Production

```bash
npm run build
npm run start
```

### AWS DynamoDB Setup

For production, you'll need to:

1. Create a DynamoDB table named `PromptToIssueTable`
2. Set up proper IAM permissions
3. Configure AWS credentials
4. Ensure the table has the correct key schema (PK, SK)

See `DYNAMODB_MIGRATION.md` for detailed setup instructions.

## 📝 API Documentation

### Chat API

```typescript
POST /api/chat
{
  "message": "Create user authentication system",
  "mode": "ticket",
  "provider": "openai",
  "config": { ... },
  "conversationHistory": [ ... ]
}
```

### Tickets API

```typescript
POST /api/tickets/create
{
  "tickets": [ ... ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
