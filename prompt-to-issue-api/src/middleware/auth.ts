import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

// Helper function to validate nanoid format (21 characters)
function isValidId(id: string): boolean {
  // nanoid generates 21 character IDs by default
  return id.length === 21 && /^[A-Za-z0-9_-]+$/.test(id);
}

// Helper function to get user ID from request headers
export function getUserIdFromRequest(c: Context): string | null {
  const userId = c.req.header('x-user-id');
  return userId && isValidId(userId) ? userId : null;
}

// Extend the Context type to include userId
declare module 'hono' {
  interface ContextVariableMap {
    userId: string | null;
  }
}

// Middleware to extract and validate user ID from headers
export const authMiddleware = createMiddleware(async (c, next) => {
  const userId = getUserIdFromRequest(c);
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Set userId in context for use in route handlers
  c.set('userId', userId);
  
  await next();
});

// Optional middleware that doesn't fail if no user ID (for endpoints that work with or without auth)
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const userId = getUserIdFromRequest(c);
  
  // Set userId in context (can be null)
  c.set('userId', userId);
  
  await next();
});