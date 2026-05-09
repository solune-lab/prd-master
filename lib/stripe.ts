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

export type CheckoutTier = 'STARTER' | 'PRO_MONTHLY' | 'PRO_YEARLY';

/**
 * Maps tier name to Stripe Price ID from env vars.
 */
export function getPriceId(tier: CheckoutTier): string {
  const prices: Record<CheckoutTier, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  };
  const priceId = prices[tier];
  if (!priceId) throw new Error(`Missing STRIPE_PRICE_${tier} env var`);
  return priceId;
}

/**
 * Tier configuration: downloads granted, checkout mode.
 * PRO_MONTHLY: 12 downloads/mo. PRO_YEARLY: 144 downloads/yr (= 12/mo × 12).
 */
export const TIER_CONFIG = {
  STARTER: { downloads: 1, mode: 'payment' as const, profileTier: 'starter' as const },
  PRO_MONTHLY: { downloads: 12, mode: 'subscription' as const, profileTier: 'pro' as const },
  PRO_YEARLY: { downloads: 144, mode: 'subscription' as const, profileTier: 'pro' as const },
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
