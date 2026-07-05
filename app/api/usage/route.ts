import { NextResponse } from 'next/server';
import { getUserFromRequest, createServiceClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action_type, details } = await req.json();

    if (!action_type) {
      return NextResponse.json({ error: 'Missing action_type' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insert usage log
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type,
      details: details || {},
    });

    // Update profile counters based on action
    if (action_type === 'chat_round') {
      await supabase.rpc('increment_total_rounds', { user_uuid: user.id });
    } else if (action_type === 'download') {
      const { data: current } = await supabase
        .from('profiles')
        .select('remaining_downloads')
        .eq('id', user.id)
        .single();
      // -1 is the "unlimited" sentinel (see lib/stripe.ts UNLIMITED_DOWNLOADS) — never decrement it.
      if (current?.remaining_downloads !== -1) {
        await supabase.rpc('decrement_remaining_downloads', { user_uuid: user.id });
      }
    }

    // Return updated profile counters
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('total_rounds, remaining_downloads, tier, balance_credits')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const supabase = createServiceClient();
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
