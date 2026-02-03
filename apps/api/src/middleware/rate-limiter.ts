/**
 * Rate Limiter Middleware
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Identifier le client par API key ou IP
  const identifier = (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  const now = Date.now();

  let entry = store.get(identifier);

  // Nettoyer les entrées expirées
  if (entry && now > entry.resetTime) {
    store.delete(identifier);
    entry = undefined;
  }

  if (!entry) {
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    store.set(identifier, entry);
  } else {
    entry.count++;
  }

  // Headers de rate limiting
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    });
  }

  next();
}

// Nettoyer périodiquement le store
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 60000);
