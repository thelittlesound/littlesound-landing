import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { findAges } from '@/lib/ages-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Ages pass (2026-11-19).
// GET: approved listings with no ages on file (age_min/age_max empty or 0–18).
// POST { id }: run the ages agent on one listing (reads only; saves nothing).
// POST { id, set: { ageMin, ageMax } }: save ages an admin approved.
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, title, contact_name, website, age_min, age_max')
    .eq('status', 'approved');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).filter(
    (s: { age_min: number | null; age_max: number | null }) => s.age_min == null || s.age_max == null || (s.age_min === 0 && s.age_max === 18)
  );
  return NextResponse.json({ listings: rows });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '').replace(/^sub_/, '');
  if (!UUID.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  if (body?.set) {
    const min = Number(body.set.ageMin);
    const max = Number(body.set.ageMax);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 18 || min > max) {
      return NextResponse.json({ error: 'Ages must be whole numbers, 0–18, min ≤ max' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('submissions').update({ age_min: min, age_max: max }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: s, error } = await supabaseAdmin
    .from('submissions')
    .select('id, title, contact_name, website, description')
    .eq('id', id)
    .maybeSingle();
  if (error || !s) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  const result = await findAges({ title: s.title, provider: s.contact_name ?? '', website: s.website ?? '', description: s.description });
  return NextResponse.json({ id: s.id, title: s.title, result });
}
