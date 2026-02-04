/**
 * Routes API - Authentification et gestion des chauffeurs
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'veeocore-driver-secret-key';
const JWT_EXPIRES_IN = '30d';

// Schémas de validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * POST /api/v1/auth/driver/login
 * Connexion chauffeur
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Chercher le chauffeur
    const { data: driver, error } = await supabase
      .from('drivers')
      .select(`
        id,
        tenant_id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        vehicle_type,
        vehicle_plate,
        vehicle_brand,
        vehicle_model,
        vehicle_color,
        status,
        is_active,
        rating,
        total_rides,
        earnings_total,
        earnings_month
      `)
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !driver) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    if (!driver.password_hash) {
      return res.status(401).json({
        error: 'NO_PASSWORD',
        message: 'Compte non configuré. Contactez votre administrateur.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, driver.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        driverId: driver.id,
        tenantId: driver.tenant_id,
        type: 'driver'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Mettre à jour la dernière connexion
    await supabase
      .from('drivers')
      .update({ 
        last_seen_at: new Date().toISOString(),
        status: 'available'
      })
      .eq('id', driver.id);

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          tenantId: driver.tenant_id,
          email: driver.email,
          firstName: driver.first_name,
          lastName: driver.last_name,
          phone: driver.phone,
          vehicleType: driver.vehicle_type,
          vehiclePlate: driver.vehicle_plate,
          vehicleBrand: driver.vehicle_brand,
          vehicleModel: driver.vehicle_model,
          vehicleColor: driver.vehicle_color,
          status: driver.status,
          rating: driver.rating || 5.0,
          totalRides: driver.total_rides || 0,
          earningsTotal: driver.earnings_total || 0,
          earningsMonth: driver.earnings_month || 0,
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
 * GET /api/v1/auth/driver/me
 * Récupérer les infos du chauffeur connecté
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
      driverId: string;
      tenantId: string;
      type: string;
    };

    if (decoded.type !== 'driver') {
      return res.status(403).json({
        error: 'INVALID_TOKEN_TYPE',
        message: 'Token invalide pour cette ressource'
      });
    }

    // Récupérer le chauffeur
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', decoded.driverId)
      .eq('is_active', true)
      .single();

    if (error || !driver) {
      return res.status(401).json({
        error: 'DRIVER_NOT_FOUND',
        message: 'Chauffeur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          tenantId: driver.tenant_id,
          email: driver.email,
          firstName: driver.first_name,
          lastName: driver.last_name,
          phone: driver.phone,
          vehicleType: driver.vehicle_type,
          vehiclePlate: driver.vehicle_plate,
          vehicleBrand: driver.vehicle_brand,
          vehicleModel: driver.vehicle_model,
          vehicleColor: driver.vehicle_color,
          status: driver.status,
          rating: driver.rating || 5.0,
          totalRides: driver.total_rides || 0,
          earningsTotal: driver.earnings_total || 0,
          earningsMonth: driver.earnings_month || 0,
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

export default router;
