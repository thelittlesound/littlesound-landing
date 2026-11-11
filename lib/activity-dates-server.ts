import seedData from '@/app/data/activities.json';
import { supabaseAdmin } from '@/lib/supabase';
import { summarize, seattleToday, type DateItem } from '@/lib/activity-dates';

// Server-only: reads activity_dates with the service-role key.

const DATE_FIELDS =
  'activity_id, kind, label, start_date, end_date, days_of_week, start_time, end_time, location, notes, source_excerpt';

type DateRow = DateItem & { activity_id: string };

/** All stored dates for the given Discover ids (or every listing), grouped by id. */
export async function getDatesByActivity(activityIds?: string[]): Promise<Map<string, DateItem[]>> {
  const out = new Map<string, DateItem[]>();
  if (activityIds && activityIds.length === 0) return out;

  let q = supabaseAdmin.from('activity_dates').select(DATE_FIELDS);
  if (activityIds) q = q.in('activity_id', activityIds);
  const { data, error } = await q;
  if (error) {
    // e.g. the migration hasn't been run yet — show no dates rather than fail the page.
    console.error('activity_dates read error:', error);
    return out;
  }
  for (const row of (data ?? []) as DateRow[]) {
    const { activity_id, ...item } = row;
    const list = out.get(activity_id) ?? [];
    list.push(item);
    out.set(activity_id, list);
  }
  return out;
}

/** { activityId: "Registration opens Mar 3" } for every listing that has an upcoming date. */
export async function getDateLines(activityIds?: string[]): Promise<Record<string, string>> {
  const byActivity = await getDatesByActivity(activityIds);
  const today = seattleToday();
  const lines: Record<string, string> = {};
  byActivity.forEach((items, id) => {
    const line = summarize(items, today);
    if (line) lines[id] = line;
  });
  return lines;
}

export interface DatesListing {
  activityId: string;
  title: string;
  business: string;
  website: string | null;
}

type Seed = (typeof seedData)[number];

/**
 * Every listing that can carry dates, by its Discover id: all seed listings
 * (a claimed seed keeps its id; its title comes from the provider's copy) and
 * every approved provider-submitted listing.
 */
export async function getListingsForDates(): Promise<DatesListing[]> {
  const { data } = await supabaseAdmin
    .from('submissions')
    .select('id, seed_id, title, contact_name, website, provider_id')
    .eq('status', 'approved');
  const rows = (data ?? []) as {
    id: string;
    seed_id: string | null;
    title: string | null;
    contact_name: string | null;
    website: string | null;
    provider_id: string | null;
  }[];

  const providerIds = Array.from(new Set(rows.map((r) => r.provider_id).filter(Boolean))) as string[];
  const { data: profiles } = providerIds.length
    ? await supabaseAdmin.from('provider_profiles').select('id, business_name').in('id', providerIds)
    : { data: [] as { id: string; business_name: string | null }[] };
  const businessById = new Map(
    ((profiles ?? []) as { id: string; business_name: string | null }[]).map((p) => [p.id, p.business_name])
  );
  const claimedTitle = new Map(rows.filter((r) => r.seed_id).map((r) => [r.seed_id as string, r.title]));

  const seeds: DatesListing[] = (seedData as Seed[]).map((s) => ({
    activityId: s.id,
    title: claimedTitle.get(s.id) || s.title,
    business: s.provider,
    website: s.website ?? null,
  }));
  const submitted: DatesListing[] = rows
    .filter((r) => !r.seed_id)
    .map((r) => ({
      activityId: `sub_${r.id}`,
      title: r.title ?? 'Untitled listing',
      business: (r.provider_id && businessById.get(r.provider_id)) || r.contact_name || 'Unknown provider',
      website: r.website,
    }));
  return [...seeds, ...submitted];
}
