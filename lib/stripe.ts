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
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  };
  const priceId = prices[tier];
  if (!priceId) throw new Error(`Missing Stripe Price for tier=${tier} region=${region}`);
  return priceId;
}

export const REGION_PRICING_DISPLAY: Record<Region, Record<CheckoutTier, { amount: number; currency: string }>> = {
  US: {
    STARTER: { amount: 10, currency: 'USD' },
    PRO_MONTHLY: { amount: 15, currency: 'USD' },
    PRO_YEARLY: { amount: 150, currency: 'USD' },
  },
  TW: {
    STARTER: { amount: 10, currency: 'USD' },
    PRO_MONTHLY: { amount: 15, currency: 'USD' },
    PRO_YEARLY: { amount: 150, currency: 'USD' },
  },
};

// downloads: -1 is a sentinel meaning "unlimited" — do not treat as a literal count.
export const UNLIMITED_DOWNLOADS = -1;

export const TIER_CONFIG = {
  STARTER: { downloads: 1, mode: 'payment' as const, profileTier: 'starter' as const, trialDays: 0 },
  PRO_MONTHLY: { downloads: UNLIMITED_DOWNLOADS, mode: 'subscription' as const, profileTier: 'pro' as const, trialDays: 0 },
  PRO_YEARLY: { downloads: UNLIMITED_DOWNLOADS, mode: 'subscription' as const, profileTier: 'pro' as const, trialDays: 14 },
} as const;

// Billing Portal configuration: allows subscription cancellation (with
// Stripe's native cancellation-reason survey) and plan switching between the
// monthly/yearly Pro prices.
/**
 * Returns the Billing Portal configuration ID, creating the configuration on
 * first use. The ID is cached in-memory for the lifetime of the isolate;
 * Stripe configurations are idempotent to recreate cheaply if the cache misses.
 */
export async function getOrCreatePortalConfiguration(): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ limit: 1, active: true });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Portal subscription_update.products needs Product IDs (not Price IDs),
  // grouped by product — resolve each configured Price to its Product.
  const priceIds = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ].filter(Boolean) as string[];

  const pricesByProduct = new Map<string, string[]>();
  for (const priceId of priceIds) {
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    const existing = pricesByProduct.get(productId) || [];
    existing.push(priceId);
    pricesByProduct.set(productId, existing);
  }

  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Manage your subscription' },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'customer_service',
            'too_complex',
            'low_quality',
            'other',
          ],
        },
      },
      subscription_update: pricesByProduct.size > 0 ? {
        enabled: true,
        default_allowed_updates: ['price'],
        products: Array.from(pricesByProduct.entries()).map(([product, prices]) => ({ product, prices })),
      } : { enabled: false },
    },
  });

  return config.id;
}

// Cancellation retention offer: 15% off, applied once to the subscriber's
// next invoice only (duration: 'once'). Fixed ID so repeated calls reuse the
// same Stripe Coupon instead of creating duplicates.
export const RETENTION_COUPON_ID = 'retention-15-off-once';

/**
 * Returns the retention-offer coupon, creating it on first use.
 */
export async function getOrCreateRetentionCoupon(): Promise<Stripe.Coupon> {
  const stripe = getStripe();
  try {
    return await stripe.coupons.retrieve(RETENTION_COUPON_ID);
  } catch (err: any) {
    if (err?.code !== 'resource_missing') throw err;
    return await stripe.coupons.create({
      id: RETENTION_COUPON_ID,
      percent_off: 15,
      duration: 'once',
      name: 'Retention Offer (15% off next invoice)',
    });
  }
}

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
