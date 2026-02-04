/**
 * Routes API - Authentification Tenant Admin
 * Pour les clients qui utilisent l'API VeeoCore
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'veeocore-tenant-secret-key';
const JWT_EXPIRES_IN = '7d';

// Schémas de validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
});

/**
 * POST /api/v1/auth/tenant/login
 * Connexion admin tenant
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Chercher l'utilisateur
    const { data: user, error } = await supabase
      .from('tenant_users')
      .select(`
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        tenant_id,
        tenant:tenants(id, name, slug, plan, stripe_configured, created_at)
      `)
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier que le tenant est actif
    if (!user.tenant) {
      return res.status(403).json({
        error: 'TENANT_DISABLED',
        message: 'Votre compte est désactivé'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        type: 'tenant_admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Mettre à jour la dernière connexion
    await supabase
      .from('tenant_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          stripeConfigured: user.tenant.stripe_configured,
          createdAt: user.tenant.created_at,
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * GET /api/v1/auth/tenant/me
 * Récupérer les infos de l'utilisateur connecté
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'TOKEN_REQUIRED',
      message: 'Token requis'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      role: string;
      type: string;
    };

    if (decoded.type !== 'tenant_admin') {
      return res.status(403).json({
        error: 'INVALID_TOKEN_TYPE',
        message: 'Token invalide pour cette ressource'
      });
    }

    // Récupérer l'utilisateur et le tenant
    const { data: user, error } = await supabase
      .from('tenant_users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        tenant:tenants(id, name, slug, plan, stripe_configured, created_at)
      `)
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          stripeConfigured: user.tenant.stripe_configured,
          createdAt: user.tenant.created_at,
        }
      }
    });
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token invalide ou expiré'
    });
  }
});

/**
 * POST /api/v1/auth/tenant/register
 * Inscription nouveau tenant (avec création entreprise)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        error: 'EMAIL_EXISTS',
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer le tenant
    const slug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: data.companyName,
        slug: slug,
        plan: 'starter',
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      throw tenantError;
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Créer l'utilisateur admin
    const { data: user, error: userError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'admin',
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: supprimer le tenant créé
      await supabase.from('tenants').delete().eq('id', tenant.id);
      throw userError;
    }

    // Générer le token
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: tenant.id,
        role: 'admin',
        type: 'tenant_admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          stripeConfigured: false,
          createdAt: tenant.created_at,
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/auth/tenant/change-password
 * Changer le mot de passe
 */
router.post('/change-password', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'TOKEN_REQUIRED',
      message: 'Token requis'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Mots de passe requis'
      });
    }

    // Vérifier l'ancien mot de passe
    const { data: user } = await supabase
      .from('tenant_users')
      .select('id, password_hash')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({
        error: 'INVALID_PASSWORD',
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase
      .from('tenant_users')
      .update({ password_hash: newHash })
      .eq('id', decoded.userId);

    res.json({
      success: true,
      message: 'Mot de passe modifié'
    });
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token invalide ou expiré'
    });
  }
});

export default router;
