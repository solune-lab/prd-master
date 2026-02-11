import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { verifyWebhookSignature, TIER_CONFIG } from '@/lib/stripe';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }

    const event = await verifyWebhookSignature(body, signature, webhookSecret);
    const supabase = createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as any, supabase);
        break;
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object as any, supabase);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as any, supabase);
        break;
      }
      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object as any, supabase);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function handleCheckoutCompleted(session: any, supabase: any) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier as 'STARTER' | 'PRO' | 'ELITE';

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const config = TIER_CONFIG[tier];

  // Get current downloads count
  const { data: profile } = await supabase
    .from('profiles')
    .select('remaining_downloads')
    .eq('id', userId)
    .single();

  const currentDownloads = profile?.remaining_downloads || 0;

  if (session.mode === 'payment') {
    // One-time payment (STARTER)
    await supabase
      .from('profiles')
      .update({
        tier: tier.toLowerCase(),
        remaining_downloads: currentDownloads + config.downloads,
      })
      .eq('id', userId);
  } else if (session.mode === 'subscription') {
    // Subscription (PRO/ELITE)
    const updateData: Record<string, any> = {
      tier: tier.toLowerCase(),
      remaining_downloads: currentDownloads + config.downloads,
      stripe_subscription_id: session.subscription,
      subscription_status: 'active',
    };

    // Handle trial for ELITE
    if (config.trialDays > 0) {
      updateData.is_trial_active = true;
      updateData.trial_end_date = new Date(
        Date.now() + config.trialDays * 24 * 60 * 60 * 1000
      ).toISOString();
      updateData.subscription_status = 'trialing';
    }

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
  }

  // Log the purchase
  await supabase.from('usage_logs').insert({
    user_id: userId,
    action_type: 'purchase',
    details: {
      tier,
      mode: session.mode,
      amount_total: session.amount_total,
      currency: session.currency,
      stripe_session_id: session.id,
    },
  });
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const updateData: Record<string, any> = {
    subscription_status: subscription.status,
  };

  if (subscription.current_period_end) {
    updateData.subscription_end = new Date(
      subscription.current_period_end * 1000
    ).toISOString();
  }

  // When trial ends, update trial status
  if (subscription.status === 'active' && subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    if (trialEndDate <= new Date()) {
      updateData.is_trial_active = false;
    }
  }

  await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  await supabase
    .from('profiles')
    .update({
      tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      is_trial_active: false,
    })
    .eq('id', userId);
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  const customerId = invoice.customer;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ subscription_status: 'past_due' })
      .eq('id', profile.id);

    await supabase.from('usage_logs').insert({
      user_id: profile.id,
      action_type: 'payment_failed',
      details: { invoice_id: invoice.id },
    });
  }
}
