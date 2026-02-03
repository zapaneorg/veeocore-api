/**
 * Middleware d'authentification
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        plan: string;
      };
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentification par API Key (pour clients)
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;

  // Bypass pour demo (comme VeeoStras)
  if (apiKey === 'demo-key' || tenantId === 'demo' || tenantId?.startsWith('demo')) {
    req.tenant = {
      id: 'demo',
      name: 'Demo Tenant',
      plan: 'enterprise'
    };
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide your API key in the X-API-Key header'
    });
  }

  try {
    // Vérifier l'API key dans la base de données
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, plan, is_active')
      .eq('api_key', apiKey)
      .single();

    if (error || !tenant) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    if (!tenant.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Attacher le tenant à la requête
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan
    };

    next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Authentification JWT (pour admin dashboard)
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token required',
      message: 'Please provide a valid JWT token in the Authorization header'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
}

/**
 * Vérification du rôle admin
 */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access required'
    });
  }
  next();
}

/**
 * Génère un JWT token
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(user, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as jwt.SignOptions);
}
