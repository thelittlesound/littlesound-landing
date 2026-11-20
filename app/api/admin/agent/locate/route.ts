import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { findLocation } from '@/lib/locate-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST { id }: read a pending suggestion's own website for where it meets.
// Saves nothing: the admin sets the neighborhood on the card and adds it.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  const { data: s, error } = await supabaseAdmin.from('suggested_listings').select('id, title, business, website').eq('id', id).maybeSingle();
  if (error || !s) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  const result = await findLocation({ title: s.title, provider: s.business ?? '', website: s.website ?? '' });
  return NextResponse.json({ id: s.id, title: s.title, result });
}
