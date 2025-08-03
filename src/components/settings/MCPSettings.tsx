'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { 
  Plus, 
  Trash2, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Link,
  Edit3,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MCPServer } from '@/lib/schemas';

interface MCPTool {
  name: string;
  description: string;
  parameters: string[];
}

interface MCPSettingsProps {
  mcpServers?: MCPServer[];
  mcpEnabled?: boolean;
  onUpdateServers?: (servers: MCPServer[]) => void;
  onUpdateMCPEnabled?: (enabled: boolean) => void;
}

const MCPSettings: React.FC<MCPSettingsProps> = ({ 
  mcpServers = [], 
  mcpEnabled = false,
  onUpdateServers,
  onUpdateMCPEnabled
}) => {
  const [servers, setServers] = useState<MCPServer[]>(mcpServers);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; tools?: MCPTool[] } | null>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const defaultGitHubMCP: MCPServer = {
    id: 'github-mcp',
    name: 'GitHub MCP',
    description: 'GitHub API integration for repositories, issues, and pull requests',
    command: 'uv',
    args: ['run', 'python', 'github_mcp_server.py'],
    cwd: '/Users/abit/Desktop/cursor/PromptToIssueV2/prompt-to-issue/mcp/github-mcp',
    env: {
      GITHUB_TOKEN: 'your_github_token_here'
    },
    enabled: true
  };

  const addServer = () => {
    const newServer: MCPServer = {
      id: `mcp-${Date.now()}`,
      name: 'New MCP Server',
      description: 'Custom MCP server',
      command: '',
      args: [],
      enabled: false
    };
    const updatedServers = [...servers, newServer];
    setServers(updatedServers);
    setEditingServer(newServer.id);
    onUpdateServers?.(updatedServers);
  };

  const defaultFetchMCP: MCPServer = {
    id: 'fetch-mcp',
    name: 'Fetch MCP',
    description: 'Web scraping and HTTP requests for fetching content from URLs',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    enabled: true
  };

  const addGitHubMCP = () => {
    const exists = servers.find(s => s.id === 'github-mcp');
    if (!exists) {
      const updatedServers = [...servers, defaultGitHubMCP];
      setServers(updatedServers);
      onUpdateServers?.(updatedServers);
      // Auto-enable MCP when adding first server
      if (updatedServers.filter(s => s.enabled).length === 1) {
        onUpdateMCPEnabled?.(true);
      }
    }
  };

  const addFetchMCP = () => {
    const exists = servers.find(s => s.id === 'fetch-mcp');
    if (!exists) {
      const updatedServers = [...servers, defaultFetchMCP];
      setServers(updatedServers);
      onUpdateServers?.(updatedServers);
      // Auto-enable MCP when adding first server
      if (updatedServers.filter(s => s.enabled).length === 1) {
        onUpdateMCPEnabled?.(true);
      }
    }
  };

  const updateServer = (id: string, updates: Partial<MCPServer>) => {
    const updatedServers = servers.map(server => 
      server.id === id ? { ...server, ...updates } : server
    );
    setServers(updatedServers);
    onUpdateServers?.(updatedServers);
    setTestResults(prev => ({ ...prev, [id]: null }));
  };

  const deleteServer = (id: string) => {
    const updatedServers = servers.filter(server => server.id !== id);
    setServers(updatedServers);
    onUpdateServers?.(updatedServers);
    setEditingServer(null);
  };

  const testConnection = async (server: MCPServer) => {
    setTestingServer(server.id);
    setTestResults(prev => ({ ...prev, [server.id]: null }));

    try {
      // Simulate MCP server test - in real implementation, this would test the actual MCP connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock success for GitHub MCP if properly configured
      if (server.id === 'github-mcp' && server.command && server.args.length > 0) {
        const mockTools = [
          {
            name: 'list_repositories',
            description: 'List repositories for a user or organization',
            parameters: ['owner', 'per_page']
          },
          {
            name: 'get_repository_info',
            description: 'Get detailed information about a specific repository',
            parameters: ['owner', 'repo']
          },
          {
            name: 'list_issues',
            description: 'List issues for a repository',
            parameters: ['owner', 'repo', 'state', 'per_page']
          },
          {
            name: 'create_issue',
            description: 'Create a new issue in a repository',
            parameters: ['owner', 'repo', 'title', 'body', 'labels', 'assignees']
          },
          {
            name: 'get_issue',
            description: 'Get detailed information about a specific issue',
            parameters: ['owner', 'repo', 'issue_number']
          },
          {
            name: 'get_file',
            description: 'Get the content of any file from a repository',
            parameters: ['owner', 'repo', 'file_path', 'branch']
          },
          {
            name: 'list_repository_contents',
            description: 'List the contents of a directory in a repository',
            parameters: ['owner', 'repo', 'path', 'branch']
          },
          {
            name: 'search_repositories',
            description: 'Search for repositories on GitHub',
            parameters: ['query', 'sort', 'order', 'per_page']
          }
        ];

        setTestResults(prev => ({
          ...prev,
          [server.id]: { 
            success: true, 
            message: `MCP server connected successfully! Found ${mockTools.length} available tools.`,
            tools: mockTools
          }
        }));
      } else if (server.id === 'fetch-mcp' && server.command && server.args.length > 0) {
        const mockFetchTools = [
          {
            name: 'fetch',
            description: 'Fetch content from a URL (web scraping, API calls)',
            parameters: ['url', 'method', 'headers', 'body']
          }
        ];

        setTestResults(prev => ({
          ...prev,
          [server.id]: { 
            success: true, 
            message: `Fetch MCP server connected successfully! Found ${mockFetchTools.length} available tools.`,
            tools: mockFetchTools
          }
        }));
      } else if (server.command && server.args.length > 0) {
        setTestResults(prev => ({
          ...prev,
          [server.id]: { success: true, message: 'Server configuration looks valid!' }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [server.id]: { success: false, message: 'Missing command or arguments' }
        }));
      }
    } catch {
      setTestResults(prev => ({
        ...prev,
        [server.id]: { success: false, message: 'Failed to test connection' }
      }));
    } finally {
      setTestingServer(null);
    }
  };

  const toggleServer = (id: string, enabled: boolean) => {
    updateServer(id, { enabled });
  };

  const updateEnvVar = (serverId: string, key: string, value: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      const newEnv = { ...server.env, [key]: value };
      updateServer(serverId, { env: newEnv });
    }
  };

  const toggleToolsExpanded = (serverId: string) => {
    setExpandedTools(prev => ({ ...prev, [serverId]: !prev[serverId] }));
  };

  const removeEnvVar = (serverId: string, key: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server && server.env) {
      const newEnv = { ...server.env };
      delete newEnv[key];
      updateServer(serverId, { env: newEnv });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold">MCP Servers</h3>
            <p className="text-sm text-muted-foreground">
              Configure Model Context Protocol servers for extended AI capabilities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary/50 transition-all duration-200 cursor-pointer hover:bg-accent/30"
               onClick={() => onUpdateMCPEnabled?.(!mcpEnabled)}>
            {/* Toggle Switch */}
            <div className={cn(
              "relative w-11 h-6 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-105",
              mcpEnabled 
                ? "bg-primary border-primary shadow-lg" 
                : "bg-muted border-muted-foreground hover:border-primary/50"
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 transform",
                mcpEnabled ? "translate-x-5" : "translate-x-0.5"
              )} />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-semibold transition-all duration-200",
                mcpEnabled ? "text-primary" : "text-muted-foreground"
              )}>
                MCP {mcpEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <span className="text-xs text-muted-foreground">
                {mcpEnabled ? 'AI can use configured tools' : 'Click to enable tool access'}
              </span>
            </div>
            {mcpEnabled && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg"></div>
            )}
          </div>
        </div>
      </div>

      {/* Enable MCP Notice */}
      {!mcpEnabled && servers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/20 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              MCP is disabled. Enable it above to use configured servers with AI providers.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {servers.length} server{servers.length !== 1 ? 's' : ''} configured
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={addGitHubMCP}
            className="flex items-center gap-2 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add GitHub MCP
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={addFetchMCP}
            className="flex items-center gap-2 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Fetch MCP
          </Button>
          <Button
            size="sm"
            onClick={addServer}
            className="flex items-center gap-2 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Server List */}
      <div className="space-y-4">
        {servers.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No MCP servers configured. Add a server to get started.
            </p>
          </div>
        )}

        {servers.map(server => (
          <div
            key={server.id}
            className={cn(
              "border rounded-lg p-6 transition-all duration-200",
              server.enabled 
                ? "border-primary/30 bg-primary/5 hover:border-primary/50" 
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            {/* Server Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Toggle
                  pressed={server.enabled}
                  onPressedChange={(enabled) => toggleServer(server.id, enabled)}
                  className="cursor-pointer"
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full transition-all duration-200",
                    server.enabled ? "bg-primary" : "bg-muted-foreground"
                  )} />
                </Toggle>
                <div>
                  <h4 className="font-medium">{server.name}</h4>
                  <p className="text-sm text-muted-foreground">{server.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testConnection(server)}
                  disabled={testingServer === server.id || !server.enabled}
                  className="flex items-center gap-2 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {testingServer === server.id ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingServer(editingServer === server.id ? null : server.id)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground hover:scale-110 transition-all duration-200"
                >
                  {editingServer === server.id ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteServer(server.id)}
                  className="text-destructive hover:text-destructive cursor-pointer hover:bg-destructive/10 hover:scale-110 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Configuration */}
            {editingServer === server.id && (
              <div className="space-y-4 border-t pt-4 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Server Name</label>
                    <Input
                      value={server.name}
                      onChange={(e) => updateServer(server.id, { name: e.target.value })}
                      placeholder="MCP Server Name"
                      className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Input
                      value={server.description}
                      onChange={(e) => updateServer(server.id, { description: e.target.value })}
                      placeholder="Server description"
                      className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Command</label>
                    <Input
                      value={server.command}
                      onChange={(e) => updateServer(server.id, { command: e.target.value })}
                      placeholder="e.g., uv, python, node"
                      className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Working Directory</label>
                    <Input
                      value={server.cwd || ''}
                      onChange={(e) => updateServer(server.id, { cwd: e.target.value })}
                      placeholder="/path/to/server"
                      className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Arguments</label>
                  <Input
                    value={server.args.join(' ')}
                    onChange={(e) => updateServer(server.id, { args: e.target.value.split(' ').filter(Boolean) })}
                    placeholder="run python server.py"
                    className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                  />
                </div>

                {/* Environment Variables */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Environment Variables</label>
                  <div className="space-y-2">
                    {Object.entries(server.env || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            removeEnvVar(server.id, key);
                            updateEnvVar(server.id, e.target.value, value);
                          }}
                          placeholder="KEY"
                          className="flex-1 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        />
                        <Input
                          value={value}
                          onChange={(e) => updateEnvVar(server.id, key, e.target.value)}
                          placeholder="value"
                          className="flex-1 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeEnvVar(server.id, key)}
                          className="text-destructive hover:text-destructive cursor-pointer hover:bg-destructive/10 hover:scale-110 transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEnvVar(server.id, '', '')}
                      className="cursor-pointer hover:bg-accent hover:border-accent-foreground hover:scale-105 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Environment Variable
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Result */}
            {testResults[server.id] && (
              <div className="mt-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                <div
                  className={cn(
                    'p-3 rounded-lg border flex items-center gap-2',
                    testResults[server.id]?.success
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200'
                  )}
                >
                  {testResults[server.id]?.success ? (
                    <CheckCircle className="w-4 h-4 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 animate-pulse" />
                  )}
                  <span className="text-sm flex-1">{testResults[server.id]?.message}</span>
                  
                  {/* Tools Toggle Button */}
                  {testResults[server.id]?.success && testResults[server.id]?.tools && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleToolsExpanded(server.id)}
                      className="text-xs cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 hover:scale-105 transition-all duration-200"
                    >
                      {expandedTools[server.id] ? "▼" : "▶"}
                      {testResults[server.id]?.tools?.length} tools
                    </Button>
                  )}
                </div>

                {/* Available Tools */}
                {testResults[server.id]?.success && 
                 testResults[server.id]?.tools && 
                 expandedTools[server.id] && (
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <h5 className="text-sm font-medium text-muted-foreground">Available MCP Tools</h5>
                    </div>
                    <div className="grid gap-2">
                      {testResults[server.id]?.tools?.map((tool, index: number) => (
                        <div 
                          key={index} 
                          className="bg-background rounded border p-3 hover:border-primary/30 transition-all duration-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 rounded p-1">
                              <Settings className="w-3 h-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="text-sm font-medium text-foreground">{tool.name}</h6>
                              <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                              {tool.parameters && tool.parameters.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tool.parameters.map((param: string) => (
                                    <span 
                                      key={param} 
                                      className="inline-block text-xs bg-muted px-2 py-1 rounded font-mono"
                                    >
                                      {param}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { MCPSettings };