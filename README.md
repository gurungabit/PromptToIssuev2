# 🎯 AI Ticket Automation

An intelligent chatbot application that generates structured tickets from natural language descriptions using AI. Built with Next.js 14, TypeScript, Tailwind CSS, and Drizzle ORM.

## ✨ Features

- **Dual Modes**: Assistant for general help, Ticket mode for structured ticket generation
- **Multi-Provider AI**: Support for OpenAI, Anthropic, Google AI, and Ollama
- **Professional UI**: ChatGPT-like interface with dark/light themes
- **Persistent Storage**: PostgreSQL database with Drizzle ORM
- **Real-time Chat**: Smooth conversations with copy functionality
- **Ticket Management**: Generate, preview, and manage structured tickets
- **User Management**: User accounts, settings, and conversation history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
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
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prompt_to_issue

# AI Provider Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. Database Setup

Start PostgreSQL with Docker:

```bash
npm run docker:up
```

Push schema and seed data:

```bash
npm run db:setup
```

### 4. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Management

### Available Commands

```bash
# Docker Management
npm run docker:up      # Start PostgreSQL container
npm run docker:down    # Stop PostgreSQL container
npm run docker:logs    # View PostgreSQL logs

# Database Operations
npm run db:generate    # Generate migrations from schema
npm run db:push        # Push schema to database
npm run db:migrate     # Run migrations
npm run db:seed        # Seed database with demo data
npm run db:setup       # Full setup (push + seed)
npm run db:studio      # Open Drizzle Studio
```

### Database Schema

The application uses the following main tables:

- **users**: User accounts and profiles
- **user_settings**: User preferences and configurations
- **conversations**: Chat conversations
- **messages**: Individual chat messages
- **tickets**: Generated tickets with metadata
- **provider_configs**: AI provider configurations

### Drizzle Studio

Explore your database with Drizzle Studio:

```bash
npm run db:studio
```

Visit [https://local.drizzle.studio](https://local.drizzle.studio)

## 🔧 Configuration

### AI Providers

Configure AI providers in your `.env.local`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Database Connection

For external PostgreSQL:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

## 🏗️ Project Structure

```
src/
├── app/                  # Next.js 14 app directory
│   ├── api/             # API routes
│   └── page.tsx         # Main page
├── components/          # React components
│   ├── chat/           # Chat interface components
│   ├── tickets/        # Ticket management components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── lib/               # Utilities and core logic
│   ├── db/           # Database schema and operations
│   ├── llm/          # LLM provider system
│   └── utils.ts      # Utility functions
└── styles/           # Global styles
```

## 🛠️ Development

### Adding New AI Providers

1. Create provider class in `src/lib/llm/providers/`
2. Register in `src/lib/llm/index.ts`
3. Update schemas in `src/lib/schemas.ts`

### Database Migrations

When you modify the schema:

```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations
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

## 🐳 Docker Deployment

### Development with Docker (Database Only)

The existing setup runs only PostgreSQL in Docker for development:

```bash
npm run docker:up      # Start PostgreSQL container
npm run docker:down    # Stop PostgreSQL container
npm run docker:logs    # View PostgreSQL logs
```

### Full Production Deployment with Docker

Deploy the entire application stack (app + database) using Docker:

```bash
# 1. Create production environment file
cp .env.production.example .env.production
# Edit .env.production with your API keys

# 2. Build and start all services
npm run docker:prod:up

# 3. View logs
npm run docker:prod:logs

# 4. Stop all services
npm run docker:prod:down
```

### Manual Docker Build

Build and run the application Docker image manually:

```bash
# Build the image
npm run docker:build

# Run the container (requires database to be running)
npm run docker:run
```

### Docker Services (Production)

The production setup includes:

- **Next.js Application**: Main app running on port 3000
- **PostgreSQL 15**: Database on port 5432
- **pgAdmin**: Database management UI on port 5050

### Environment Variables for Docker

When using Docker production setup, configure these in `.env.production`:

```env
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Database (automatically configured for Docker)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/prompt_to_issue
```

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
