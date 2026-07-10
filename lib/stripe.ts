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
export type Region = 'TW' | 'US';

const TW_REGIONS = new Set(['TW']);

export function resolveRegion(country: string | null | undefined): Region {
  if (country && TW_REGIONS.has(country.toUpperCase())) return 'TW';
  return 'US';
}

export function getPriceId(tier: CheckoutTier, region: Region = 'US'): string {
  const prices: Record<CheckoutTier, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO_MONTHLY:
      region === 'TW'
        ? process.env.STRIPE_PRICE_PRO_MONTHLY_TW
        : process.env.STRIPE_PRICE_PRO_MONTHLY_US,
    PRO_YEARLY:
      region === 'TW'
        ? process.env.STRIPE_PRICE_PRO_YEARLY_TW
        : process.env.STRIPE_PRICE_PRO_YEARLY_US,
  };
  const priceId = prices[tier];
  if (!priceId) throw new Error(`Missing Stripe Price for tier=${tier} region=${region}`);
  return priceId;
}

export const REGION_PRICING_DISPLAY: Record<Region, Record<CheckoutTier, { amount: number; currency: string }>> = {
  US: {
    STARTER: { amount: 29, currency: 'USD' },
    PRO_MONTHLY: { amount: 49.9, currency: 'USD' },
    PRO_YEARLY: { amount: 499, currency: 'USD' },
  },
  TW: {
    STARTER: { amount: 29, currency: 'USD' },
    PRO_MONTHLY: { amount: 19.9, currency: 'USD' },
    PRO_YEARLY: { amount: 199, currency: 'USD' },
  },
};

export const TIER_CONFIG = {
  STARTER: { downloads: 1, mode: 'payment' as const, profileTier: 'starter' as const, trialDays: 0 },
  PRO_MONTHLY: { downloads: 12, mode: 'subscription' as const, profileTier: 'pro' as const, trialDays: 0 },
  PRO_YEARLY: { downloads: 144, mode: 'subscription' as const, profileTier: 'pro' as const, trialDays: 14 },
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
