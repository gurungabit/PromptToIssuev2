# HTTP Proxy Configuration

This application supports HTTP proxy configuration for all outbound requests, including AI provider APIs and GitLab integration.

## Environment Variables

Add these environment variables to your `.env.local` file to configure proxy settings:

```env
# HTTP Proxy Configuration
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080

# Custom CA Certificates (optional)
NODE_EXTRA_CA_CERTS=/path/to/ca-certificates.crt
```

## How It Works

The proxy configuration is handled by the `undici` HTTP agent which is automatically initialized when the server starts:

1. **Automatic Initialization**: The HTTP agent is configured once during server startup via Next.js instrumentation
2. **Global Dispatcher**: Sets a global HTTP dispatcher that affects all `fetch()` requests
3. **Proxy Detection**: Automatically uses `ProxyAgent` if `HTTP_PROXY` is set, otherwise uses standard `Agent`
4. **Certificate Support**: Supports custom CA certificates for corporate environments

## Files Involved

- `src/lib/http-agent.ts`: Main HTTP agent configuration
- `instrumentation.ts`: Next.js instrumentation hook for initialization
- Environment variables in `.env.local`

## Testing Proxy Configuration

To test if the proxy is working:

1. Set the `HTTP_PROXY` environment variable
2. Start the development server: `npm run dev`
3. Check the console for "Global HTTP agent configured successfully" message
4. Make API calls through the application (AI providers, GitLab, etc.)

## Notes

- Only runs on server-side (Node.js runtime)
- Initializes once during server startup
- Affects all HTTP requests made by the backend
- Compatible with corporate proxy environments 