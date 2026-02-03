/**
 * Routes API - Webhooks
 */

import { Router, Request, Response } from 'express';
import { createHmac } from 'crypto';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/v1/webhooks/stripe
 * Webhook Stripe pour paiements
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  // TODO: Vérifier la signature Stripe
  // const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  
  const event = req.body;
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Mettre à jour le booking
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;
  }

  res.json({ received: true });
});

/**
 * POST /api/v1/webhooks/dispatch
 * Webhook pour événements de dispatch
 */
router.post('/dispatch', async (req: Request, res: Response) => {
  // Vérifier la signature
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);
  
  // TODO: Vérifier la signature avec le secret du tenant
  
  const event = req.body;
  
  console.log('Dispatch webhook event:', event);

  res.json({ received: true });
});

/**
 * POST /api/v1/webhooks/test
 * Endpoint de test pour webhooks
 */
router.post('/test', async (req: Request, res: Response) => {
  console.log('Test webhook received:', req.body);

  res.json({ 
    received: true,
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

// ========== Helper Functions ==========

async function handlePaymentSuccess(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_id: paymentIntent.id,
        actual_price: paymentIntent.amount / 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
  }
}

async function handlePaymentFailure(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.booking_id;
  
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
  }
}

/**
 * Génère une signature HMAC pour webhook
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Vérifie une signature webhook
 */
export function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return signature === expected;
}

export default router;
