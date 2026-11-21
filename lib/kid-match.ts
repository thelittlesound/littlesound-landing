// Matching Discover activities to one child: their age and the interests
// chosen for them in the family profile. Pure and client-safe (Discover and
// the dashboard both use it).

import { INTERESTS } from '@/lib/family-profile';

const KID_ID_RE = /^k_[a-z0-9]{4,16}$/; // same format as lib/calendar-grid.ts

/** Profile interests → the Discover categories they cover. */
export const INTEREST_CATEGORIES: Record<string, string[]> = {
  'Camps': ['Camps'],
  'Sports & Athletics': ['Sports', 'Martial Arts'],
  'Arts & Crafts': ['Arts', 'Cooking'],
  'Music & Dance': ['Music', 'Dance'],
  'Academic & Tutoring': ['Academic', 'Language'],
  'Outdoor Adventure': ['Outdoor'],
  'STEM & Tech': ['STEM'],
  'Swim & Aquatics': ['Swimming'],
  'Dance & Movement': ['Dance'],
  'Theater & Performance': ['Theater'],
};

export interface MatchKid {
  id: string;
  name: string;
  age: number | null;
  interests: string[];
}

/** Kids from profiles.kids that can be browsed for (they have an id and a name). */
export function browsableKids(raw: unknown): MatchKid[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchKid[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const k = r as Record<string, unknown>;
    const id = typeof k.id === 'string' && KID_ID_RE.test(k.id) ? k.id : '';
    const name = typeof k.name === 'string' ? k.name.trim() : '';
    if (!id || !name || out.some((x) => x.id === id)) continue;
    const ageN = Number(k.age);
    const age = k.age != null && String(k.age).trim() !== '' && Number.isInteger(ageN) ? ageN : null;
    const interests = Array.isArray(k.interests) ? k.interests.filter((x): x is string => typeof x === 'string' && INTERESTS.includes(x)) : [];
    out.push({ id, name, age, interests });
  }
  return out;
}

/** The Discover categories a child's interests point to (empty: no preference). Little ones also get Early Childhood. */
export function categoriesFor(kid: Pick<MatchKid, 'age' | 'interests'>): Set<string> {
  const cats = new Set<string>();
  for (const i of kid.interests) for (const c of INTEREST_CATEGORIES[i] ?? []) cats.add(c);
  if (cats.size && kid.age != null && kid.age <= 5) cats.add('Early Childhood');
  return cats;
}

export function ageFits(a: { ageMin: number | null | undefined; ageMax: number | null | undefined }, age: number | null): boolean {
  if (age == null) return true;
  if (a.ageMin == null && a.ageMax == null) return true;
  return age >= (a.ageMin ?? 0) && age <= (a.ageMax ?? 99);
}

/** Does this activity suit the child? `useInterests` false = any category at their age. */
export function fitsKid(
  a: { ageMin: number | null | undefined; ageMax: number | null | undefined; category: string | null | undefined; theme?: string | null },
  kid: Pick<MatchKid, 'age' | 'interests'>,
  useInterests = true
): boolean {
  if (!ageFits(a, kid.age)) return false;
  if (!useInterests) return true;
  const cats = categoriesFor(kid);
  return !cats.size || matchesInterest(a, cats);
}

/** A listing matches the child's categories by its category, or (a camp) by its theme: a sailing camp suits an Outdoor kid. */
export function matchesInterest(a: { category: string | null | undefined; theme?: string | null }, cats: Set<string>): boolean {
  return cats.has(a.category ?? '') || (a.category === 'Camps' && !!a.theme && cats.has(a.theme));
}

/**
 * Categories a parent actually NAMED for this child ("Ella likes"), used for
 * labels. Narrower than categoriesFor(), which also matches related
 * categories (Arts & Crafts → Cooking) and adds Early Childhood for little
 * kids: fine for matching, but labeling those "Ella likes" would claim
 * something the parent never said.
 */
const NAMED_CATEGORIES: Record<string, string[]> = {
  'Camps': ['Camps'],
  'Sports & Athletics': ['Sports'],
  'Arts & Crafts': ['Arts'],
  'Music & Dance': ['Music', 'Dance'],
  'Academic & Tutoring': ['Academic'],
  'Outdoor Adventure': ['Outdoor'],
  'STEM & Tech': ['STEM'],
  'Swim & Aquatics': ['Swimming'],
  'Dance & Movement': ['Dance'],
  'Theater & Performance': ['Theater'],
};
export function namedCategories(kid: Pick<MatchKid, 'interests'>): Set<string> {
  const cats = new Set<string>();
  for (const i of kid.interests) for (const c of NAMED_CATEGORIES[i] ?? []) cats.add(c);
  return cats;
}
