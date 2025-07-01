'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useChat } from '@/contexts/ChatContext';
import { GitLabClient } from '@/lib/gitlab/client';
import type { GitLabConfig } from '@/lib/schemas';
import {
  GitlabIcon as GitLab,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GitLabSettings: React.FC = () => {
  const { gitlabConfig, setGitLabConfig } = useChat();

  const [formData, setFormData] = useState<GitLabConfig>({
    baseUrl: gitlabConfig?.baseUrl || 'https://gitlab.com',
    accessToken: gitlabConfig?.accessToken || '',
    defaultProjectId: gitlabConfig?.defaultProjectId,
  });

  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof GitLabConfig, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!formData.baseUrl || !formData.accessToken) {
      setTestResult('error');
      setTestMessage('Please enter both GitLab URL and access token');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = new GitLabClient(formData);
      const isConnected = await client.testConnection();

      if (isConnected) {
        setTestResult('success');
        setTestMessage('Connection successful! GitLab API is accessible.');
      } else {
        setTestResult('error');
        setTestMessage('Connection failed. Please check your credentials.');
      }
    } catch (error) {
      setTestResult('error');
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setTestMessage(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = () => {
    setGitLabConfig(formData);
    setHasChanges(false);
    setTestResult('success');
    setTestMessage('Configuration saved successfully!');
  };

  const resetConfiguration = () => {
    const defaultConfig: GitLabConfig = {
      baseUrl: 'https://gitlab.com',
      accessToken: '',
    };
    setFormData(defaultConfig);
    setGitLabConfig(defaultConfig);
    setHasChanges(false);
    setTestResult(null);
    setTestMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitLab className="w-6 h-6 text-orange-500" />
        <div>
          <h3 className="text-lg font-semibold">GitLab Integration</h3>
          <p className="text-sm text-muted-foreground">
            Configure GitLab connection to create issues automatically
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        {/* GitLab URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">GitLab URL</label>
          <div className="relative">
            <Input
              type="url"
              placeholder="https://gitlab.com"
              value={formData.baseUrl}
              onChange={e => handleInputChange('baseUrl', e.target.value)}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(formData.baseUrl, '_blank')}
              disabled={!formData.baseUrl}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer p-1 h-auto"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your GitLab instance URL (e.g., https://gitlab.com or https://gitlab.company.com)
          </p>
        </div>

        {/* Access Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Personal Access Token</label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={formData.accessToken}
              onChange={e => handleInputChange('accessToken', e.target.value)}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer p-1 h-auto"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Create a personal access token with <strong>&quot;api&quot;</strong> scope
            </p>
            <a
              href={`${formData.baseUrl}/-/user_settings/personal_access_tokens`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Create token <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Default Project ID (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Project ID (Optional)</label>
          <Input
            type="number"
            placeholder="e.g., 12345"
            value={formData.defaultProjectId || ''}
            onChange={e => {
              const value = e.target.value;
              handleInputChange('defaultProjectId', value ? parseInt(value) : undefined);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Pre-select a project when creating issues (you can change this later)
          </p>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={cn(
            'p-4 rounded-lg border flex items-start gap-3',
            testResult === 'success'
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
          )}
        >
          {testResult === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                testResult === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              )}
            >
              {testMessage}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {hasChanges && <span className="text-amber-600">⚠️ You have unsaved changes</span>}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetConfiguration} className="cursor-pointer">
            Reset
          </Button>

          <Button
            variant="outline"
            onClick={testConnection}
            disabled={isTesting || !formData.baseUrl || !formData.accessToken}
            className="cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <GitLab className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>

          <Button onClick={saveConfiguration} disabled={!hasChanges} className="cursor-pointer">
            <Check className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Setup Instructions
        </h4>
        <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
          <li>Go to your GitLab profile settings</li>
          <li>Navigate to &quot;Access Tokens&quot; section</li>
          <li>
            Create a new token with <strong>&quot;api&quot;</strong> scope
          </li>
          <li>Copy the token and paste it above</li>
          <li>Test the connection to verify setup</li>
        </ol>
      </div>
    </div>
  );
};

export { GitLabSettings };
