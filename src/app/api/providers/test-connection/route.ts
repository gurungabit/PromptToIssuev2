import { NextRequest, NextResponse } from 'next/server';
import { createProviderWithConfig } from '@/lib/llm';
import type { LLMProvider, LLMConfig } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const { provider, config }: { provider: LLMProvider; config: LLMConfig } = await request.json();

    if (!provider || !config) {
      return NextResponse.json(
        { success: false, error: 'Provider and config are required' },
        { status: 400 }
      );
    }

    // Create the provider instance
    const llmProvider = await createProviderWithConfig({
      ...config,
      provider,
    });

    // Test the connection
    const result = await llmProvider.testConnection();

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
