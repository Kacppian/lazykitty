/**
 * Authentication Middleware
 */

import type { Context, Next } from 'hono';
import { getKV } from '../services/kv.js';

/**
 * Middleware to validate API key from Authorization header
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  // Support "Bearer <token>" format
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  const kv = getKV();
  const isValid = await kv.validateApiKey(token);

  if (!isValid) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  await next();
}
