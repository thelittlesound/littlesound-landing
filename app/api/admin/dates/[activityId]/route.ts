import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getListingsForDates } from '@/lib/activity-dates-server';
import { validateItems } from '@/lib/activity-dates';

export const dynamic = 'force-dynamic';

const FIELDS =
  'kind, label, start_date, end_date, days_of_week, start_time, end_time, location, notes, source_excerpt, source_url, approved_at, approved_by';

// The approved dates for one listing.
export async function GET(_request: NextRequest, { params }: { params: { activityId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const activityId = decodeURIComponent(params.activityId);

  const { data, error } = await supabaseAdmin
    .from('activity_dates')
    .select(FIELDS)
    .eq('activity_id', activityId)
    .order('kind', { ascending: false }) // registration before session
    .order('start_date', { ascending: true });
  if (error) {
    console.error('activity_dates read error:', error);
    return NextResponse.json({ error: 'Could not load dates. Has supabase/activity-dates.sql been run?' }, { status: 500 });
  }

  const rows = (data ?? []) as { source_url: string | null; approved_at: string; approved_by: string | null }[];
  return NextResponse.json({
    items: rows.map(({ source_url, approved_at, approved_by, ...item }) => item),
    sourceUrl: rows.find((r) => r.source_url)?.source_url ?? null,
    approvedAt: rows[0]?.approved_at ?? null,
    approvedBy: rows[0]?.approved_by ?? null,
  });
}

// Replace a listing's dates with the reviewed set (an empty list clears them).
// Atomic: done inside one Postgres function, replace_activity_dates().
export async function PUT(request: NextRequest, { params }: { params: { activityId: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const activityId = decodeURIComponent(params.activityId);

  const listings = await getListingsForDates();
  if (!listings.some((l) => l.activityId === activityId)) {
    return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const checked = validateItems(body.items);
  if ('error' in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim().slice(0, 500) : '';

  const { data, error } = await supabaseAdmin.rpc('replace_activity_dates', {
    p_activity_id: activityId,
    p_items: checked.items,
    p_source_url: sourceUrl,
    p_approved_by: admin.email || 'admin',
  });
  if (error) {
    console.error('replace_activity_dates error:', error);
    return NextResponse.json({ error: 'Could not save dates.' }, { status: 500 });
  }
  return NextResponse.json({ saved: data ?? checked.items.length });
}
