import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDatesByActivity } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';
import { getCatalog } from '@/lib/catalog-server';
import { getKids, getPicks } from '@/lib/family-calendar-server';
import { INTERESTS } from '@/lib/family-profile';
import { kidLabel } from '@/lib/calendar-grid';
import { plusDays } from '@/lib/ics';
import { summerIdeas, summerWeeks, weekCells, type SummerKid, type SummerPlanRow } from '@/lib/summer';

export const dynamic = 'force-dynamic';

// The Summer planner on the family dashboard.
//   GET  – the summer weeks, what fills each child's week, and ideas for open weeks
//   POST – { action: 'pencil', kidId, week, activityId } or { action: 'erase', kidId, week }
// Pencilling in also saves the activity for that child, so the Signup radar,
// "Remind me" and alert emails follow it.

async function signedInUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function summerKids(userId: string): Promise<SummerKid[]> {
  const [kids, { data }] = await Promise.all([
    getKids(userId, true), // ids for every child (saved back if missing)
    supabaseAdmin.from('profiles').select('kids').eq('id', userId).maybeSingle(),
  ]);
  const raw = (Array.isArray(data?.kids) ? data!.kids : []) as { id?: string; interests?: unknown }[];
  return kids.map((k, i) => {
    const r = raw.find((x) => x && x.id === k.id);
    const interests = Array.isArray(r?.interests) ? (r!.interests as unknown[]).filter((x): x is string => typeof x === 'string' && INTERESTS.includes(x)) : [];
    return { id: k.id, name: kidLabel(k, i), age: k.age, interests };
  });
}

async function savedMap(userId: string): Promise<Map<string, string | null>> {
  const first = await supabaseAdmin.from('saved_activities').select('activity_id, kid_id').eq('user_id', userId);
  let rows: { activity_id: string; kid_id?: string | null }[] = (first.data ?? []) as { activity_id: string; kid_id: string | null }[];
  if (first.error) {
    const fallback = await supabaseAdmin.from('saved_activities').select('activity_id').eq('user_id', userId);
    rows = (fallback.data ?? []) as { activity_id: string }[];
  }
  return new Map(rows.map((r) => [r.activity_id, r.kid_id ?? null]));
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const today = seattleToday();
  const { year, weeks } = summerWeeks(today);
  const [kids, catalog, dates, saved, picks, plansRes] = await Promise.all([
    summerKids(user.id),
    getCatalog(),
    getDatesByActivity(),
    savedMap(user.id),
    getPicks(user.id),
    supabaseAdmin.from('summer_plans').select('kid_id, week_start, activity_id, title, provider, website').eq('user_id', user.id),
  ]);
  const needsSetup = !!plansRes.error;
  if (plansRes.error) console.error('summer_plans read error:', plansRes.error);
  const plans = (plansRes.data ?? []) as SummerPlanRow[];

  const listings = new Map(catalog.map((a) => [a.id, { website: a.website, category: a.category }]));
  const cells = weekCells({
    weeks,
    plans,
    picks: picks.map((p) => ({ activityId: p.activity_id, kidId: p.kid_id ?? null, item: p.item, title: p.title, provider: p.provider, status: p.status })),
    dates,
    listings,
    today,
  });

  const window = { from: weeks[0].start, to: plusDays(weeks[weeks.length - 1].start, 6) };
  const ideas: Record<string, ReturnType<typeof summerIdeas>> = {};
  for (const kid of kids) {
    const planned = new Set(Object.entries(cells).filter(([k]) => k.startsWith(kid.id + '|')).map(([, c]) => c.activityId));
    for (const week of weeks) {
      if (cells[`${kid.id}|${week.start}`]) continue;
      ideas[`${kid.id}|${week.start}`] = summerIdeas({ catalog, dates, kid, week, saved, planned, window, today });
    }
  }

  return NextResponse.json({
    year,
    weeks,
    kids: kids.map((k) => ({ id: k.id, name: k.name, age: k.age, hasInterests: k.interests.length > 0 })),
    cells,
    ideas,
    needsSetup,
  });
}

export async function POST(request: NextRequest) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const kidId = typeof body.kidId === 'string' ? body.kidId : '';
  const week = typeof body.week === 'string' ? body.week : '';
  if (!['pencil', 'erase'].includes(action) || !kidId || !week) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const kids = await getKids(user.id);
  if (!kids.some((k) => k.id === kidId)) {
    return NextResponse.json({ error: 'That child isn’t on your profile. Refresh and try again.' }, { status: 400 });
  }
  const { weeks } = summerWeeks(seattleToday());
  if (!weeks.some((w) => w.start === week)) {
    return NextResponse.json({ error: 'That week isn’t part of this summer. Refresh and try again.' }, { status: 400 });
  }

  if (action === 'erase') {
    const { error } = await supabaseAdmin.from('summer_plans').delete().eq('user_id', user.id).eq('kid_id', kidId).eq('week_start', week);
    if (error) {
      console.error('summer_plans delete error:', error);
      return NextResponse.json({ error: 'Could not change that. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const activityId = typeof body.activityId === 'string' ? body.activityId.slice(0, 80) : '';
  const a = (await getCatalog()).find((x) => x.id === activityId);
  if (!a) return NextResponse.json({ error: 'That listing isn’t available anymore.' }, { status: 404 });

  const { error } = await supabaseAdmin.from('summer_plans').upsert(
    { user_id: user.id, kid_id: kidId, week_start: week, activity_id: a.id, title: a.title, provider: a.provider, website: a.website || null },
    { onConflict: 'user_id,kid_id,week_start' }
  );
  if (error) {
    console.error('summer_plans upsert error:', error);
    const setup = /summer_plans/.test(error.message ?? '');
    return NextResponse.json(
      { error: setup ? 'The Summer planner isn’t set up yet (supabase/summer-plans.sql).' : 'Could not pencil that in. Please try again.' },
      { status: 500 }
    );
  }

  // Save it for this child too (kept if already saved), so its signup dates are watched.
  const row: Record<string, unknown> = {
    user_id: user.id,
    activity_id: a.id,
    title: a.title,
    provider: a.provider,
    category: a.category,
    neighborhood: a.neighborhood,
    age_min: a.ageMin,
    age_max: a.ageMax,
    price: a.price,
    price_unit: a.priceUnit,
    website: a.website,
    kid_id: kidId,
  };
  const save = (r: Record<string, unknown>) =>
    supabaseAdmin.from('saved_activities').upsert(r, { onConflict: 'user_id,activity_id', ignoreDuplicates: true });
  let { error: saveErr } = await save(row);
  if (saveErr && /kid_id/.test(saveErr.message ?? '')) {
    delete row.kid_id;
    ({ error: saveErr } = await save(row));
  }
  if (saveErr) console.error('saved_activities (pencil) error:', saveErr);

  return NextResponse.json({ success: true });
}
