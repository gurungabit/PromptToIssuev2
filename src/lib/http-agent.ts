let initialized = false;

export async function initializeHttpAgent() {
  // Only run on server-side (Node.js environment)
  if (typeof window !== 'undefined') {
    console.warn('HTTP agent initialization skipped: running in browser environment');
    return;
  }

  // Only initialize once
  if (initialized) return;

  try {
    // Dynamically import the modules to avoid webpack issues with node: scheme
    const { setGlobalDispatcher } = await import('undici');
    const { Agent, ProxyAgent } = await import('undici');
    const fs = await import('fs');
    const crypto = await import('crypto');

    // Setup custom agent and CA certs for all fetch requests
    const sf_certs = fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS || '/opt/cacerts.crt', 'utf8');
    const agent = process.env.HTTP_PROXY
      ? new ProxyAgent(process.env.HTTP_PROXY)
      : new Agent({
          connect: {
            ca: sf_certs,
            rejectUnauthorized: true,
            secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
          },
        });

    setGlobalDispatcher(agent);
    initialized = true;
    console.log('Global HTTP agent configured successfully');
  } catch (error) {
    console.error('Failed to configure global HTTP agent:', error);
  }
}

// Reset function for testing purposes
export function resetHttpAgent() {
  initialized = false;
} 