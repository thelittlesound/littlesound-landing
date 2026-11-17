// Server-only: the Discover catalog (seed listings + approved provider
// listings), shaped like Discover's activity cards. Used by /api/activities
// and the Summer planner.

import seedData from '@/app/data/activities.json';
import { supabaseAdmin } from '@/lib/supabase';

// Map provider form categories → Discover page categories
const CATEGORY_MAP: Record<string, string> = {
  'Camps':               'Camps',
  'Sports & Athletics':  'Sports',
  'Arts & Crafts':       'Arts',
  'Music & Dance':       'Music',
  'Academic & Tutoring': 'Academic',
  'Outdoor Adventure':   'Outdoor',
  'STEM & Tech':         'STEM',
  'Swim & Aquatics':     'Swimming',
  'Dance & Movement':    'Dance',
  'Theater & Performance': 'Theater',
  'Other':               'Arts', // fallback
};

export interface ProviderActivity {
  id: string;
  title: string;
  provider: string;
  category: string;
  subcategory: string | null;
  neighborhood: string;
  ageMin: number;
  ageMax: number;
  /** null when no fee was given (shown as "Fees on their site", not $0). */
  price: number | null;
  priceUnit: string;
  description: string;
  website: string;
  /** Team sports: 'rec' or 'club'. Columns may not exist yet; then null. */
  level: string | null;
  /** Who can join (e.g. a league boundary). */
  serves: string | null;
  source: 'provider';
}

/**
 * Approved provider listings (as Discover cards) and the seed ids that have
 * been claimed. `error` is set when the submissions read failed.
 */
export async function getProviderActivities(): Promise<{ activities: ProviderActivity[]; claimedSeedIds: string[]; error: unknown }> {
  const [{ data, error }, { data: seedRows }] = await Promise.all([
    supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    // Every seed listing that's been claimed (imported into submissions),
    // whatever its current status. Discover hides the static copy of each —
    // including if the imported listing is later rejected, so an old seed
    // card never resurfaces as if it were unclaimed.
    supabaseAdmin.from('submissions').select('seed_id').not('seed_id', 'is', null),
  ]);
  if (error) return { activities: [], claimedSeedIds: [], error };

  const claimedSeedIds = ((seedRows ?? []) as { seed_id: string }[]).map((r) => r.seed_id);

  // Show the provider's business name, not the submitter's personal name.
  const providerIds = Array.from(new Set((data || []).map((s) => s.provider_id).filter(Boolean)));
  const { data: profiles } = providerIds.length
    ? await supabaseAdmin.from('provider_profiles').select('id, business_name').in('id', providerIds)
    : { data: [] as { id: string; business_name: string | null }[] };
  const businessById = new Map(
    ((profiles ?? []) as { id: string; business_name: string | null }[]).map((p) => [p.id, p.business_name])
  );

  // Map Supabase submission shape → activity card shape
  const activities: ProviderActivity[] = (data || []).map((s) => ({
    // A claimed seed listing keeps its original Discover id ("42"), so it
    // replaces the static card in place and families' saved hearts still match.
    id: s.seed_id ?? `sub_${s.id}`,
    title: s.title,
    provider: (s.provider_id && businessById.get(s.provider_id)) || s.contact_name,
    category: CATEGORY_MAP[s.category ?? ''] ?? s.category ?? 'Other',
    subcategory: s.subcategory ?? null,
    neighborhood: s.neighborhood ?? 'Seattle',
    ageMin: s.age_min ?? 0,
    ageMax: s.age_max ?? 18,
    price: s.price ?? null,
    priceUnit: s.price_unit ?? 'session',
    description: s.description ?? '',
    website: s.website ?? '',
    level: s.level ?? null,
    serves: s.serves ?? null,
    source: 'provider', // flag so we can distinguish in UI if needed
  }));
  return { activities, claimedSeedIds, error: null };
}

type Seed = (typeof seedData)[number];

/** Everything on Discover: seed listings (minus claimed ones) plus approved provider listings. */
export async function getCatalog() {
  const { activities, claimedSeedIds } = await getProviderActivities();
  const claimed = new Set(claimedSeedIds);
  const seeds = (seedData as Seed[])
    .filter((s) => !claimed.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      provider: s.provider,
      category: s.category,
      subcategory: (s as { subcategory?: string }).subcategory ?? null,
      neighborhood: s.neighborhood,
      ageMin: s.ageMin,
      ageMax: s.ageMax,
      price: s.price,
      priceUnit: s.priceUnit,
      website: s.website,
    }));
  return [...seeds, ...activities];
}
