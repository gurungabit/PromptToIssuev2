# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server with DynamoDB Local
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database Operations
npm run db:start         # Start DynamoDB Local and setup tables
npm run db:up            # Start DynamoDB Local container
npm run db:down          # Stop DynamoDB Local container  
npm run db:setup         # Create tables and seed data

# Dependencies
npm run upackage         # Update all dependencies to latest versions
```

## Project Architecture

This is a Next.js 15 AI-powered ticket generation application with the following key architectural patterns:

### Core Structure
- **Next.js App Router**: Uses the new `app/` directory structure with API routes
- **Single Table DynamoDB**: All entities stored in one table with strategic key patterns
- **Multi-Provider LLM System**: Pluggable AI providers (OpenAI, Anthropic, Google, Ollama)
- **Context-Based State**: React contexts for auth, chat, and toast management

### Key Patterns

**Database Schema (`src/lib/db/schema.ts`)**:
- Single table design with PK/SK patterns:
  - Users: `USER#userId` + `PROFILE` 
  - Settings: `USER#userId` + `SETTINGS`
  - Conversations: `USER#userId` + `CONV#timestamp#convId`
  - Messages: `CONV#convId` + `MSG#timestamp#msgId`
  - Tickets: `CONV#convId` + `TICKET#ticketId`
  - Provider Configs: `USER#userId` + `PROVIDER#providerName`

**LLM Provider System (`src/lib/llm/`)**:
- Base provider interface with registry pattern
- Each provider implements `BaseLLMProvider` interface
- Factory functions for creating providers with custom configs
- Default configurations for all supported providers

**API Architecture**:
- Chat API (`/api/chat`) handles both assistant and ticket generation modes
- Dual persistence: saves user/assistant messages to DynamoDB
- Provider validation before processing requests
- Graceful error handling with database fallbacks

### Key Components

**ChatInterface** (`src/components/chat/ChatInterface.tsx`):
- Main chat UI with resizable ticket panel
- Persists panel width to localStorage
- Handles mode switching (assistant vs ticket)

**Database Repositories** (`src/lib/db/repositories/`):
- Repository pattern for each entity type
- Consistent error handling and validation
- Helper functions for key generation and item creation

### Environment Configuration

Required environment variables:
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` - AI provider keys
- `DYNAMODB_ENDPOINT=http://localhost:8000` - Local DynamoDB endpoint
- `DYNAMODB_TABLE_NAME=PromptToIssueTable` - Table name
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS config

### Development Workflow

1. Start DynamoDB Local: `npm run db:start`
2. Start development server: `npm run dev`
3. Access application at `http://localhost:3000`

The application automatically sets up database tables and seeds demo data on first run.

### Adding New AI Providers

1. Create provider class in `src/lib/llm/providers/`
2. Implement `BaseLLMProvider` interface
3. Register in `src/lib/llm/index.ts`
4. Update schemas in `src/lib/schemas.ts`
5. Add environment variable for API key

### Testing and Quality

Run linting and formatting before commits:
```bash
npm run lint && npm run format:check
```

The project uses ESLint with Next.js config and Prettier for consistent formatting.