// Utility functions for handling JSON fields in DynamoDB

/**
 * Parse a JSON field from DynamoDB, with fallback to default value
 */
export function parseJsonField<T>(jsonString: string | undefined | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON field:', error);
    return defaultValue;
  }
}

/**
 * Stringify a value for storage in DynamoDB JSON field
 */
export function stringifyJsonField(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to stringify JSON field:', error);
    return '{}';
  }
}

/**
 * Helper to safely get a string value from environment variables
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Helper to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Helper to get the current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}