import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Returns a singleton Stripe client configured for Edge Runtime.
 * Uses createFetchHttpClient() to avoid Node.js http module.
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  stripeInstance = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return stripeInstance;
}

/**
 * Maps tier name to Stripe Price ID from env vars.
 */
export function getPriceId(tier: 'STARTER' | 'PRO' | 'ELITE'): string {
  const prices: Record<string, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    ELITE: process.env.STRIPE_PRICE_ELITE,
  };
  const priceId = prices[tier];
  if (!priceId) throw new Error(`Missing STRIPE_PRICE_${tier} env var`);
  return priceId;
}

/**
 * Tier configuration: downloads granted, checkout mode, trial days.
 */
export const TIER_CONFIG = {
  STARTER: { downloads: 1, mode: 'payment' as const, trialDays: 0 },
  PRO: { downloads: 12, mode: 'subscription' as const, trialDays: 0 },
  ELITE: { downloads: 144, mode: 'subscription' as const, trialDays: 14 },
} as const;

/**
 * Verifies a Stripe webhook signature using Web Crypto API (Edge-compatible).
 * Uses constructEventAsync + SubtleCryptoProvider instead of Node.js crypto.
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  return await stripe.webhooks.constructEventAsync(
    body,
    signature,
    secret,
    undefined,
    Stripe.createSubtleCryptoProvider()
  );
}
