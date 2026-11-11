import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getListingsForDates } from '@/lib/activity-dates-server';

export const dynamic = 'force-dynamic';

// Every listing with how many approved dates it has — the Dates tab's picker
// and its "how much of the catalog has dates" coverage count.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [listings, { data: rows, error }] = await Promise.all([
    getListingsForDates(),
    supabaseAdmin.from('activity_dates').select('activity_id, approved_at'),
  ]);

  const stats = new Map<string, { count: number; last: string }>();
  for (const r of (rows ?? []) as { activity_id: string; approved_at: string }[]) {
    const s = stats.get(r.activity_id) ?? { count: 0, last: '' };
    s.count += 1;
    if (r.approved_at > s.last) s.last = r.approved_at;
    stats.set(r.activity_id, s);
  }

  return NextResponse.json({
    listings: listings.map((l) => ({
      ...l,
      dateCount: stats.get(l.activityId)?.count ?? 0,
      lastApprovedAt: stats.get(l.activityId)?.last || null,
    })),
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    // Surfaced so the tab can say "run the migration" instead of looking empty.
    tableMissing: !!error,
  });
}
