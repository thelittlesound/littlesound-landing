import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { validateItems, type DateItem } from '@/lib/activity-dates';
import { AGENT, isPast } from '@/lib/date-agent-logic';
import { seattleToday } from '@/lib/activity-dates';
import { TEAM_EMAIL } from '@/lib/notify';
import { cleanNeighborhood } from '@/lib/discovery-logic';
import { placeListing } from '@/lib/camps';

// Add a suggested program as a real listing, dismiss it (never suggested
// again), or clear it (removed from the list, but the agent may suggest it
// again — used by "Clear all" to start the suggestions over).
//
// "Add" creates an approved, unowned `submissions` row — live on Discover
// right away, and claimable by the provider later through the normal claim
// flow (it's a pre-account listing). Its dates, if any, are published too.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { action, edits } = await request.json().catch(() => ({}));
  if (action !== 'add' && action !== 'dismiss' && action !== 'clear') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: s } = await supabaseAdmin.from('suggested_listings').select('*').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (s.status !== 'pending') return NextResponse.json({ error: `Already ${s.status}.` }, { status: 409 });

  const reviewed = { reviewed_by: admin.email || 'admin', reviewed_at: new Date().toISOString() };

  if (action === 'clear') {
    await supabaseAdmin.from('suggested_listings').delete().eq('id', s.id).eq('status', 'pending');
    return NextResponse.json({ success: true });
  }

  if (action === 'dismiss') {
    await supabaseAdmin.from('suggested_listings').update({ status: 'dismissed', ...reviewed }).eq('id', s.id);
    return NextResponse.json({ success: true });
  }

  // An admin can correct the neighborhood and ages on the card before adding.
  const e = (edits && typeof edits === 'object' ? edits : {}) as Record<string, unknown>;
  const age = (v: unknown, fallback: number | null) => {
    if (v === undefined) return fallback;
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 18 ? n : fallback;
  };
  const neighborhood = e.neighborhood !== undefined ? cleanNeighborhood(e.neighborhood) : s.neighborhood;
  let ageMin = age(e.age_min, s.age_min);
  let ageMax = age(e.age_max, s.age_max);
  if (ageMin != null && ageMax != null && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
  if (!neighborhood) {
    return NextResponse.json({ error: `Set a neighborhood for "${s.title}" first: the agent couldn't confirm where it runs.` }, { status: 400 });
  }
  if (neighborhood !== s.neighborhood || ageMin !== s.age_min || ageMax !== s.age_max) {
    await supabaseAdmin.from('suggested_listings').update({ neighborhood, age_min: ageMin, age_max: ageMax }).eq('id', s.id);
  }

  // Claim it first (pending → added in one step), so two Adds at once —
  // e.g. "Add all" plus a single click — can't create the listing twice.
  const { data: claimed } = await supabaseAdmin
    .from('suggested_listings')
    .update({ status: 'added', ...reviewed })
    .eq('id', s.id)
    .eq('status', 'pending')
    .select('id');
  if (!claimed?.length) return NextResponse.json({ error: 'Already handled.' }, { status: 409 });

  // Camps are their own category: a sailing camp found by the water search
  // goes to Camps, with "Outdoor" as its theme and when it runs as its subcategory.
  const placed = placeListing({ category: s.category, subcategory: s.subcategory, title: s.title });
  const row: Record<string, unknown> = {
    status: 'approved',
    provider_id: null,
    contact_name: s.business, // pre-account listings use the business as the contact (claim flow groups by it)
    contact_email: TEAM_EMAIL,
    title: s.title,
    category: placed.category,
    subcategory: placed.subcategory,
    description: s.description,
    age_min: ageMin,
    age_max: ageMax,
    price: s.price,
    price_unit: s.price_unit,
    neighborhood,
    website: s.website,
    reviewed_at: reviewed.reviewed_at,
    reviewed_by: reviewed.reviewed_by,
    admin_notes: s.found_on?.startsWith('search:') ? 'Added from a discovery-agent suggestion (web search)' : 'Added from a date-agent suggestion',
    level: s.level ?? null,
    serves: s.serves ?? null,
    ...(placed.theme ? { camp_theme: placed.theme } : {}),
  };
  const insert = (r: Record<string, unknown>) => supabaseAdmin.from('submissions').insert(r).select('id').single();
  let { data: created, error: insertError } = await insert(row);
  if (insertError && /camp_theme/.test(insertError.message ?? '')) {
    // supabase/camps.sql not run yet: add it without the theme (Discover reads it from the title).
    const { camp_theme, ...rest } = row;
    ({ data: created, error: insertError } = await insert(rest));
  }
  if (insertError && /level|serves/.test(insertError.message ?? '')) {
    // supabase/discovery.sql not run yet: add the listing without them.
    const { level, serves, camp_theme, ...rest } = row;
    ({ data: created, error: insertError } = await insert(rest));
  }
  if (insertError || !created) {
    console.error('add suggestion error:', insertError);
    await supabaseAdmin.from('suggested_listings').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', s.id);
    return NextResponse.json({ error: 'Could not create the listing.' }, { status: 500 });
  }
  const activityId = `sub_${created.id}`;

  const upcoming = ((s.items ?? []) as DateItem[]).filter((i) => !isPast(i, seattleToday()));
  const checked = validateItems(upcoming);
  if ('items' in checked && checked.items.length) {
    const { error } = await supabaseAdmin.rpc('replace_activity_dates', {
      p_activity_id: activityId,
      p_items: checked.items,
      p_source_url: s.website ?? '',
      p_approved_by: `${AGENT}·${admin.email || 'admin'}`,
    });
    if (error) console.error('suggestion dates error:', error);
  }

  await supabaseAdmin.from('suggested_listings').update({ added_activity_id: activityId }).eq('id', s.id);
  return NextResponse.json({ success: true, activityId });
}
