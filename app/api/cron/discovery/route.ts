import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { seattleToday } from '@/lib/activity-dates';
import { dueQueries } from '@/lib/discovery-logic';
import { loadKnown, runDiscoveryQuery, type DiscoveryResult } from '@/lib/discovery';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Daily discovery run, triggered by Vercel Cron (vercel.json). Runs the most
// overdue search (a sport in an area), plus another if the first was quick.
// Each search re-runs about monthly, so the full list (16 sports × 3 areas)
// cycles in roughly a month. New programs only become suggestions; nothing
// goes live without an admin. Same CRON_SECRET guard as the date agent.
const START_NEW_WITHIN_MS = 12_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from('discovery_queries').select('key, last_run_at, last_status');
  if (error) return NextResponse.json({ error: 'Run supabase/discovery.sql first.' }, { status: 503 });
  const lastRun = new Map(
    ((data ?? []) as { key: string; last_run_at: string | null; last_status: string | null }[]).map((r) => [
      r.key,
      { at: r.last_run_at, failed: r.last_status === 'error' },
    ])
  );
  const queue = dueQueries(lastRun, new Date());
  if (!queue.length) return NextResponse.json({ ran: 0, message: 'Nothing due.' });

  const ctx = { ...(await loadKnown()), today: seattleToday() };
  const started = Date.now();
  const results: DiscoveryResult[] = [];
  for (const q of queue) {
    if (results.length && Date.now() - started > START_NEW_WITHIN_MS) break;
    results.push(await runDiscoveryQuery(q, ctx));
  }
  return NextResponse.json({ ran: results.length, results: results.map((r) => `${r.key}: ${r.message}`) });
}
