import seedData from '@/app/data/activities.json';
import { supabaseAdmin } from '@/lib/supabase';

// Server-only helpers for the listing-claim flow. Uses the service-role
// client — never import this from a client component.
//
// A "claimable" listing is anything shown on Discover that no provider owns:
//   • a static seed listing (app/data/activities.json) that hasn't been
//     imported into `submissions` yet — Discover id "1".."79"
//   • an approved `submissions` row with no provider_id (created before
//     provider accounts existed) — Discover id "sub_<uuid>"

type Seed = (typeof seedData)[number] & { subcategory?: string };

const SUB_PREFIX = 'sub_';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClaimListing {
  activityId: string; // Discover id
  source: 'seed' | 'submission';
  title: string;
  business: string;
  category: string | null;
  subcategory: string | null;
  neighborhood: string | null;
  website: string | null;
  ageMin: number | null;
  ageMax: number | null;
  price: number | null;
  priceUnit: string | null;
  description: string | null;
}

export interface ResolvedListing extends ClaimListing {
  claimable: boolean;
  ownerId: string | null;
}

interface SubmissionRow {
  id: string;
  provider_id: string | null;
  status: string;
  seed_id?: string | null;
  title: string | null;
  contact_name: string | null;
  category: string | null;
  subcategory: string | null;
  neighborhood: string | null;
  website: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  price_unit: string | null;
  description: string | null;
}

const SUBMISSION_FIELDS =
  'id, provider_id, status, title, contact_name, category, subcategory, neighborhood, website, age_min, age_max, price, price_unit, description';

const seeds = seedData as Seed[];
const seedById = new Map(seeds.map((s) => [s.id, s]));

export function getSeed(id: string): Seed | undefined {
  return seedById.get(id);
}

function fromSeed(s: Seed): ClaimListing {
  return {
    activityId: s.id,
    source: 'seed',
    title: s.title,
    business: s.provider,
    category: s.category ?? null,
    subcategory: s.subcategory ?? null,
    neighborhood: s.neighborhood ?? null,
    website: s.website ?? null,
    ageMin: s.ageMin ?? null,
    ageMax: s.ageMax ?? null,
    price: s.price ?? null,
    priceUnit: s.priceUnit ?? null,
    description: s.description ?? null,
  };
}

function fromSubmission(r: SubmissionRow): ClaimListing {
  return {
    activityId: `${SUB_PREFIX}${r.id}`,
    source: 'submission',
    title: r.title ?? 'Untitled listing',
    // Pre-account rows have no provider profile; the contact name is the
    // best label we have for grouping.
    business: r.contact_name ?? 'Unknown provider',
    category: r.category,
    subcategory: r.subcategory,
    neighborhood: r.neighborhood,
    website: r.website,
    ageMin: r.age_min,
    ageMax: r.age_max,
    price: r.price,
    priceUnit: r.price_unit,
    description: r.description,
  };
}

/** Every listing currently on Discover that no provider owns. */
export async function getClaimableListings(): Promise<ClaimListing[]> {
  const [{ data: imported }, { data: unowned }] = await Promise.all([
    supabaseAdmin.from('submissions').select('seed_id').not('seed_id', 'is', null),
    supabaseAdmin
      .from('submissions')
      .select(SUBMISSION_FIELDS)
      .eq('status', 'approved')
      .is('provider_id', null),
  ]);

  const claimedSeeds = new Set(
    ((imported ?? []) as { seed_id: string }[]).map((r) => r.seed_id)
  );

  return [
    ...seeds.filter((s) => !claimedSeeds.has(s.id)).map(fromSeed),
    ...((unowned ?? []) as SubmissionRow[]).map(fromSubmission),
  ];
}

/**
 * Looks up specific Discover ids and reports, for each, whether it exists,
 * whether it can be claimed right now, and who owns it. Unknown ids map to
 * null. Always re-check with this at the moment of writing (claim creation
 * and approval) — never trust a list fetched earlier.
 */
export async function resolveListings(ids: string[]): Promise<Map<string, ResolvedListing | null>> {
  const result = new Map<string, ResolvedListing | null>();
  const seedIds = ids.filter((id) => !id.startsWith(SUB_PREFIX));
  const subUuids = ids
    .filter((id) => id.startsWith(SUB_PREFIX))
    .map((id) => id.slice(SUB_PREFIX.length))
    .filter((u) => UUID_RE.test(u)); // malformed uuids would fail the whole query

  const [{ data: importedRows }, { data: subRows }] = await Promise.all([
    seedIds.length
      ? supabaseAdmin.from('submissions').select('seed_id, provider_id').in('seed_id', seedIds)
      : Promise.resolve({ data: [] as { seed_id: string; provider_id: string | null }[] }),
    subUuids.length
      ? supabaseAdmin.from('submissions').select(SUBMISSION_FIELDS).in('id', subUuids)
      : Promise.resolve({ data: [] as SubmissionRow[] }),
  ]);

  const importedBySeed = new Map(
    ((importedRows ?? []) as { seed_id: string; provider_id: string | null }[]).map((r) => [r.seed_id, r])
  );
  const subById = new Map(((subRows ?? []) as SubmissionRow[]).map((r) => [r.id, r]));

  for (const id of ids) {
    if (id.startsWith(SUB_PREFIX)) {
      const row = subById.get(id.slice(SUB_PREFIX.length));
      result.set(
        id,
        row
          ? {
              ...fromSubmission(row),
              claimable: row.provider_id == null && row.status === 'approved',
              ownerId: row.provider_id,
            }
          : null
      );
    } else {
      const seed = seedById.get(id);
      const imported = importedBySeed.get(id);
      result.set(
        id,
        seed
          ? {
              ...fromSeed(seed),
              // Once imported, the seed is owned via its submissions row.
              claimable: !imported,
              ownerId: imported?.provider_id ?? null,
            }
          : null
      );
    }
  }
  return result;
}

// Discover categories → the provider form's categories, so a claimed seed
// listing opens in the edit form with its category already selected (the
// inverse of CATEGORY_MAP in app/api/activities/route.ts). Categories the form
// doesn't offer (Martial Arts, Early Childhood, Cooking, Language) are kept
// as-is; the edit form preserves them.
const FORM_CATEGORY: Record<string, string> = {
  Camps: 'Camps',
  Sports: 'Sports & Athletics',
  Arts: 'Arts & Crafts',
  Music: 'Music & Dance',
  Academic: 'Academic & Tutoring',
  Outdoor: 'Outdoor Adventure',
  STEM: 'STEM & Tech',
  Swimming: 'Swim & Aquatics',
  Dance: 'Dance & Movement',
  Theater: 'Theater & Performance',
};

/** The `submissions` row created when a seed listing's claim is approved. */
export function seedToSubmissionRow(
  seed: Seed,
  owner: { id: string; contactName: string | null; contactEmail: string | null; phone: string | null }
) {
  return {
    provider_id: owner.id,
    seed_id: seed.id,
    status: 'approved',
    contact_name: owner.contactName,
    contact_email: owner.contactEmail,
    phone: owner.phone,
    title: seed.title,
    category: FORM_CATEGORY[seed.category] ?? seed.category,
    subcategory: seed.subcategory ?? null,
    description: seed.description ?? null,
    age_min: seed.ageMin ?? null,
    age_max: seed.ageMax ?? null,
    price: seed.price ?? null,
    price_unit: seed.priceUnit ?? null,
    neighborhood: seed.neighborhood ?? null,
    website: seed.website ?? null,
  };
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Verification hint: is the website on the claimant's profile the listing's website? */
export function sameWebsite(a: string | null, b: string | null): boolean {
  const ha = hostOf(a);
  const hb = hostOf(b);
  return !!ha && ha === hb;
}

/**
 * Verification hint for admins: does the claimant's email domain match the
 * listing's website? (jane@emeraldcitykarate.com vs emeraldcitykarate.com.)
 * A match is a strong signal, not proof; no match (e.g. a gmail address)
 * just means verify another way.
 */
export function emailMatchesWebsite(email: string | null, website: string | null): boolean {
  const domain = email?.split('@')[1]?.toLowerCase().trim();
  const host = hostOf(website);
  if (!domain || !host) return false;
  return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
}
