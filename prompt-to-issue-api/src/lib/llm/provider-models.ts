import type { LLMProvider } from '../schemas';

// Provider model configuration
export interface ProviderModelConfig {
  models: string[];
  showModelSelector: boolean; // Toggle to enable/disable model selection
  defaultModel: string;
  enabled: boolean; // Toggle to enable/disable entire provider
  displayName: string; // Display name for UI
  description?: string; // Optional description
}

// Simplified provider/model mapping
export const PROVIDER_MODELS: Record<LLMProvider, ProviderModelConfig> = {
  openai: {
    models: [''],
    showModelSelector: false,
    defaultModel: 'gpt-3.5-turbo',
    enabled: false,
    displayName: 'OpenAI',
    description: 'OpenAI GPT models',
  },
  anthropic: {
    models: [''],
    showModelSelector: false,
    defaultModel: 'claude-3-haiku-20240307',
    enabled: false,
    displayName: 'Anthropic (Claude)',
    description: 'Anthropic Claude models',
  },
  google: {
    models: ['gemini-2.0-flash'],
    showModelSelector: true,
    defaultModel: 'gemini-2.0-flash',
    enabled: true,
    displayName: 'Google (Gemini)',
    description: 'Google Gemini models',
  },
  ollama: {
    models: [],
    showModelSelector: false,
    defaultModel: 'mistral:latest',
    enabled: false,
    displayName: 'Ollama (Local)',
    description: 'Local Ollama models',
  },
  aide: {
    // Using the modelIds from AIDE provider file
    models: [
      'us.anthropic.claude-3-haiku-20240307-v1:0',
      'us.anthropic.claude-3-opus-20240229-v1:0',
      'us.anthropic.claude-3-sonnet-20240229-v1:0',
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      'us.anthropic.claude-opus-4-20250514-v1:0',
    ],
    showModelSelector: true,
    defaultModel: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    enabled: true,
    displayName: 'AIDE (Enterprise Claude)',
    description: 'Enterprise Claude models through AIDE',
  },
};

// Model display names and mappings
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // AIDE models - convert full model ID to friendly name
  'us.anthropic.claude-3-haiku-20240307-v1:0': 'Claude 3 Haiku',
  'us.anthropic.claude-3-opus-20240229-v1:0': 'Claude 3 Opus',
  'us.anthropic.claude-3-sonnet-20240229-v1:0': 'Claude 3 Sonnet',
  'us.anthropic.claude-3-5-haiku-20241022-v1:0': 'Claude 3.5 Haiku',
  'us.anthropic.claude-3-5-sonnet-20240620-v1:0': 'Claude 3.5 Sonnet',
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': 'Claude 3.5 Sonnet v2',
  'us.anthropic.claude-3-7-sonnet-20250219-v1:0': 'Claude 3.7 Sonnet',
  'us.anthropic.claude-sonnet-4-20250514-v1:0': 'Claude 4 Sonnet',
  'us.anthropic.claude-opus-4-20250514-v1:0': 'Claude 4 Opus',
};

// AIDE model ID mapping for backwards compatibility with friendly names
export const AIDE_MODEL_MAPPING: Record<string, string> = {
  'claude-3-haiku': 'us.anthropic.claude-3-haiku-20240307-v1:0',
  'claude-3-opus': 'us.anthropic.claude-3-opus-20240229-v1:0', 
  'claude-3-sonnet': 'us.anthropic.claude-3-sonnet-20240229-v1:0',
  'claude-3.5-haiku': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'claude-3.5-sonnet': 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
  'claude-3.5-sonnet-v2': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  'claude-3.7-sonnet': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  'claude-4-sonnet': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-4-opus': 'us.anthropic.claude-opus-4-20250514-v1:0',
};

// Helper function to get display name for models
export const getModelDisplayName = (modelId: string): string => {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
};

// Helper function to map model names to full IDs (for AIDE)
export const mapModelId = (provider: LLMProvider, modelName: string): string => {
  if (provider === 'aide') {
    return AIDE_MODEL_MAPPING[modelName] || modelName;
  }
  return modelName;
};

// Helper functions
export const getAvailableModels = (provider: LLMProvider): string[] => {
  return PROVIDER_MODELS[provider]?.models || [];
};

export const shouldShowModelSelector = (provider: LLMProvider): boolean => {
  return PROVIDER_MODELS[provider]?.showModelSelector || false;
};

export const getDefaultModel = (provider: LLMProvider): string => {
  return PROVIDER_MODELS[provider]?.defaultModel || '';
};

export const isProviderEnabled = (provider: LLMProvider): boolean => {
  return PROVIDER_MODELS[provider]?.enabled || false;
};

export const getEnabledProviders = (): LLMProvider[] => {
  return (Object.keys(PROVIDER_MODELS) as LLMProvider[]).filter(provider => 
    PROVIDER_MODELS[provider].enabled
  );
};

export const getProviderDisplayName = (provider: LLMProvider): string => {
  return PROVIDER_MODELS[provider]?.displayName || provider;
};

export const getProviderDescription = (provider: LLMProvider): string => {
  return PROVIDER_MODELS[provider]?.description || '';
};

export const getProviderConfig = (provider: LLMProvider): ProviderModelConfig | undefined => {
  return PROVIDER_MODELS[provider];
};