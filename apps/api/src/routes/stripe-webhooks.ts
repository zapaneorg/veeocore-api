/**
 * Routes API - Webhooks Stripe
 * Gestion des événements Stripe pour les tenants
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/v1/stripe/webhook/:tenantId
 * Webhook Stripe pour un tenant spécifique
 */
router.post('/webhook/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    // Récupérer la config Stripe du tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('stripe_secret_key, stripe_webhook_secret')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant?.stripe_secret_key) {
      return res.status(404).json({ error: 'Tenant Stripe not configured' });
    }

    // Initialiser Stripe avec la clé du tenant
    const stripe = new Stripe(tenant.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        tenant.stripe_webhook_secret || ''
      );
    } catch (err: any) {
      logger.warn('Stripe webhook signature verification failed', { tenantId, error: err.message });
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Traiter l'événement
    await handleStripeEvent(tenantId, event);

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Stripe webhook error', { tenantId, error: error.message });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Traiter les événements Stripe
 */
async function handleStripeEvent(tenantId: string, event: Stripe.Event) {
  logger.info('Processing Stripe event', { tenantId, type: event.type });

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(tenantId, event.data.object as Stripe.PaymentIntent);
      break;
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(tenantId, event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await handleRefund(tenantId, event.data.object as Stripe.Charge);
      break;

    case 'charge.dispute.created':
      await handleDispute(tenantId, event.data.object as Stripe.Dispute);
      break;

    default:
      logger.debug('Unhandled Stripe event', { type: event.type });
  }

  // Enregistrer l'événement dans les logs
  await supabase.from('stripe_webhook_logs').insert({
    tenant_id: tenantId,
    event_id: event.id,
    event_type: event.type,
    payload: event.data.object,
    created_at: new Date().toISOString()
  });
}

/**
 * Gérer un paiement réussi
 */
async function handlePaymentSuccess(tenantId: string, paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (!bookingId) {
    logger.warn('Payment success without booking_id', { tenantId, paymentIntentId: paymentIntent.id });
    return;
  }

  // Mettre à jour le statut du paiement
  await supabase
    .from('tenant_bookings')
    .update({
      payment_status: 'captured',
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId);

  // Enregistrer le paiement
  await supabase.from('tenant_payments').insert({
    tenant_id: tenantId,
    booking_id: bookingId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convertir de centimes
    currency: paymentIntent.currency,
    status: 'succeeded',
    payment_method: paymentIntent.payment_method_types?.[0] || 'card',
    created_at: new Date().toISOString()
  });

  // Envoyer webhook au client si configuré
  await sendTenantWebhook(tenantId, 'payment.succeeded', {
    bookingId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency
  });

  logger.info('Payment captured successfully', { tenantId, bookingId, amount: paymentIntent.amount / 100 });
}

/**
 * Gérer un paiement échoué
 */
async function handlePaymentFailed(tenantId: string, paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (!bookingId) return;

  await supabase
    .from('tenant_bookings')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId);

  await sendTenantWebhook(tenantId, 'payment.failed', {
    bookingId,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message
  });

  logger.warn('Payment failed', { tenantId, bookingId, error: paymentIntent.last_payment_error?.message });
}

/**
 * Gérer un remboursement
 */
async function handleRefund(tenantId: string, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  // Trouver la réservation associée
  const { data: booking } = await supabase
    .from('tenant_bookings')
    .select('id')
    .eq('payment_intent_id', paymentIntentId)
    .eq('tenant_id', tenantId)
    .single();

  if (booking) {
    await supabase
      .from('tenant_bookings')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    await sendTenantWebhook(tenantId, 'payment.refunded', {
      bookingId: booking.id,
      amount: charge.amount_refunded / 100
    });
  }

  logger.info('Refund processed', { tenantId, paymentIntentId, amount: charge.amount_refunded / 100 });
}

/**
 * Gérer un litige
 */
async function handleDispute(tenantId: string, dispute: Stripe.Dispute) {
  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id;

  await sendTenantWebhook(tenantId, 'payment.disputed', {
    disputeId: dispute.id,
    paymentIntentId,
    amount: dispute.amount / 100,
    reason: dispute.reason
  });

  logger.warn('Dispute created', { tenantId, disputeId: dispute.id, reason: dispute.reason });
}

/**
 * Envoyer un webhook au tenant
 */
async function sendTenantWebhook(tenantId: string, event: string, data: any) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('webhook_url, webhook_events, webhook_secret')
    .eq('id', tenantId)
    .single();

  if (!tenant?.webhook_url) return;
  
  // Vérifier si l'événement est dans la liste des événements à envoyer
  if (tenant.webhook_events && !tenant.webhook_events.includes(event)) return;

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Ajouter signature si secret configuré
    if (tenant.webhook_secret) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', tenant.webhook_secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    await fetch(tenant.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    logger.debug('Tenant webhook sent', { tenantId, event });
  } catch (error: any) {
    logger.error('Failed to send tenant webhook', { tenantId, event, error: error.message });
  }
}

/**
 * POST /api/v1/stripe/create-payment-intent
 * Créer un PaymentIntent pour une réservation
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  const { tenantId, bookingId, amount, currency = 'eur' } = req.body;

  if (!tenantId || !bookingId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Récupérer la config Stripe du tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('stripe_secret_key, stripe_publishable_key')
      .eq('id', tenantId)
      .single();

    if (error || !tenant?.stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe not configured for this tenant' });
    }

    const stripe = new Stripe(tenant.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency,
      metadata: {
        tenant_id: tenantId,
        booking_id: bookingId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Mettre à jour la réservation
    await supabase
      .from('tenant_bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending'
      })
      .eq('id', bookingId);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: tenant.stripe_publishable_key
      }
    });
  } catch (error: any) {
    logger.error('Failed to create payment intent', { tenantId, bookingId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/stripe/refund
 * Rembourser un paiement
 */
router.post('/refund', async (req: Request, res: Response) => {
  const { tenantId, paymentIntentId, amount } = req.body;

  if (!tenantId || !paymentIntentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_secret_key')
      .eq('id', tenantId)
      .single();

    if (!tenant?.stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(tenant.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error: any) {
    logger.error('Failed to create refund', { tenantId, paymentIntentId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
