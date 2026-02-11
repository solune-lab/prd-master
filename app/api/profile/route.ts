import { NextResponse } from 'next/server';
import { getUserFromRequest, createServiceClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // Profile doesn't exist — auto-create it (trigger may not have fired)
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      const invitationCode = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
          invitation_code: invitationCode,
          tier: 'FREE',
          total_rounds: 0,
          remaining_downloads: 0,
          balance_credits: 0,
        }, { onConflict: 'id' })
        .select('*')
        .single();

      if (insertError || !newProfile) {
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({ profile: newProfile });
    }

    // If profile exists but invitation_code is missing, generate one
    if (!profile.invitation_code) {
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      const invitationCode = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      await supabase
        .from('profiles')
        .update({ invitation_code: invitationCode })
        .eq('id', user.id);

      profile.invitation_code = invitationCode;
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = ['full_name', 'avatar_url', 'fingerprint', 'invitation_code'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
