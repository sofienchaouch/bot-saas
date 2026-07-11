import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_BUSINESS } from "../config";
import { logger } from "../lib/logger";

export let stripeClient: Stripe | null = null;

if (STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(STRIPE_SECRET_KEY);
} else {
  logger.warn("STRIPE_SECRET_KEY is not defined in the environment. Billing checkout is disabled; tiers are informational only.");
}

// Maps a self-serve subscription tier to its Stripe Price ID. Configured via
// env vars so pricing lives in the Stripe Dashboard, not in code.
export const TIER_PRICE_IDS: Partial<Record<string, string>> = {
  Starter: STRIPE_PRICE_STARTER,
  Business: STRIPE_PRICE_BUSINESS,
};

export function isBillingEnabled(): boolean {
  return !!stripeClient;
}

export function tierForPriceId(priceId: string | undefined | null): string | undefined {
  if (!priceId) return undefined;
  return Object.entries(TIER_PRICE_IDS).find(([, id]) => id === priceId)?.[0];
}
