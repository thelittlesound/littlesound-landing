import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getListingsForDates } from '@/lib/activity-dates-server';
import { checkListing, type AgentResult } from '@/lib/date-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Daily re-check, triggered by Vercel Cron (vercel.json). Works through the
// listings checked longest ago. Unchanged sites take a few seconds each (no
// AI call); a changed site takes up to ~45s — so each run covers as many as
// fit, and the whole catalog cycles over the following days.
//
// Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set
// in the project's environment variables. Without it, this refuses to run.
// (middleware.ts lets /api/cron past the site password for this reason.)
const START_NEW_WITHIN_MS = 15_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const catalog = await getListingsForDates();
  const { data } = await supabaseAdmin.from('listing_sources').select('activity_id, last_checked_at');
  const lastChecked = new Map(
    ((data ?? []) as { activity_id: string; last_checked_at: string | null }[]).map((r) => [r.activity_id, r.last_checked_at ?? ''])
  );
  const queue = [...catalog].sort((a, b) =>
    (lastChecked.get(a.activityId) ?? '').localeCompare(lastChecked.get(b.activityId) ?? '')
  ); // never-checked ('') first, then oldest

  const started = Date.now();
  const results: AgentResult[] = [];
  for (const listing of queue) {
    if (results.length && Date.now() - started > START_NEW_WITHIN_MS) break;
    try {
      results.push(await checkListing(listing, { catalog }));
    } catch (e) {
      console.error('cron agent check crashed:', listing.activityId, e);
    }
  }

  return NextResponse.json({
    checked: results.length,
    results: results.map((r) => `${r.title}: ${r.status}`),
  });
}
