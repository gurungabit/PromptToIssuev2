# GitHub MCP Server

A Model Context Protocol (MCP) server that provides GitHub API integration using FastMCP.

## Features

- List repositories for users/organizations
- Get detailed repository information
- List, create, and get GitHub issues
- Search repositories
- Full authentication with GitHub API

## Setup

1. Install dependencies:
```bash
uv sync
```

2. Run the server:
```bash
uv run python github_mcp_server.py
```

## Available Tools

- `list_repositories(owner, per_page=30)` - List repositories for a user/org
- `get_repository_info(owner, repo)` - Get detailed repo information  
- `list_issues(owner, repo, state="open", per_page=30)` - List repository issues
- `create_issue(owner, repo, title, body="", labels=None, assignees=None)` - Create new issue
- `get_issue(owner, repo, issue_number)` - Get specific issue details
- `search_repositories(query, sort="stars", order="desc", per_page=30)` - Search repositories

## Configuration for PromptToIssue App

Add this to your MCP settings:

```json
{
  "github-mcp": {
    "command": "uv",
    "args": ["run", "python", "github_mcp_server.py"],
    "cwd": "/Users/abit/Desktop/cursor/PromptToIssueV2/prompt-to-issue/mcp/github-mcp",
    "env": {
      "GITHUB_TOKEN": "your_github_token_here"
    }
  }
}
```
