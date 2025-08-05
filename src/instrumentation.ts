export async function register() {
  // This runs once when the server starts up
  // Only run on Node.js runtime (server-side), not on edge or client
  if (process.env.NEXT_RUNTIME === 'nodejs' && typeof window === 'undefined') {
    // Import and initialize the HTTP agent
    const { initializeHttpAgent } = await import('./lib/http-agent');
    await initializeHttpAgent();
  }
}
