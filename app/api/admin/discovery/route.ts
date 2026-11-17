import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { seattleToday } from '@/lib/activity-dates';
import { allQueries, dueQueries, DISCOVERY_REFRESH_DAYS } from '@/lib/discovery-logic';
import { loadKnown, runDiscoveryQuery } from '@/lib/discovery';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type Row = { key: string; last_run_at: string | null; last_status: string | null; found: number; added: number; message: string | null };

async function readRuns() {
  const { data, error } = await supabaseAdmin.from('discovery_queries').select('*');
  return { rows: (data ?? []) as Row[], missing: !!error };
}

// Agent tab → "Find new providers": every search with its last run (GET),
// and run one search now (POST, optional { key }; otherwise the most overdue).
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows, missing } = await readRuns();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const due = new Set(
    dueQueries(new Map(rows.map((r) => [r.key, { at: r.last_run_at, failed: r.last_status === 'error' }])), new Date()).map((q) => q.key)
  );
  return NextResponse.json({
    tableMissing: missing,
    refreshDays: DISCOVERY_REFRESH_DAYS,
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    queries: allQueries().map((q) => {
      const r = byKey.get(q.key);
      return {
        key: q.key,
        sport: q.sport.subcategory,
        area: q.area.neighborhood === 'White Center' ? 'White Center' : q.area.key === 'delridge' ? 'Delridge' : 'West Seattle',
        lastRunAt: r?.last_run_at ?? null,
        lastStatus: r?.last_status ?? null,
        found: r?.found ?? 0,
        added: r?.added ?? 0,
        message: r?.message ?? null,
        due: due.has(q.key),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { key } = await request.json().catch(() => ({}));
  const { rows, missing } = await readRuns();
  if (missing) return NextResponse.json({ error: 'Run supabase/discovery.sql in Supabase first.' }, { status: 503 });
  const q =
    typeof key === 'string'
      ? allQueries().find((x) => x.key === key)
      : dueQueries(new Map(rows.map((r) => [r.key, { at: r.last_run_at, failed: r.last_status === 'error' }])), new Date())[0];
  if (!q) return NextResponse.json({ error: typeof key === 'string' ? 'Unknown search.' : 'Nothing due.' }, { status: 404 });
  const result = await runDiscoveryQuery(q, { ...(await loadKnown()), today: seattleToday() });
  return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 502 });
}
