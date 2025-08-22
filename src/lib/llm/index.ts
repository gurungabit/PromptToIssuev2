import { llmRegistry } from './base';
import { createOpenAIProvider } from './providers/openai';
import { createAnthropicProvider } from './providers/anthropic';
import { createGoogleProvider } from './providers/google';
import { createOllamaProvider } from './providers/ollama';
import { createAideProvider } from './providers/aide';
import type { LLMConfig, LLMProvider } from '../schemas';

// Register all providers
llmRegistry.registerProvider('openai', async () => {
  const config: LLMConfig = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
  };
  return createOpenAIProvider(config);
});

llmRegistry.registerProvider('anthropic', async () => {
  const config: LLMConfig = {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    apiKey: process.env.ANTHROPIC_API_KEY,
  };
  return createAnthropicProvider(config);
});

llmRegistry.registerProvider('google', async () => {
  const config: LLMConfig = {
    provider: 'google',
    model: 'gemini-pro',
    apiKey: process.env.GOOGLE_API_KEY,
  };
  return createGoogleProvider(config);
});

llmRegistry.registerProvider('ollama', async () => {
  const config: LLMConfig = {
    provider: 'ollama',
    model: 'mistral:latest',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };
  return createOllamaProvider(config);
});

llmRegistry.registerProvider('aide', async () => {
  const config: LLMConfig = {
    provider: 'aide',
    model: 'claude-4-sonnet',
    apiKey: process.env.AIDE_API_TOKEN,
    baseUrl: process.env.AIDE_BASE_URL || 'https://aide-llm-api-qa-aide-llm-api-qa.apps.pcrosa01.redk8s.test.ic1.statefarm',
  };
  return createAideProvider(config);
});

// Factory function to create providers with custom config
export const createProviderWithConfig = async (config: LLMConfig) => {
  switch (config.provider) {
    case 'openai':
      return createOpenAIProvider(config);
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'google':
      return createGoogleProvider(config);
    case 'ollama':
      return createOllamaProvider(config);
    case 'aide':
      return createAideProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
};

// Get provider instance from registry
export const getProvider = async (providerId: LLMProvider) => {
  return llmRegistry.getProvider(providerId);
};

// Get all available providers
export const getAvailableProviders = () => {
  return llmRegistry.getAvailableProviders();
};

// Check if provider is available
export const hasProvider = (providerId: string) => {
  return llmRegistry.hasProvider(providerId);
};

// Default provider configurations
export const getDefaultConfigs = (): Record<LLMProvider, LLMConfig> => {
  return {
    openai: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 4000,
      temperature: 0.7,
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      maxTokens: 4000,
      temperature: 0.7,
    },
    google: {
      provider: 'google',
      model: 'gemini-pro',
      maxTokens: 4000,
      temperature: 0.7,
    },
    ollama: {
      provider: 'ollama',
      model: 'mistral:latest',
      baseUrl: 'http://localhost:11434',
      maxTokens: 4000,
      temperature: 0.7,
    },
    aide: {
      provider: 'aide',
      model: 'claude-4-sonnet',
      maxTokens: 4000,
      temperature: 0.7,
    },
  };
};

// Export the registry and all types
export { llmRegistry } from './base';
export type { BaseLLMProvider, LLMMessage, LLMRequestConfig } from './base';
