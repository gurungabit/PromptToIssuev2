// Utility functions for handling JSON data with SQLite

export function parseJsonField<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value || {});
}

// Helper types for parsed data
export interface ProviderConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  apiKey?: string;
}

export interface MessageMetadata {
  tickets?: unknown[];
  [key: string]: unknown;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
}
