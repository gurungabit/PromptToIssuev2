#!/usr/bin/env python3
"""
GitHub MCP Server
A Model Context Protocol server for GitHub API operations including issues, repositories, and pull requests.
"""

import os
import json
from typing import Any, Dict, List, Optional
import requests
from fastmcp import FastMCP

mcp = FastMCP("GitHub MCP Server")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_BASE = "https://api.github.com"

def get_headers() -> Dict[str, str]:
    """Get GitHub API headers with authentication."""
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-MCP-Server"
    }

@mcp.tool()
def list_repositories(owner: str, per_page: int = 30) -> str:
    """
    List repositories for a user or organization.
    
    Args:
        owner: GitHub username or organization name
        per_page: Number of repositories per page (default: 30, max: 100)
    """
    url = f"{GITHUB_API_BASE}/users/{owner}/repos"
    params = {"per_page": min(per_page, 100), "sort": "updated"}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        repos = response.json()
        result = []
        
        for repo in repos:
            result.append({
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo.get("description", ""),
                "private": repo["private"],
                "stars": repo["stargazers_count"],
                "forks": repo["forks_count"],
                "language": repo.get("language", ""),
                "updated_at": repo["updated_at"]
            })
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching repositories: {str(e)}"

@mcp.tool()
def get_repository_info(owner: str, repo: str) -> str:
    """
    Get detailed information about a specific repository.
    
    Args:
        owner: Repository owner (username or organization)
        repo: Repository name
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        
        repo_data = response.json()
        
        result = {
            "name": repo_data["name"],
            "full_name": repo_data["full_name"],
            "description": repo_data.get("description", ""),
            "private": repo_data["private"],
            "stars": repo_data["stargazers_count"],
            "forks": repo_data["forks_count"],
            "language": repo_data.get("language", ""),
            "created_at": repo_data["created_at"],
            "updated_at": repo_data["updated_at"],
            "default_branch": repo_data["default_branch"],
            "topics": repo_data.get("topics", []),
            "license": repo_data.get("license", {}).get("name", "") if repo_data.get("license") else "",
            "clone_url": repo_data["clone_url"],
            "ssh_url": repo_data["ssh_url"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching repository info: {str(e)}"

@mcp.tool()
def list_issues(owner: str, repo: str, state: str = "open", per_page: int = 30) -> str:
    """
    List issues for a repository.
    
    Args:
        owner: Repository owner
        repo: Repository name
        state: Issue state ('open', 'closed', or 'all')
        per_page: Number of issues per page (default: 30, max: 100)
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"
    params = {
        "state": state,
        "per_page": min(per_page, 100),
        "sort": "updated"
    }
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        issues = response.json()
        result = []
        
        for issue in issues:
            # Skip pull requests (they appear in issues endpoint)
            if "pull_request" in issue:
                continue
                
            result.append({
                "number": issue["number"],
                "title": issue["title"],
                "state": issue["state"],
                "user": issue["user"]["login"],
                "created_at": issue["created_at"],
                "updated_at": issue["updated_at"],
                "labels": [label["name"] for label in issue.get("labels", [])],
                "assignees": [assignee["login"] for assignee in issue.get("assignees", [])],
                "comments": issue["comments"],
                "body": issue.get("body", "")[:500] + "..." if issue.get("body", "") and len(issue.get("body", "")) > 500 else issue.get("body", "")
            })
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching issues: {str(e)}"

@mcp.tool()
def create_issue(owner: str, repo: str, title: str, body: str = "", labels: Optional[List[str]] = None, assignees: Optional[List[str]] = None) -> str:
    """
    Create a new issue in a repository.
    
    Args:
        owner: Repository owner
        repo: Repository name
        title: Issue title
        body: Issue description/body
        labels: List of label names to apply
        assignees: List of usernames to assign
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"
    
    data = {
        "title": title,
        "body": body
    }
    
    if labels:
        data["labels"] = labels
    if assignees:
        data["assignees"] = assignees
    
    try:
        response = requests.post(url, headers=get_headers(), json=data)
        response.raise_for_status()
        
        issue = response.json()
        
        result = {
            "number": issue["number"],
            "title": issue["title"],
            "url": issue["html_url"],
            "state": issue["state"],
            "created_at": issue["created_at"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error creating issue: {str(e)}"

@mcp.tool()
def get_issue(owner: str, repo: str, issue_number: int) -> str:
    """
    Get detailed information about a specific issue.
    
    Args:
        owner: Repository owner
        repo: Repository name
        issue_number: Issue number
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        
        issue = response.json()
        
        result = {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "user": issue["user"]["login"],
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
            "labels": [label["name"] for label in issue.get("labels", [])],
            "assignees": [assignee["login"] for assignee in issue.get("assignees", [])],
            "comments": issue["comments"],
            "body": issue.get("body", ""),
            "url": issue["html_url"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching issue: {str(e)}"

@mcp.tool()
def get_file(owner: str, repo: str, file_path: str, branch: str = "main") -> str:
    """
    Get the content of any file from a repository.
    
    Args:
        owner: Repository owner (username or organization)
        repo: Repository name
        file_path: Path to the file (e.g., "README.md", "package.json", "src/index.js")
        branch: Branch name (default: main)
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}"
    params = {"ref": branch}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        
        if response.status_code == 404:
            # If file not found on main branch, try default branch
            if branch == "main":
                try:
                    repo_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
                    repo_response = requests.get(repo_url, headers=get_headers())
                    if repo_response.status_code == 200:
                        default_branch = repo_response.json().get("default_branch", "master")
                        if default_branch != "main":
                            return get_file(owner, repo, file_path, default_branch)
                except requests.RequestException:
                    pass
            
            return json.dumps({
                "repository": f"{owner}/{repo}",
                "file_path": file_path,
                "branch": branch,
                "error": f"File '{file_path}' not found in repository {owner}/{repo} on branch {branch}",
                "suggestion": "Check the file path and branch name. Use list_repository_contents to see available files."
            }, indent=2)
        
        response.raise_for_status()
        file_data = response.json()
        
        # Check if it's a file (not a directory)
        if file_data.get("type") != "file":
            return json.dumps({
                "repository": f"{owner}/{repo}",
                "file_path": file_path,
                "branch": branch,
                "error": f"'{file_path}' is not a file (it's a {file_data.get('type', 'unknown')})",
                "suggestion": "Use list_repository_contents to see directory contents."
            }, indent=2)
        
        # GitHub returns base64 encoded content for files
        import base64
        try:
            content = base64.b64decode(file_data["content"]).decode('utf-8')
        except UnicodeDecodeError:
            # Handle binary files
            return json.dumps({
                "repository": f"{owner}/{repo}",
                "file_path": file_path,
                "branch": branch,
                "error": "File appears to be binary and cannot be displayed as text",
                "file_info": {
                    "size": file_data["size"],
                    "encoding": file_data.get("encoding", "unknown")
                }
            }, indent=2)
        
        # Limit content size to prevent overwhelming responses
        max_size = 8000
        if len(content) > max_size:
            content = content[:max_size] + f"\n\n... (file truncated, showing first {max_size} characters of {len(content)} total)"
        
        result = {
            "repository": f"{owner}/{repo}",
            "file_path": file_path,
            "branch": branch,
            "size": file_data["size"],
            "encoding": file_data.get("encoding", "base64"),
            "content": content,
            "download_url": file_data.get("download_url"),
            "last_modified": file_data.get("sha")  # Git SHA can indicate last modification
        }
        
        return json.dumps(result, indent=2)
        
    except requests.RequestException as e:
        return json.dumps({
            "repository": f"{owner}/{repo}",
            "file_path": file_path,
            "branch": branch,
            "error": f"Error fetching file: {str(e)}"
        }, indent=2)

@mcp.tool()
def list_repository_contents(owner: str, repo: str, path: str = "", branch: str = "main") -> str:
    """
    List the contents of a directory in a repository.
    
    Args:
        owner: Repository owner (username or organization)
        repo: Repository name
        path: Directory path (empty string for root directory)
        branch: Branch name (default: main)
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    params = {"ref": branch}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        
        if response.status_code == 404:
            return json.dumps({
                "repository": f"{owner}/{repo}",
                "path": path or "/",
                "branch": branch,
                "error": f"Path '{path}' not found in repository {owner}/{repo} on branch {branch}"
            }, indent=2)
        
        response.raise_for_status()
        contents = response.json()
        
        # If it's a single file, return file info
        if isinstance(contents, dict):
            return json.dumps({
                "repository": f"{owner}/{repo}",
                "path": path or "/",
                "branch": branch,
                "type": "file",
                "file_info": {
                    "name": contents["name"],
                    "size": contents["size"],
                    "type": contents["type"]
                }
            }, indent=2)
        
        # It's a directory, list contents
        items = []
        for item in contents:
            items.append({
                "name": item["name"],
                "type": item["type"],  # "file" or "dir"
                "size": item.get("size", 0) if item["type"] == "file" else None,
                "path": item["path"]
            })
        
        # Sort: directories first, then files, alphabetically
        items.sort(key=lambda x: (x["type"] != "dir", x["name"].lower()))
        
        result = {
            "repository": f"{owner}/{repo}",
            "path": path or "/",
            "branch": branch,
            "total_items": len(items),
            "contents": items
        }
        
        return json.dumps(result, indent=2)
        
    except requests.RequestException as e:
        return json.dumps({
            "repository": f"{owner}/{repo}",
            "path": path or "/",
            "branch": branch,
            "error": f"Error fetching contents: {str(e)}"
        }, indent=2)

@mcp.tool()
def search_repositories(query: str, sort: str = "stars", order: str = "desc", per_page: int = 30) -> str:
    """
    Search for repositories on GitHub.
    
    Args:
        query: Search query
        sort: Sort field ('stars', 'forks', 'help-wanted-issues', 'updated')
        order: Sort order ('asc' or 'desc')
        per_page: Number of results per page (default: 30, max: 100)
    """
    url = f"{GITHUB_API_BASE}/search/repositories"
    params = {
        "q": query,
        "sort": sort,
        "order": order,
        "per_page": min(per_page, 100)
    }
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        data = response.json()
        result = []
        
        for repo in data["items"]:
            result.append({
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo.get("description", ""),
                "stars": repo["stargazers_count"],
                "forks": repo["forks_count"],
                "language": repo.get("language", ""),
                "updated_at": repo["updated_at"],
                "url": repo["html_url"]
            })
        
        return json.dumps({
            "total_count": data["total_count"],
            "repositories": result
        }, indent=2)
    
    except requests.RequestException as e:
        return f"Error searching repositories: {str(e)}"

if __name__ == "__main__":
    mcp.run()