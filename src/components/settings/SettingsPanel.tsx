"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useChat } from '@/contexts/ChatContext';
import { GitLabSettings } from './GitLabSettings';
import type { LLMProvider, LLMConfig } from '@/lib/schemas';
import { 
  X,
  Settings, 
  Eye, 
  EyeOff, 
  Bot, 
  Github,
  CheckCircle, 
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { 
    currentProvider, 
    setProvider, 
    providerConfigs, 
    updateProviderConfig 
  } = useChat();
  
  const [activeTab, setActiveTab] = useState<'providers' | 'platforms'>('providers');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  const providers: { id: LLMProvider; name: string; icon: React.ReactNode }[] = [
    { id: 'openai', name: 'OpenAI', icon: <Bot className="w-5 h-5" /> },
    { id: 'anthropic', name: 'Anthropic (Claude)', icon: <Bot className="w-5 h-5" /> },
    { id: 'google', name: 'Google (Gemini)', icon: <Bot className="w-5 h-5" /> },
    { id: 'ollama', name: 'Ollama (Local)', icon: <Bot className="w-5 h-5" /> },
  ];

  const handleProviderConfigUpdate = (
    provider: LLMProvider, 
    field: keyof LLMConfig, 
    value: string | number
  ) => {
    updateProviderConfig(provider, { [field]: value });
    // Clear test result when config changes
    setTestResults(prev => ({ ...prev, [provider]: null }));
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const testConnection = async (provider: LLMProvider) => {
    setTestingProvider(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));

    try {
      const response = await fetch('/api/providers/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          config: providerConfigs[provider],
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResults(prev => ({ 
          ...prev, 
          [provider]: { success: true, message: 'Connection successful!' }
        }));
      } else {
        setTestResults(prev => ({ 
          ...prev, 
          [provider]: { success: false, message: result.error || 'Connection failed' }
        }));
      }
    } catch {
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: { success: false, message: 'Failed to test connection' }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure AI providers and platform connections
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent hover:scale-110 transition-all duration-200 cursor-pointer">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-background">
          <button
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-all duration-300 cursor-pointer hover:bg-accent/50",
              activeTab === 'providers'
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('providers')}
          >
            AI Providers
          </button>
          <button
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-all duration-300 cursor-pointer hover:bg-accent/50",
              activeTab === 'platforms'
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('platforms')}
          >
            Platform Connections
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-area p-6 bg-background">
          {activeTab === 'providers' && (
            <div className="space-y-6">
              {/* Current Provider */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Current Provider</h3>
                <div className="flex items-center gap-4">
                  {providers.map((provider) => (
                    <Button
                      variant="outline"
                      key={provider.id}
                      onClick={() => setProvider(provider.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                        currentProvider === provider.id
                          ? "bg-primary text-primary-foreground shadow-lg scale-105 hover:shadow-xl hover:scale-110 text-green-500"
                          : "bg-background hover:bg-accent hover:scale-105 hover:shadow-md border border-transparent hover:border-border"
                      )}
                    >
                      {provider.icon}
                      {provider.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Provider Configurations */}
              <div className="space-y-6">
                {providers.map((provider) => (
                  <div key={provider.id} className="border rounded-lg p-6 hover:border-primary/30 transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {provider.icon}
                        <h3 className="font-semibold">{provider.name}</h3>
                        {currentProvider === provider.id && (
                          <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnection(provider.id)}
                        disabled={testingProvider === provider.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                      >
                        {testingProvider === provider.id ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Test Connection
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* API Key */}
                      {provider.id !== 'ollama' && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            API Key
                          </label>
                          <div className="relative">
                            <Input
                              type={showApiKeys[provider.id] ? 'text' : 'password'}
                              value={providerConfigs[provider.id]?.apiKey || ''}
                              onChange={(e) => handleProviderConfigUpdate(
                                provider.id, 
                                'apiKey', 
                                e.target.value
                              )}
                              placeholder="Enter API key"
                              className="pr-10 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer hover:scale-110 transition-all duration-200"
                              onClick={() => toggleApiKeyVisibility(provider.id)}
                            >
                              {showApiKeys[provider.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Base URL (Ollama and OpenAI) */}
                      {(provider.id === 'ollama' || provider.id === 'openai') && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Base URL
                            {provider.id === 'openai' && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Optional - leave empty for default OpenAI API)
                              </span>
                            )}
                          </label>
                          <Input
                            value={providerConfigs[provider.id]?.baseUrl || (provider.id === 'ollama' ? 'http://localhost:11434' : '')}
                            onChange={(e) => handleProviderConfigUpdate(
                              provider.id, 
                              'baseUrl', 
                              e.target.value
                            )}
                            placeholder={
                              provider.id === 'ollama' 
                                ? "http://localhost:11434" 
                                : "https://openrouter.ai/api/v1"
                            }
                            className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                          />
                          {provider.id === 'openai' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              For OpenRouter, use: https://openrouter.ai/api/v1
                            </p>
                          )}
                        </div>
                      )}

                      {/* Model */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Model
                        </label>
                        <Input
                          value={providerConfigs[provider.id]?.model || ''}
                          onChange={(e) => handleProviderConfigUpdate(
                            provider.id, 
                            'model', 
                            e.target.value
                          )}
                          placeholder="e.g., gpt-3.5-turbo"
                          className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        />
                      </div>

                      {/* Temperature */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Temperature
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={providerConfigs[provider.id]?.temperature || 0.7}
                          onChange={(e) => handleProviderConfigUpdate(
                            provider.id, 
                            'temperature', 
                            parseFloat(e.target.value)
                          )}
                          className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        />
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Max Tokens
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="32000"
                          value={providerConfigs[provider.id]?.maxTokens || 4000}
                          onChange={(e) => handleProviderConfigUpdate(
                            provider.id, 
                            'maxTokens', 
                            parseInt(e.target.value)
                          )}
                          className="focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        />
                      </div>
                    </div>
                    
                    {/* Test Result */}
                    {testResults[provider.id] && (
                      <div className={cn(
                        "mt-4 p-3 rounded-lg border flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-300",
                        testResults[provider.id]?.success 
                          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200"
                          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200"
                      )}>
                        {testResults[provider.id]?.success ? (
                          <CheckCircle className="w-4 h-4 animate-pulse" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 animate-pulse" />
                        )}
                        <span className="text-sm">{testResults[provider.id]?.message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div className="space-y-6">
              <GitLabSettings />
              
              {/* GitHub placeholder for future */}
              <div className="border rounded-lg p-6 opacity-60 hover:opacity-80 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <Github className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-semibold">GitHub Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect to GitHub to create issues automatically
                    </p>
                  </div>
                </div>
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    GitHub integration coming soon in a future update.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-background">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="cursor-pointer hover:bg-accent hover:border-accent-foreground hover:scale-105 hover:shadow-md transition-all duration-200"
          >
            Cancel
          </Button>
          <Button 
            variant="outline"
            onClick={onClose}
            className="cursor-pointer bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary hover:scale-105 hover:shadow-lg transition-all duration-200"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export { SettingsPanel }; 