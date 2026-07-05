import { NextResponse } from 'next/server';
import { getUserFromRequest, createServiceClient } from '@/lib/supabase-server';
import { getStripe, getPriceId, resolveRegion, TIER_CONFIG, type CheckoutTier } from '@/lib/stripe';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await req.json() as { tier: CheckoutTier };
    if (!tier || !TIER_CONFIG[tier]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const country =
      req.headers.get('cf-ipcountry') ||
      (req as any).cf?.country ||
      null;
    const region = resolveRegion(country);

    const stripe = getStripe();
    const supabase = createServiceClient();
    const config = TIER_CONFIG[tier];
    const priceId = getPriceId(tier, region);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as any).deleted) {
          customerId = null;
        }
      } catch (err: any) {
        if (err?.code === 'resource_missing' || err?.statusCode === 404) {
          customerId = null;
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';

    // Build checkout session params
    const sessionParams: Record<string, any> = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: config.mode,
      success_url: `${appUrl}/?checkout=success&tier=${tier}`,
      cancel_url: `${appUrl}/?checkout=canceled`,
      metadata: {
        supabase_user_id: user.id,
        tier: tier,
        region,
      },
    };

    // Subscription-specific settings
    if (config.mode === 'subscription') {
      const subscriptionData: Record<string, any> = {
        metadata: {
          supabase_user_id: user.id,
          tier: tier,
          region,
        },
      };
      if (config.trialDays > 0) {
        subscriptionData.trial_period_days = config.trialDays;
      }
      sessionParams.subscription_data = subscriptionData;
    }

    // Yearly plan only: allow promotion code input (e.g. MASTER10)
    if (tier === 'PRO_YEARLY') {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
