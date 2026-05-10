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
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, content, mode, language, is_unlocked, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      mode: row.mode,
      language: row.language,
      isUnlocked: row.is_unlocked,
      timestamp: new Date(row.created_at).getTime(),
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, content, mode, language, isUnlocked } = body || {};

    if (!id || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('projects')
      .upsert(
        {
          id: String(id),
          user_id: user.id,
          title: String(title).slice(0, 200),
          content: String(content),
          mode: mode || 'Pro',
          language: language || 'zh-TW',
          is_unlocked: !!isUnlocked,
        },
        { onConflict: 'id' }
      )
      .select('id, title, content, mode, language, is_unlocked, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({
      item: {
        id: data.id,
        title: data.title,
        content: data.content,
        mode: data.mode,
        language: data.language,
        isUnlocked: data.is_unlocked,
        timestamp: new Date(data.created_at).getTime(),
      },
    });
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
    const { id, isUnlocked } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('projects')
      .update({ is_unlocked: !!isUnlocked })
      .eq('id', String(id))
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
