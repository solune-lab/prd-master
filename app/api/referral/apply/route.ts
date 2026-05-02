import { NextResponse } from 'next/server';
import { getUserFromRequest, createServiceClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, fingerprint } = await req.json();

    if (!code || typeof code !== 'string' || code.length < 4) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Hardware Lock: reject if this device fingerprint already claimed a referral reward
    const supabase = createServiceClient();

    if (fingerprint && typeof fingerprint === 'string') {
      const { data: priorClaim } = await supabase
        .from('usage_logs')
        .select('id')
        .eq('action_type', 'referral_applied')
        .contains('details', { fingerprint })
        .limit(1)
        .maybeSingle();

      if (priorClaim) {
        return NextResponse.json(
          { error: 'This device has already claimed a referral reward' },
          { status: 409 }
        );
      }
    }

    // Check if user already used a referral code
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('referred_by, invitation_code, remaining_downloads')
      .eq('id', user.id)
      .single();

    if (currentUser?.referred_by) {
      return NextResponse.json({ error: 'Already used a referral code' }, { status: 409 });
    }

    // Prevent self-referral
    if (currentUser?.invitation_code?.toUpperCase() === code.toUpperCase()) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }

    // Find referrer by invitation_code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, remaining_downloads')
      .eq('invitation_code', code.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Award both users +1 download credit
    await supabase
      .from('profiles')
      .update({ remaining_downloads: (referrer.remaining_downloads || 0) + 1 })
      .eq('id', referrer.id);

    await supabase
      .from('profiles')
      .update({
        remaining_downloads: (currentUser?.remaining_downloads || 0) + 1,
        referred_by: referrer.id,
      })
      .eq('id', user.id);

    // Log referral events for both users (include fingerprint for future hardware-lock checks)
    await supabase.from('usage_logs').insert([
      {
        user_id: user.id,
        action_type: 'referral_applied',
        details: { referrer_id: referrer.id, code, fingerprint: fingerprint || null },
      },
      {
        user_id: referrer.id,
        action_type: 'referral_reward',
        details: { referred_user_id: user.id },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Referral applied! Both users received 1 free download.',
      remainingDownloads: (currentUser?.remaining_downloads || 0) + 1,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
