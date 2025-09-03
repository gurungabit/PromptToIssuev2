import { createProviderWithConfig } from '../lib/llm';
import type { LLMProvider, LLMConfig } from '../lib/schemas';
import type { Context } from 'hono';

// POST /providers/test-connection - Test provider connection
export const providersTestConnection = async (c: Context) => {
  try {
    const { provider, config }: { provider: LLMProvider; config: LLMConfig } = await c.req.json();

    if (!provider || !config) {
      return c.json(
        { success: false, error: 'Provider and config are required' },
        400
      );
    }

    // Create the provider instance
    const llmProvider = await createProviderWithConfig({
      ...config,
      provider,
    });

    // Test the connection
    const result = await llmProvider.testConnection();

    return c.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return c.json({ success: false, error: errorMessage }, 500);
  }
};