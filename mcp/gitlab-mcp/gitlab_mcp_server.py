#!/usr/bin/env python3
"""
GitLab MCP Server
A Model Context Protocol server for GitLab API operations including issues, repositories, and merge requests.
"""

import os
import json
from typing import Any, Dict, List, Optional
import requests
from fastmcp import FastMCP

mcp = FastMCP("GitLab MCP Server")

GITLAB_TOKEN = os.getenv("GITLAB_TOKEN")
GITLAB_API_BASE = os.getenv("GITLAB_API_BASE", "https://gitlab.com/api/v4")

def get_headers() -> Dict[str, str]:
    """Get GitLab API headers with authentication."""
    return {
        "Authorization": f"Bearer {GITLAB_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "GitLab-MCP-Server"
    }

@mcp.tool()
def list_projects(owner: Optional[str] = None, per_page: int = 30) -> str:
    """
    List projects for a user/group or all accessible projects.
    
    Args:
        owner: GitLab username or group name (optional, lists all accessible if not provided)
        per_page: Number of projects per page (default: 30, max: 100)
    """
    if owner:
        # First try to find the user/group ID
        user_url = f"{GITLAB_API_BASE}/users"
        user_params = {"username": owner}
        
        try:
            user_response = requests.get(user_url, headers=get_headers(), params=user_params)
            user_response.raise_for_status()
            users = user_response.json()
            
            if not users:
                # Try groups
                group_url = f"{GITLAB_API_BASE}/groups"
                group_params = {"search": owner}
                group_response = requests.get(group_url, headers=get_headers(), params=group_params)
                group_response.raise_for_status()
                groups = group_response.json()
                
                if not groups:
                    return f"User or group '{owner}' not found"
                
                # Use the first matching group
                owner_id = groups[0]["id"]
                url = f"{GITLAB_API_BASE}/groups/{owner_id}/projects"
            else:
                # Use the user ID
                owner_id = users[0]["id"]
                url = f"{GITLAB_API_BASE}/users/{owner_id}/projects"
        except requests.RequestException as e:
            return f"Error finding user/group: {str(e)}"
    else:
        url = f"{GITLAB_API_BASE}/projects"
    
    params = {"per_page": min(per_page, 100), "order_by": "last_activity_at", "sort": "desc"}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        projects = response.json()
        result = []
        
        for project in projects:
            result.append({
                "id": project["id"],
                "name": project["name"],
                "path_with_namespace": project["path_with_namespace"],
                "description": project.get("description", ""),
                "visibility": project["visibility"],
                "stars": project["star_count"],
                "forks": project["forks_count"],
                "default_branch": project.get("default_branch", "main"),
                "last_activity_at": project["last_activity_at"],
                "web_url": project["web_url"]
            })
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching projects: {str(e)}"

@mcp.tool()
def get_project_info(project_id: str) -> str:
    """
    Get detailed information about a specific project.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
    """
    # URL encode the project_id to handle paths with slashes
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        
        project = response.json()
        
        result = {
            "id": project["id"],
            "name": project["name"],
            "path_with_namespace": project["path_with_namespace"],
            "description": project.get("description", ""),
            "visibility": project["visibility"],
            "stars": project["star_count"],
            "forks": project["forks_count"],
            "default_branch": project.get("default_branch", "main"),
            "created_at": project["created_at"],
            "last_activity_at": project["last_activity_at"],
            "topics": project.get("topics", []),
            "http_url_to_repo": project["http_url_to_repo"],
            "ssh_url_to_repo": project["ssh_url_to_repo"],
            "web_url": project["web_url"],
            "issues_enabled": project["issues_enabled"],
            "merge_requests_enabled": project["merge_requests_enabled"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching project info: {str(e)}"

@mcp.tool()
def gitlab_list_issues(project_id: str, state: str = "opened", per_page: int = 30) -> str:
    """
    List issues for a project.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        state: Issue state ('opened', 'closed', or 'all')
        per_page: Number of issues per page (default: 30, max: 100)
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/issues"
    
    params = {
        "state": state,
        "per_page": min(per_page, 100),
        "order_by": "updated_at",
        "sort": "desc"
    }
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        issues = response.json()
        result = []
        
        for issue in issues:
            result.append({
                "iid": issue["iid"],  # Internal ID (used in URLs)
                "id": issue["id"],    # Global ID
                "title": issue["title"],
                "state": issue["state"],
                "author": issue["author"]["username"],
                "created_at": issue["created_at"],
                "updated_at": issue["updated_at"],
                "labels": issue.get("labels", []),
                "assignees": [assignee["username"] for assignee in issue.get("assignees", [])],
                "user_notes_count": issue["user_notes_count"],
                "web_url": issue["web_url"],
                "description": issue.get("description", "")[:500] + "..." if issue.get("description", "") and len(issue.get("description", "")) > 500 else issue.get("description", "")
            })
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching issues: {str(e)}"

@mcp.tool()
def gitlab_create_issue(project_id: str, title: str, description: str = "", labels: Optional[List[str]] = None, assignee_ids: Optional[List[int]] = None) -> str:
    """
    Create a new issue in a project.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        title: Issue title
        description: Issue description
        labels: List of label names to apply
        assignee_ids: List of user IDs to assign
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/issues"
    
    data = {
        "title": title,
        "description": description
    }
    
    if labels:
        data["labels"] = ",".join(labels)
    if assignee_ids:
        data["assignee_ids"] = assignee_ids
    
    try:
        response = requests.post(url, headers=get_headers(), json=data)
        response.raise_for_status()
        
        issue = response.json()
        
        result = {
            "iid": issue["iid"],
            "id": issue["id"],
            "title": issue["title"],
            "web_url": issue["web_url"],
            "state": issue["state"],
            "created_at": issue["created_at"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error creating issue: {str(e)}"

@mcp.tool()
def gitlab_get_issue(project_id: str, issue_iid: int) -> str:
    """
    Get detailed information about a specific issue.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        issue_iid: Issue internal ID (the number shown in the UI)
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/issues/{issue_iid}"
    
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        
        issue = response.json()
        
        result = {
            "iid": issue["iid"],
            "id": issue["id"],
            "title": issue["title"],
            "state": issue["state"],
            "author": issue["author"]["username"],
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
            "labels": issue.get("labels", []),
            "assignees": [assignee["username"] for assignee in issue.get("assignees", [])],
            "user_notes_count": issue["user_notes_count"],
            "description": issue.get("description", ""),
            "web_url": issue["web_url"]
        }
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching issue: {str(e)}"

@mcp.tool()
def gitlab_get_file(project_id: str, file_path: str, branch: str = "main") -> str:
    """
    Get the content of any file from a project.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        file_path: Path to the file (e.g., "README.md", "package.json", "src/index.js")
        branch: Branch name (default: main)
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    encoded_file_path = urllib.parse.quote(file_path, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/repository/files/{encoded_file_path}"
    
    params = {"ref": branch}
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        
        if response.status_code == 404:
            # If file not found on specified branch, try default branch
            if branch == "main":
                try:
                    project_url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}"
                    project_response = requests.get(project_url, headers=get_headers())
                    if project_response.status_code == 200:
                        default_branch = project_response.json().get("default_branch", "master")
                        if default_branch != "main":
                            return gitlab_get_file(project_id, file_path, default_branch)
                except requests.RequestException:
                    pass
            
            return json.dumps({
                "project": project_id,
                "file_path": file_path,
                "branch": branch,
                "error": f"File '{file_path}' not found in project {project_id} on branch {branch}",
                "suggestion": "Check the file path and branch name. Use list_repository_tree to see available files."
            }, indent=2)
        
        response.raise_for_status()
        file_data = response.json()
        
        # GitLab returns base64 encoded content
        import base64
        try:
            content = base64.b64decode(file_data["content"]).decode('utf-8')
        except UnicodeDecodeError:
            # Handle binary files
            return json.dumps({
                "project": project_id,
                "file_path": file_path,
                "branch": branch,
                "error": "File appears to be binary and cannot be displayed as text",
                "file_info": {
                    "size": file_data["size"],
                    "encoding": file_data.get("encoding", "base64")
                }
            }, indent=2)
        
        # Limit content size to prevent overwhelming responses
        max_size = 8000
        if len(content) > max_size:
            content = content[:max_size] + f"\n\n... (file truncated, showing first {max_size} characters of {len(content)} total)"
        
        result = {
            "project": project_id,
            "file_path": file_path,
            "branch": branch,
            "size": file_data["size"],
            "encoding": file_data.get("encoding", "base64"),
            "content": content,
            "last_commit_id": file_data.get("last_commit_id")
        }
        
        return json.dumps(result, indent=2)
        
    except requests.RequestException as e:
        return json.dumps({
            "project": project_id,
            "file_path": file_path,
            "branch": branch,
            "error": f"Error fetching file: {str(e)}"
        }, indent=2)

@mcp.tool()
def list_repository_tree(project_id: str, path: str = "", branch: str = "main") -> str:
    """
    List the contents of a directory in a project repository.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        path: Directory path (empty string for root directory)
        branch: Branch name (default: main)
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/repository/tree"
    
    params = {"ref": branch, "per_page": 100}
    if path:
        params["path"] = path
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        
        if response.status_code == 404:
            return json.dumps({
                "project": project_id,
                "path": path or "/",
                "branch": branch,
                "error": f"Path '{path}' not found in project {project_id} on branch {branch}"
            }, indent=2)
        
        response.raise_for_status()
        contents = response.json()
        
        items = []
        for item in contents:
            items.append({
                "name": item["name"],
                "type": item["type"],  # "blob" (file) or "tree" (directory)
                "path": item["path"],
                "mode": item["mode"]
            })
        
        # Sort: directories first, then files, alphabetically
        items.sort(key=lambda x: (x["type"] != "tree", x["name"].lower()))
        
        result = {
            "project": project_id,
            "path": path or "/",
            "branch": branch,
            "total_items": len(items),
            "contents": items
        }
        
        return json.dumps(result, indent=2)
        
    except requests.RequestException as e:
        return json.dumps({
            "project": project_id,
            "path": path or "/",
            "branch": branch,
            "error": f"Error fetching tree: {str(e)}"
        }, indent=2)

@mcp.tool()
def search_projects(query: str, order_by: str = "last_activity_at", sort: str = "desc", per_page: int = 30) -> str:
    """
    Search for projects on GitLab.
    
    Args:
        query: Search query
        order_by: Sort field ('id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at')
        sort: Sort order ('asc' or 'desc')
        per_page: Number of results per page (default: 30, max: 100)
    """
    url = f"{GITLAB_API_BASE}/projects"
    params = {
        "search": query,
        "order_by": order_by,
        "sort": sort,
        "per_page": min(per_page, 100)
    }
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        projects = response.json()
        result = []
        
        for project in projects:
            result.append({
                "id": project["id"],
                "name": project["name"],
                "path_with_namespace": project["path_with_namespace"],
                "description": project.get("description", ""),
                "visibility": project["visibility"],
                "stars": project["star_count"],
                "forks": project["forks_count"],
                "last_activity_at": project["last_activity_at"],
                "web_url": project["web_url"]
            })
        
        return json.dumps({
            "total_results": len(result),
            "projects": result
        }, indent=2)
    
    except requests.RequestException as e:
        return f"Error searching projects: {str(e)}"

@mcp.tool()
def list_merge_requests(project_id: str, state: str = "opened", per_page: int = 30) -> str:
    """
    List merge requests for a project.
    
    Args:
        project_id: Project ID or path (e.g., "123" or "group/project")
        state: Merge request state ('opened', 'closed', 'merged', or 'all')
        per_page: Number of merge requests per page (default: 30, max: 100)
    """
    import urllib.parse
    encoded_project_id = urllib.parse.quote(project_id, safe='')
    url = f"{GITLAB_API_BASE}/projects/{encoded_project_id}/merge_requests"
    
    params = {
        "state": state,
        "per_page": min(per_page, 100),
        "order_by": "updated_at",
        "sort": "desc"
    }
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        
        merge_requests = response.json()
        result = []
        
        for mr in merge_requests:
            result.append({
                "iid": mr["iid"],
                "id": mr["id"],
                "title": mr["title"],
                "state": mr["state"],
                "author": mr["author"]["username"],
                "source_branch": mr["source_branch"],
                "target_branch": mr["target_branch"],
                "created_at": mr["created_at"],
                "updated_at": mr["updated_at"],
                "labels": mr.get("labels", []),
                "assignees": [assignee["username"] for assignee in mr.get("assignees", [])],
                "user_notes_count": mr["user_notes_count"],
                "web_url": mr["web_url"],
                "description": mr.get("description", "")[:500] + "..." if mr.get("description", "") and len(mr.get("description", "")) > 500 else mr.get("description", "")
            })
        
        return json.dumps(result, indent=2)
    
    except requests.RequestException as e:
        return f"Error fetching merge requests: {str(e)}"

# Backward compatibility aliases
@mcp.tool()
def list_issues(project_id: str, state: str = "opened", per_page: int = 30) -> str:
    """Alias for gitlab_list_issues for backward compatibility."""
    return gitlab_list_issues(project_id, state, per_page)

@mcp.tool()
def create_issue(project_id: str, title: str, description: str = "", labels: Optional[List[str]] = None, assignee_ids: Optional[List[int]] = None) -> str:
    """Alias for gitlab_create_issue for backward compatibility."""
    return gitlab_create_issue(project_id, title, description, labels, assignee_ids)

@mcp.tool()
def get_issue(project_id: str, issue_iid: int) -> str:
    """Alias for gitlab_get_issue for backward compatibility."""
    return gitlab_get_issue(project_id, issue_iid)

@mcp.tool()
def get_file(project_id: str, file_path: str, branch: str = "main") -> str:
    """Alias for gitlab_get_file for backward compatibility."""
    return gitlab_get_file(project_id, file_path, branch)

if __name__ == "__main__":
    mcp.run()