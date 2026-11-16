// Family profile: the lists the dashboard offers and the validation for what
// gets saved. Pure and client-safe (the dashboard and /api/families/profile
// both use it, so the form and the server agree).

export const NEIGHBORHOODS = [
  'Ballard', 'Beacon Hill', 'Capitol Hill', 'Central District', 'Columbia City',
  'Eastlake', 'First Hill', 'Fremont', 'Green Lake', 'Greenwood',
  'Interbay', 'Kirkland', 'Lake City', 'Laurelhurst', 'Leschi',
  'Magnolia', 'Madrona', 'Mercer Island', 'Mount Baker', 'North Seattle',
  'Phinney Ridge', 'Queen Anne', 'Rainier Beach', 'Redmond', 'Shoreline',
  'South Lake Union', 'South Seattle', 'University District', 'Wallingford',
  'West Seattle', 'White Center', 'Citywide',
];

export const INTERESTS = [
  'Camps', 'Sports & Athletics', 'Arts & Crafts', 'Music & Dance',
  'Academic & Tutoring', 'Outdoor Adventure', 'STEM & Tech',
  'Swim & Aquatics', 'Dance & Movement', 'Theater & Performance',
];

const KID_ID_RE = /^k_[a-z0-9]{4,16}$/; // same format as lib/calendar-grid.ts
export const MAX_KIDS = 8;

/** One child as stored in profiles.kids. */
export interface StoredKid {
  id: string;
  name?: string;
  age?: number;
  interests?: string[];
}
export interface CleanProfile {
  first_name: string | null;
  neighborhood: string | null;
  kids: StoredKid[];
  /** All the kids' interests together (older parts of the app read this). */
  preferences: string[];
}

/** Validates what the dashboard sends. Returns the cleaned profile or a message to show. */
export function cleanProfile(raw: unknown): CleanProfile | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const firstName = typeof b.first_name === 'string' ? b.first_name.trim().slice(0, 40) : '';
  const neighborhood = typeof b.neighborhood === 'string' && NEIGHBORHOODS.includes(b.neighborhood) ? b.neighborhood : null;
  if (!Array.isArray(b.kids)) return { error: 'Something was off with the kids list. Please try again.' };
  if (b.kids.length > MAX_KIDS) return { error: `Up to ${MAX_KIDS} kids, please.` };

  const kids: StoredKid[] = [];
  const seen = new Set<string>();
  for (const [i, k] of b.kids.entries()) {
    const kid = (k ?? {}) as Record<string, unknown>;
    const name = typeof kid.name === 'string' ? kid.name.trim().slice(0, 40) : '';
    const ageRaw = kid.age;
    const hasAge = ageRaw !== '' && ageRaw != null;
    const age = Number(ageRaw);
    if (hasAge && (!Number.isInteger(age) || age < 0 || age > 18)) {
      return { error: `Kid ${i + 1}: age should be a whole number from 0 to 18.` };
    }
    const interests = Array.isArray(kid.interests) ? [...new Set(kid.interests.filter((x): x is string => typeof x === 'string' && INTERESTS.includes(x)))] : [];
    if (!name && !hasAge && !interests.length) continue; // an empty row
    const id = typeof kid.id === 'string' && KID_ID_RE.test(kid.id) && !seen.has(kid.id) ? kid.id : null;
    if (!id) return { error: 'Something was off with the kids list. Please refresh and try again.' };
    seen.add(id);
    kids.push({ id, ...(name ? { name } : {}), ...(hasAge ? { age } : {}), ...(interests.length ? { interests } : {}) });
  }
  const preferences = INTERESTS.filter((x) => kids.some((k) => k.interests?.includes(x)));
  return { first_name: firstName || null, neighborhood, kids, preferences };
}
