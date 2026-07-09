import { NextResponse } from 'next/server';
import { getUserFromRequest, createServiceClient } from '@/lib/supabase-server';
import { getStripe, getOrCreateRetentionCoupon } from '@/lib/stripe';

export const runtime = 'edge';

async function loadEligibility(userId: string, supabase: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, has_used_retention_offer')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return { eligible: false, profile: null, subscription: null, isYearly: false };
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
    expand: ['items.data.price'],
  });

  // Trial users have never been charged — no retention offer to give.
  if (subscription.status === 'trialing') {
    return { eligible: false, profile, subscription, isYearly: false };
  }

  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  const isYearly = interval === 'year';

  // Monthly plan: lifetime cap of one redemption. Yearly plan: no cap (only
  // ever surfaced when the user is actively trying to cancel).
  const eligible = isYearly || !profile.has_used_retention_offer;

  return { eligible, profile, subscription, isYearly };
}

// Tells the frontend whether to show the retention modal before sending the
// user to the Billing Portal, without trusting client-held tier/trial state.
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { eligible } = await loadEligibility(user.id, supabase);

    return NextResponse.json({ eligible });
  } catch (error: any) {
    console.error('Retention eligibility error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { eligible, profile, isYearly } = await loadEligibility(user.id, supabase);

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    if (!eligible) {
      return NextResponse.json({ error: 'Retention offer is not available' }, { status: 400 });
    }

    const stripe = getStripe();
    const coupon = await getOrCreateRetentionCoupon();
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      discounts: [{ coupon: coupon.id }],
    });

    if (!isYearly) {
      await supabase
        .from('profiles')
        .update({ has_used_retention_offer: true })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Retention offer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
