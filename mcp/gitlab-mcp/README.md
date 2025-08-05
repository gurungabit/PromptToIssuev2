# GitLab MCP Server

A Model Context Protocol (MCP) server that provides GitLab API integration using FastMCP.

## Features

- List projects for users/groups or all accessible projects
- Get detailed project information
- List, create, and get GitLab issues
- List merge requests
- Get file contents from repositories
- List repository directory contents
- Search projects
- Full authentication with GitLab API
- Support for custom GitLab instances

## Setup

1. Install dependencies:
```bash
uv sync
```

2. Set environment variables:
```bash
export GITLAB_TOKEN="your_gitlab_token"
export GITLAB_API_BASE="https://gitlab.com/api/v4"  # Optional, defaults to gitlab.com
```

3. Run the server:
```bash
uv run python gitlab_mcp_server.py
```

## Available Tools

- `list_projects(owner=None, per_page=30)` - List projects for a user/group or all accessible
- `get_project_info(project_id)` - Get detailed project information  
- `list_issues(project_id, state="opened", per_page=30)` - List project issues
- `create_issue(project_id, title, description="", labels=None, assignee_ids=None)` - Create new issue
- `get_issue(project_id, issue_iid)` - Get specific issue details
- `get_file(project_id, file_path, branch="main")` - Get file contents from repository
- `list_repository_tree(project_id, path="", branch="main")` - List directory contents
- `search_projects(query, order_by="last_activity_at", sort="desc", per_page=30)` - Search projects
- `list_merge_requests(project_id, state="opened", per_page=30)` - List merge requests

## Configuration for PromptToIssue App

Add this to your MCP settings:

```json
{
  "gitlab-mcp": {
    "command": "uv",
    "args": ["run", "python", "gitlab_mcp_server.py"],
    "cwd": "./mcp/gitlab-mcp",
    "env": {
      "GITLAB_TOKEN": "your_gitlab_token_here",
      "GITLAB_API_BASE": "https://gitlab.com/api/v4"
    }
  }
}
```

## Custom GitLab Instance

To use with a custom GitLab instance, set the `GITLAB_API_BASE` environment variable:

```bash
export GITLAB_API_BASE="https://your-gitlab-instance.com/api/v4"
```

## Authentication

Create a GitLab Personal Access Token with the following scopes:
- `api` - Full API access
- `read_repository` - Read repository files and metadata
- `write_repository` - Create issues and merge requests (if needed)

Add the token to your environment or MCP configuration as shown above.