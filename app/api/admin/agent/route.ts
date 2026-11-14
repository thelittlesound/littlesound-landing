import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { getListingsForDates, getDatesByActivity } from '@/lib/activity-dates-server';
import { isAgentApproval } from '@/lib/date-agent-logic';

export const dynamic = 'force-dynamic';

// Everything the Agent tab shows: per-listing status, the review inbox, and
// suggested new listings.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [catalog, sourcesRes, draftsRes, suggestionsRes, datesRes] = await Promise.all([
    getListingsForDates(),
    supabaseAdmin.from('listing_sources').select('activity_id, last_checked_at, last_status, last_message, checked_urls'),
    supabaseAdmin.from('date_drafts').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    supabaseAdmin.from('suggested_listings').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    supabaseAdmin.from('activity_dates').select('activity_id, approved_by'),
  ]);

  const sources = new Map(
    ((sourcesRes.data ?? []) as {
      activity_id: string;
      last_checked_at: string | null;
      last_status: string | null;
      last_message: string | null;
      checked_urls: string[] | null;
    }[]).map((s) => [s.activity_id, s])
  );
  const dateStats = new Map<string, { count: number; byAgent: number }>();
  for (const r of (datesRes.data ?? []) as { activity_id: string; approved_by: string | null }[]) {
    const s = dateStats.get(r.activity_id) ?? { count: 0, byAgent: 0 };
    s.count += 1;
    if (isAgentApproval(r.approved_by)) s.byAgent += 1;
    dateStats.set(r.activity_id, s);
  }

  const drafts = (draftsRes.data ?? []) as {
    id: string;
    activity_id: string;
    created_at: string;
    items: unknown[];
    warnings: string[];
    reason: string | null;
    source_urls: string[] | null;
  }[];
  const currentByActivity = await getDatesByActivity(drafts.map((d) => d.activity_id));
  const titleOf = new Map(catalog.map((l) => [l.activityId, l]));

  return NextResponse.json({
    listings: catalog.map((l) => {
      const s = sources.get(l.activityId);
      return {
        activityId: l.activityId,
        title: l.title,
        business: l.business,
        website: l.website,
        lastCheckedAt: s?.last_checked_at ?? null,
        lastStatus: s?.last_status ?? null,
        lastMessage: s?.last_message ?? null,
        checkedUrls: s?.checked_urls ?? [],
        dateCount: dateStats.get(l.activityId)?.count ?? 0,
      };
    }),
    drafts: drafts.map((d) => ({
      id: d.id,
      activityId: d.activity_id,
      title: titleOf.get(d.activity_id)?.title ?? d.activity_id,
      business: titleOf.get(d.activity_id)?.business ?? '',
      createdAt: d.created_at,
      items: d.items,
      warnings: d.warnings ?? [],
      reason: d.reason,
      sourceUrls: d.source_urls ?? [],
      current: currentByActivity.get(d.activity_id) ?? [],
    })),
    suggestions: suggestionsRes.data ?? [],
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    scheduleConfigured: !!process.env.CRON_SECRET,
    jsReader: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    tablesMissing: !!(sourcesRes.error || draftsRes.error || suggestionsRes.error),
  });
}
