/**
 * Routes API - Payments (Paiements Stripe)
 * Intégration complète pour le flow de réservation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import Stripe from 'stripe';

const router = Router();

// Configuration Stripe (à configurer par tenant)
const getStripeClient = async (tenantId: string): Promise<Stripe | null> => {
  const { data } = await supabase
    .from('tenants')
    .select('stripe_secret_key')
    .eq('id', tenantId)
    .single();
  
  if (!data?.stripe_secret_key) {
    return null;
  }
  
  return new Stripe(data.stripe_secret_key, {
    apiVersion: '2025-01-27.acacia' as any
  });
};

// Schémas de validation
const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('eur'),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  bookingId: z.string().uuid()
});

/**
 * POST /api/v1/payments/create-intent
 * Crée un PaymentIntent Stripe pour une réservation
 */
router.post('/create-intent', async (req: Request, res: Response) => {
  try {
    const params = createPaymentIntentSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    
    // Récupérer le client Stripe du tenant
    const stripe = await getStripeClient(tenantId);
    if (!stripe) {
      return res.status(400).json({
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured for this tenant'
      });
    }
    
    // Vérifier que la réservation existe et appartient au tenant
    const { data: booking } = await supabase
      .from('tenant_bookings')
      .select('id, total_price, status, payment_status')
      .eq('id', params.bookingId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (!booking) {
      return res.status(404).json({
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found'
      });
    }
    
    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        error: 'ALREADY_PAID',
        message: 'This booking has already been paid'
      });
    }
    
    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Stripe utilise les centimes
      currency: params.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenant_id: tenantId,
        booking_id: params.bookingId,
        ...params.metadata
      },
      receipt_email: params.customerEmail,
      description: `Réservation VTC #${params.bookingId.substring(0, 8)}`
    });
    
    // Mettre à jour la réservation avec l'ID du PaymentIntent
    await supabase
      .from('tenant_bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending'
      })
      .eq('id', params.bookingId);
    
    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: params.amount,
        currency: params.currency
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'STRIPE_ERROR',
        message: error.message
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/payments/confirm
 * Confirme qu'un paiement a été effectué (appelé après succès côté client)
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const params = confirmPaymentSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    
    const stripe = await getStripeClient(tenantId);
    if (!stripe) {
      return res.status(400).json({
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured for this tenant'
      });
    }
    
    // Vérifier le statut du paiement chez Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'PAYMENT_NOT_COMPLETED',
        message: `Payment status is: ${paymentIntent.status}`
      });
    }
    
    // Mettre à jour la réservation
    const { data, error } = await supabase
      .from('tenant_bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        paid_at: new Date().toISOString()
      })
      .eq('id', params.bookingId)
      .eq('tenant_id', tenantId)
      .eq('payment_intent_id', params.paymentIntentId)
      .select()
      .single();
    
    if (error || !data) {
      return res.status(404).json({
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found or payment mismatch'
      });
    }
    
    res.json({
      success: true,
      data: {
        booking: data,
        payment: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * GET /api/v1/payments/:bookingId/status
 * Récupère le statut de paiement d'une réservation
 */
router.get('/:bookingId/status', async (req: Request, res: Response) => {
  const { data: booking } = await supabase
    .from('tenant_bookings')
    .select('id, payment_status, payment_intent_id, total_price, paid_at')
    .eq('id', req.params.bookingId)
    .eq('tenant_id', req.tenant!.id)
    .single();
  
  if (!booking) {
    return res.status(404).json({
      error: 'BOOKING_NOT_FOUND',
      message: 'Booking not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      bookingId: booking.id,
      paymentStatus: booking.payment_status,
      paymentIntentId: booking.payment_intent_id,
      amount: booking.total_price,
      paidAt: booking.paid_at
    }
  });
});

/**
 * POST /api/v1/payments/refund
 * Initie un remboursement
 */
router.post('/refund', async (req: Request, res: Response) => {
  const { bookingId, amount, reason } = req.body;
  
  if (!bookingId) {
    return res.status(400).json({
      error: 'MISSING_BOOKING_ID',
      message: 'bookingId is required'
    });
  }
  
  const tenantId = req.tenant!.id;
  const stripe = await getStripeClient(tenantId);
  
  if (!stripe) {
    return res.status(400).json({
      error: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe is not configured for this tenant'
    });
  }
  
  // Récupérer la réservation
  const { data: booking } = await supabase
    .from('tenant_bookings')
    .select('id, payment_intent_id, payment_status, total_price')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single();
  
  if (!booking || !booking.payment_intent_id) {
    return res.status(404).json({
      error: 'BOOKING_NOT_FOUND',
      message: 'Booking not found or no payment to refund'
    });
  }
  
  if (booking.payment_status !== 'paid') {
    return res.status(400).json({
      error: 'NOT_PAID',
      message: 'Booking has not been paid'
    });
  }
  
  try {
    // Créer le remboursement
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: refundAmount, // undefined = remboursement total
      reason: reason || 'requested_by_customer'
    });
    
    // Mettre à jour la réservation
    const newStatus = refund.amount === booking.total_price * 100 ? 'refunded' : 'partially_refunded';
    
    await supabase
      .from('tenant_bookings')
      .update({
        payment_status: newStatus,
        status: 'cancelled',
        refund_amount: refund.amount / 100,
        refunded_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    res.json({
      success: true,
      data: {
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        },
        bookingStatus: newStatus
      }
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'STRIPE_REFUND_ERROR',
        message: error.message
      });
    }
    throw error;
  }
});

export default router;
