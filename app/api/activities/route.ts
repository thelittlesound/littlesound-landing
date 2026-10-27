import { NextResponse } from 'next/server';
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

// Live data: never serve a build-time snapshot. (A GET handler that doesn't
// read the request is static by default in Next 14, so without this, newly
// approved listings — and approved claims — wouldn't reach Discover until the
// next deploy.)
export const dynamic = 'force-dynamic';

export async function GET() {
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

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ activities: [], claimedSeedIds: [] });
  }

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
  const activities = (data || []).map((s) => ({
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
    price: s.price ?? 0,
    priceUnit: s.price_unit ?? 'session',
    description: s.description ?? '',
    website: s.website ?? '',
    source: 'provider', // flag so we can distinguish in UI if needed
  }));

  return NextResponse.json({ activities, claimedSeedIds });
}
