# 🎯 AI Ticket Automation

An intelligent chatbot application that generates structured tickets from natural language descriptions using AI. Built with Next.js 15, TypeScript, Tailwind CSS, and DynamoDB.

## ✨ Features

- **Dual Modes**: Assistant for general help, Ticket mode for structured ticket generation
- **Multi-Provider AI**: Support for OpenAI, Anthropic, Google AI, and Ollama
- **MCP Server Integration**: GitHub and GitLab MCP servers for repository management
- **Professional UI**: ChatGPT-like interface with dark/light themes
- **Persistent Storage**: DynamoDB with single table design
- **Real-time Chat**: Smooth conversations with copy functionality
- **Ticket Management**: Generate, preview, and manage structured tickets
- **User Management**: User accounts, settings, and conversation history

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Git
- Docker Desktop
- npm or yarn package manager

### System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: At least 2GB free space
- **Docker**: Required for DynamoDB Local container

### 1. Clone and Install

```bash
git clone https://github.com/gurungabit/PromptToIssuev2.git
cd prompt-to-issue
npm install
```

### 2. Environment Setup

Copy the environment file and configure your settings:

```bash
cp .env.example .env.local
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

## 📋 Complete Developer Setup Guide

This comprehensive guide will walk you through setting up the project from scratch, including all dependencies and troubleshooting common issues.

### Step 1: Install Prerequisites

#### Install Node.js

- Download Node.js 18+ (LTS) from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` and `npm --version`

#### Install Docker Desktop

- **Windows/macOS**: Download from [docker.com](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow instructions for your distribution
- Verify installation: `docker --version` and `docker-compose --version`

#### Install Git

- Download from [git-scm.com](https://git-scm.com/) if not already installed
- Verify: `git --version`

### Step 2: Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/gurungabit/PromptToIssuev2.git
cd PromptToIssuev2

# Install dependencies (this may take a few minutes)
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local

# Open .env.local in your preferred editor
# Windows: notepad .env.local
# macOS: open .env.local
# Linux: nano .env.local
```

**Required Configuration in .env.local:**

```env
# DynamoDB Local Configuration (for development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=fakeMyKeyId
AWS_SECRET_ACCESS_KEY=fakeSecretAccessKey
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_NAME=PromptToIssueTable

# AI Provider API Keys (get from respective providers)
OPENAI_API_KEY=sk-your_openai_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
GOOGLE_API_KEY=your_google_ai_key_here

# MCP Server Configuration (optional but recommended)
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITLAB_TOKEN=glpat-your_gitlab_personal_access_token
GITLAB_URL=https://gitlab.com/api/v4
```

**Getting API Keys:**

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **Google AI**: [makersuite.google.com](https://makersuite.google.com/app/apikey)
- **GitHub Token**: Settings → Developer settings → Personal access tokens
- **GitLab Token**: User Settings → Access Tokens

### Step 4: Docker and Database Setup

```bash
# Start Docker Desktop first, then run:

# Start DynamoDB Local container
npm run db:up

# Wait for container to start (about 30 seconds), then setup tables
npm run db:setup

# Verify the database is running
docker ps
# You should see a container named "dynamodb-local" running
```

**Troubleshooting Docker Issues:**

- **Port 8000 in use**: Stop other services using port 8000 or change the port in docker-compose.dynamodb.yml
- **Docker not running**: Ensure Docker Desktop is started and running
- **Permission issues on Linux**: Add your user to the docker group: `sudo usermod -aG docker $USER`

### Step 5: MCP Server Setup (Optional but Recommended)

The project includes MCP (Model Context Protocol) servers for GitHub and GitLab integration, allowing the AI to interact with repositories, create issues, and manage projects.

#### Prerequisites for MCP Servers

**Python 3.12+ and uv Package Manager:**

**Windows:**

```bash
# Install Python 3.12+ from python.org
# Install uv
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS:**

```bash
# Using Homebrew (recommended)
brew install python uv

# Or install uv only if Python is already installed
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Linux:**

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install python3.12 python3.12-venv
curl -LsSf https://astral.sh/uv/install.sh | sh

# CentOS/RHEL/Fedora
sudo dnf install python3.12
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Verify Installation:**

```bash
python --version    # Should be 3.12+
uv --version        # Should show uv version
```

#### Setup MCP Servers

```bash
# Setup both GitHub and GitLab MCP servers
npm run mcp:sync

# This command will:
# 1. Setup GitHub MCP server in mcp/github-mcp/
# 2. Setup GitLab MCP server in mcp/gitlab-mcp/
# 3. Install all Python dependencies using uv
```

#### Manual MCP Server Setup (Alternative)

If `npm run mcp:sync` fails, you can set up servers manually:

**GitHub MCP Server:**

```bash
cd mcp/github-mcp
uv sync                                    # Install dependencies
uv run python github_mcp_server.py       # Test the server
```

**GitLab MCP Server:**

```bash
cd mcp/gitlab-mcp
uv sync                                    # Install dependencies
uv run python gitlab_mcp_server.py       # Test the server
```

#### Get API Tokens

**GitHub Personal Access Token:**

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:user`, `read:org`
4. Copy the generated token

**GitLab Personal Access Token:**

1. Go to [GitLab → User Settings → Access Tokens](https://gitlab.com/-/user_settings/personal_access_tokens)
2. Create token with scopes: `api`, `read_repository`, `write_repository`
3. For custom GitLab instances: `https://your-gitlab.com/-/user_settings/personal_access_tokens`
4. Copy the generated token

#### Add Tokens to Environment

Add your API tokens to `.env.local`:

```env
# Add these to your existing .env.local file

# GitHub MCP Server
GITHUB_TOKEN=ghp_your_github_token_here

# GitLab MCP Server
GITLAB_TOKEN=glpat-your_gitlab_token_here
GITLAB_URL=https://gitlab.com/api/v4  # For gitlab.com (default)
# GITLAB_URL=https://your-gitlab.com/api/v4  # For custom instances
```

#### Test MCP Servers

**Test GitHub MCP Server:**

```bash
cd mcp/github-mcp
export GITHUB_TOKEN="your_token_here"
uv run python github_mcp_server.py

# Should show: "GitHub MCP Server starting on stdio"
# Press Ctrl+C to stop
```

**Test GitLab MCP Server:**

```bash
cd mcp/gitlab-mcp
export GITLAB_TOKEN="your_token_here"
export GITLAB_API_BASE="https://gitlab.com/api/v4"
uv run python gitlab_mcp_server.py

# Should show: "GitLab MCP Server starting on stdio"
# Press Ctrl+C to stop
```

### Step 6: Start Development Environment

**Option A: Single Command (Recommended)**

```bash
# This starts both DynamoDB and Next.js dev server
npm run dev
```

**Option B: Separate Terminals**

```bash
# Terminal 1: Database
npm run db:start

# Terminal 2: Application (after database is ready)
npm run dev
```

### Step 7: Verify Installation

1. **Check Application**: Visit [http://localhost:3000](http://localhost:3000)
2. **Test Chat**: Try sending a message in assistant mode
3. **Test Ticket Generation**: Switch to ticket mode and generate a ticket
4. **Check Database**: Verify conversations are saved by refreshing the page

### Step 8: Development Workflow

```bash
# Daily development routine:
npm run dev                    # Start development server
npm run lint                   # Check code quality
npm run format                 # Format code
npm run build                  # Test production build

# Database management:
npm run db:down               # Stop database
npm run db:up                 # Start database
npm run db:setup              # Reset and seed database
```

### Common Issues and Solutions

#### Issue: "Module not found" errors

**Solution:**

```bash
rm -rf node_modules package-lock.json
npm install
```

#### Issue: DynamoDB connection errors

**Solutions:**

1. Check if Docker is running: `docker ps`
2. Restart DynamoDB: `npm run db:down && npm run db:up`
3. Check port availability: `lsof -i :8000` (macOS/Linux) or `netstat -an | findstr :8000` (Windows)

#### Issue: API key errors

**Solutions:**

1. Verify API keys are correctly set in `.env.local`
2. Check if keys have proper permissions
3. Test keys with provider's API documentation

#### Issue: Build failures

**Solutions:**

```bash
npm run lint                   # Fix linting errors
npm run format                 # Fix formatting
rm -rf .next                   # Clear Next.js cache
npm run build                  # Rebuild
```

#### Issue: Python/uv installation for MCP servers

**Solutions:**

- **Windows**: Install Python from python.org and follow uv installation guide
- **macOS**: Use Homebrew: `brew install python uv`
- **Linux**: Use system package manager or pyenv

#### Issue: MCP server connection errors

**Solutions:**

1. Check Python version: `python --version` (must be 3.12+)
2. Verify tokens are set in `.env.local`
3. Test server manually: `cd mcp/github-mcp && uv run python github_mcp_server.py`
4. Check network connectivity to GitHub/GitLab APIs

### Development Tips

1. **Code Quality**: Run `npm run lint && npm run format:check` before committing
2. **Hot Reload**: The dev server supports hot reload for most changes
3. **Database Reset**: Use `npm run db:setup` to reset database with fresh seed data
4. **Environment**: Keep `.env.local` out of version control (it's in .gitignore)
5. **Updates**: Run `npm run upackage` to update all dependencies

### Next Steps

- **Configure AI Providers**: Add your API keys to start using AI features
- **Explore MCP Integration**: Set up GitHub/GitLab tokens for repository integration
- **Customize Settings**: Use the settings panel to configure default providers
- **Create Tickets**: Try generating tickets from natural language descriptions

## 🗄️ Database Management

### Docker Commands

```bash
# Docker Container Management
npm run db:up            # Start DynamoDB Local container
npm run db:down          # Stop DynamoDB Local container
npm run db:start         # Start container and setup tables
npm run db:setup         # Create tables and seed data (container must be running)

# Manual Docker Commands (if needed)
docker-compose -f docker-compose.dynamodb.yml up -d    # Start container
docker-compose -f docker-compose.dynamodb.yml down     # Stop container
docker ps                                              # Check running containers
docker logs dynamodb-local                             # View container logs
```

### Available Commands

```bash
# Database Operations
npm run db:start         # Complete database startup (container + tables)
npm run db:setup         # Create tables and seed data
npm run db:up            # Start DynamoDB Local container only
npm run db:down          # Stop DynamoDB Local container
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
    ├── github-mcp/   # GitHub MCP server
    └── gitlab-mcp/   # GitLab MCP server
```

## 🔗 MCP Server Configuration

### What are MCP Servers?

MCP (Model Context Protocol) servers enable the AI to interact with external systems like GitHub and GitLab. They provide tools for:

**GitHub MCP Server:**

- List and search repositories
- Get repository information
- List, create, and manage issues
- Access repository contents

**GitLab MCP Server:**

- List and search projects
- Get project information
- List, create, and manage issues
- Handle merge requests
- Access repository files and directories
- Support for custom GitLab instances

### Configure MCP in Application

1. **Start the application**: `npm run dev`
2. **Open Settings Panel**: Click the settings gear icon in the chat interface
3. **Navigate to MCP tab**: Click on "MCP" in the settings panel
4. **Enable MCP Integration**: Toggle "Enable MCP" to on

### Default MCP Server Configuration

The application comes with pre-configured MCP servers. When you enable MCP, these servers are automatically available:

**GitHub MCP Server:**

```json
{
  "id": "github-mcp",
  "name": "GitHub MCP",
  "description": "GitHub API integration for repositories, issues, and pull requests",
  "command": "uv",
  "args": ["run", "python", "github_mcp_server.py"],
  "cwd": "./mcp/github-mcp",
  "env": {
    "GITHUB_TOKEN": "your_github_token_here"
  },
  "enabled": true
}
```

**GitLab MCP Server:**

```json
{
  "id": "gitlab-mcp",
  "name": "GitLab MCP",
  "description": "GitLab API integration for projects, issues, and merge requests",
  "command": "uv",
  "args": ["run", "python", "gitlab_mcp_server.py"],
  "cwd": "./mcp/gitlab-mcp",
  "env": {
    "GITLAB_TOKEN": "your_gitlab_token_here",
    "GITLAB_API_BASE": "https://gitlab.com/api/v4"
  },
  "enabled": true
}
```

### Custom MCP Server Configuration

You can add custom MCP servers through the settings interface:

1. **Click "Add Server"** in the MCP settings panel
2. **Configure server details**:
   - **Name**: Display name for the server
   - **Description**: What the server does
   - **Command**: Executable command (e.g., `uv`, `python`, `node`)
   - **Arguments**: Command arguments as array
   - **Working Directory**: Server location (relative to project root)
   - **Environment Variables**: API keys and configuration

### Environment Variables for MCP

Add these to your `.env.local` file:

```env
# GitHub MCP Server
GITHUB_TOKEN=ghp_your_github_personal_access_token

# GitLab MCP Server (gitlab.com)
GITLAB_TOKEN=glpat-your_gitlab_personal_access_token
GITLAB_URL=https://gitlab.com/api/v4

# GitLab MCP Server (custom instance)
GITLAB_TOKEN=glpat-your_gitlab_personal_access_token
GITLAB_URL=https://your-custom-gitlab.com/api/v4
```

### Testing MCP Integration

1. **Enable MCP** in settings
2. **Verify servers are running**: Green indicators in MCP settings
3. **Test in chat**: Try commands like:
   - "List my GitHub repositories"
   - "Create an issue in my project"
   - "Show me open issues in [repository]"
   - "Search for projects in GitLab"

### MCP Server Tools Reference

**GitHub MCP Tools:**

- `list_repositories(owner, per_page=30)` - List user/org repositories
- `get_repository_info(owner, repo)` - Get detailed repository information
- `list_issues(owner, repo, state="open", per_page=30)` - List repository issues
- `create_issue(owner, repo, title, body, labels, assignees)` - Create new issue
- `get_issue(owner, repo, issue_number)` - Get specific issue details
- `search_repositories(query, sort="stars", order="desc", per_page=30)` - Search repositories

**GitLab MCP Tools:**

- `list_projects(owner, per_page=30)` - List user/group projects
- `get_project_info(project_id)` - Get detailed project information
- `list_issues(project_id, state="opened", per_page=30)` - List project issues
- `create_issue(project_id, title, description, labels, assignee_ids)` - Create new issue
- `get_issue(project_id, issue_iid)` - Get specific issue details
- `get_file(project_id, file_path, branch="main")` - Get file contents
- `list_repository_tree(project_id, path="", branch="main")` - List directory contents
- `search_projects(query, order_by="last_activity_at", sort="desc", per_page=30)` - Search projects
- `list_merge_requests(project_id, state="opened", per_page=30)` - List merge requests

### Troubleshooting MCP Issues

**Server Not Starting:**

1. Check Python version: `python --version` (requires 3.12+)
2. Verify uv installation: `uv --version`
3. Test server manually: `cd mcp/github-mcp && uv run python github_mcp_server.py`

**Authentication Errors:**

1. Verify API tokens are correct in `.env.local`
2. Check token permissions (GitHub: repo, read:user, read:org)
3. Test token with API directly: `curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/user`

**Connection Issues:**

1. Check network connectivity
2. Verify server URLs (GitLab custom instances)
3. Check firewall settings

## 🛠️ Development

### Adding New AI Providers

1. Create provider class in `src/lib/llm/providers/`
2. Register in `src/lib/llm/index.ts`
3. Update schemas in `src/lib/schemas.ts`

### MCP Server Development

The project includes MCP (Model Context Protocol) server integration:

- **GitHub MCP Server**: Located in `mcp/github-mcp/` - GitHub API integration for repositories, issues, and pull requests
- **GitLab MCP Server**: Located in `mcp/gitlab-mcp/` - GitLab API integration for projects, issues, and merge requests (supports custom GitLab instances)
- **Configuration**: Managed through `MCPSettings` component
- **Security**: Use environment variables for API tokens

To develop MCP servers:

```bash
# GitHub MCP Server
cd mcp/github-mcp
uv sync
uv run python github_mcp_server.py

# GitLab MCP Server
cd mcp/gitlab-mcp
uv sync
uv run python gitlab_mcp_server.py
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
