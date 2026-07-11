import express from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { tenantAccessMiddleware } from '../middleware/tenantAccess';
import { logger } from '../lib/logger';
import { APP_URL, STRIPE_WEBHOOK_SECRET } from '../config';
import { readTenantsStore, writeTenantsStore, resetTenantQuota } from '../services/db';
import { stripeClient, isBillingEnabled, TIER_PRICE_IDS, tierForPriceId } from '../services/stripe';

const router = express.Router();

router.use(authMiddleware);
router.use(['/api/tenant/:id/checkout', '/api/tenant/:id/portal'], tenantAccessMiddleware);

function baseUrl(req: express.Request): string {
  return APP_URL || `${req.protocol}://${req.get('host')}`;
}

router.get(
  '/api/billing/config',
  asyncHandler(async (req, res) => {
    res.json({
      enabled: isBillingEnabled(),
      availableTiers: Object.keys(TIER_PRICE_IDS).filter(t => !!TIER_PRICE_IDS[t]),
    });
  })
);

router.post(
  '/api/tenant/:id/checkout',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;
    const { tier } = req.body;

    if (!stripeClient) {
      return res.status(503).json({ error: 'Billing is not configured on this server.' });
    }

    const priceId = TIER_PRICE_IDS[tier];
    if (!priceId) {
      return res.status(400).json({ error: `Unknown or unconfigured tier: ${tier}` });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      customer: tenant.stripeCustomerId || undefined,
      client_reference_id: tenantId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { tenantId, tier } },
      metadata: { tenantId, tier },
      success_url: `${baseUrl(req)}/admin/${tenantId}/billing?checkout=success`,
      cancel_url: `${baseUrl(req)}/admin/${tenantId}/billing?checkout=cancelled`,
    });

    res.json({ url: session.url });
  })
);

router.post(
  '/api/tenant/:id/portal',
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;

    if (!stripeClient) {
      return res.status(503).json({ error: 'Billing is not configured on this server.' });
    }

    const store = await readTenantsStore();
    const tenant = store[tenantId];
    if (!tenant?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active Stripe customer for this tenant.' });
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${baseUrl(req)}/admin/${tenantId}/billing`,
    });

    res.json({ url: session.url });
  })
);

router.post(
  '/api/webhook/stripe',
  asyncHandler(async (req, res) => {
    if (!stripeClient || !STRIPE_WEBHOOK_SECRET) {
      return res.status(503).send('Billing not configured');
    }

    // The global express.json() verify callback in server.ts stashes the raw
    // request buffer on every request (see rawBody usage in routes/webhooks.ts) —
    // Stripe's signature check needs those exact bytes, not the parsed req.body.
    const rawBody = (req as any).rawBody;
    const signature = req.headers['stripe-signature'] as string;
    if (!rawBody || !signature) {
      return res.status(400).send('Missing signature or raw body');
    }

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, '[STRIPE WEBHOOK] Signature verification failed');
      return res.status(400).send('Webhook signature verification failed');
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId || session.client_reference_id || undefined;
        const tier = session.metadata?.tier;

        if (tenantId && tier) {
          const store = await readTenantsStore();
          const tenant = store[tenantId];
          if (tenant) {
            tenant.subscriptionTier = tier;
            tenant.stripeCustomerId =
              typeof session.customer === 'string' ? session.customer : session.customer?.id;
            tenant.stripeSubscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;
            tenant.messageCount = 0;
            store[tenantId] = tenant;
            await writeTenantsStore(store);
            await resetTenantQuota(tenantId);
            logger.info({ tenantId, tier }, '[STRIPE WEBHOOK] Subscription activated');
          }
        }
      } else if (
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
      ) {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          const store = await readTenantsStore();
          const tenant = store[tenantId];
          if (tenant) {
            if (
              event.type === 'customer.subscription.deleted' ||
              sub.status === 'canceled' ||
              sub.status === 'unpaid'
            ) {
              tenant.subscriptionTier = 'Free';
            } else {
              const priceId = sub.items?.data?.[0]?.price?.id;
              const matchedTier = tierForPriceId(priceId);
              if (matchedTier) tenant.subscriptionTier = matchedTier;
            }
            store[tenantId] = tenant;
            await writeTenantsStore(store);
            logger.info(
              { tenantId, tier: tenant.subscriptionTier, event: event.type },
              '[STRIPE WEBHOOK] Subscription updated'
            );
          }
        }
      }
    } catch (err) {
      logger.error({ err }, '[STRIPE WEBHOOK] Error processing event');
    }

    res.json({ received: true });
  })
);

export default router;
