// Child-first picks (approved mockup https://claude.ai/artifact/FZHd2pq5EbzdyyhFKA9vLh,
// built 2026-11-20). A few good picks for one child and one goal, each with
// a "Why it fits" line made ONLY from facts we hold: the child's age and
// chosen interests, the listing's level, how close it is, and dates the
// date agent found. Never invented. Fewer picks rather than padding.
// Pure: Discover calls it; tests/picks.test.ts covers it.
import { categoriesFor, matchesInterest, type MatchKid } from './kid-match';
import { closeness, type Place } from './search';

export type Goal = 'team' | 'new' | 'camp';
export const GOALS: { key: Goal; label: string }[] = [
  { key: 'team', label: 'A team or league' },
  { key: 'new', label: 'Something new' },
  { key: 'camp', label: 'A camp week' },
];

export interface PickInput {
  id: string;
  title: string;
  provider: string;
  category: string;
  neighborhood: string;
  ageMin: number;
  ageMax: number;
  /** false = no ages on file: never picked (we can't say it fits). */
  agesKnown?: boolean;
  level?: string | null;
  price?: number | null;
  theme?: string | null;
  serves?: string | null;
}
export interface KidPick<A extends PickInput = PickInput> {
  a: A;
  why: string;
}

/** How to say each category in "Matches Ella's interest in …". */
const INTEREST_WORD: Record<string, string> = {
  Sports: 'sports', 'Martial Arts': 'martial arts', Swimming: 'swimming', Arts: 'art', Music: 'music', Dance: 'dance',
  Theater: 'theater', STEM: 'STEM', Outdoor: 'the outdoors', Cooking: 'cooking', Academic: 'learning', Language: 'languages',
  Camps: 'camps', 'Early Childhood': 'little-kid classes',
};

const TEAM_WORDS = /\b(league|team|teams|club|select|premier|aau|travel)\b/i;
/** Girls- or boys-only: we don't know a child's gender, so these never become picks (they stay in "Everything"). */
const ONE_GENDER = /\b(girls?|boys?)\b/i;
export function singleGender(a: Pick<PickInput, 'title' | 'serves'>): boolean {
  const t = `${a.title} ${a.serves ?? ''}`;
  return ONE_GENDER.test(t) && !/\b(girls?|boys?)\s*(&|and|\+)\s*(girls?|boys?)\b/i.test(t);
}
/** Only dated lines make a reason ("Registration opens Dec 1"), not "Weekly · Tue 3pm". */
const DATED = /^(registration|next session|registration opens|starts|begins)/i;

/** Does this listing answer the goal for this child? */
export function fitsGoal(a: PickInput, goal: Goal, interestCats: Set<string>): boolean {
  if (goal === 'camp') return a.category === 'Camps';
  if (goal === 'team') return a.category === 'Sports' && (a.level === 'rec' || a.level === 'club' || TEAM_WORDS.test(a.title));
  // Something new: not a camp, and outside the interests the parent chose
  // (with no interests chosen, anything counts as new).
  return a.category !== 'Camps' && a.category !== 'Early Childhood' && !matchesInterest(a, interestCats);
}

function ageOk(a: PickInput, age: number): boolean {
  return a.agesKnown !== false && a.ageMin <= age && age <= a.ageMax;
}

/** Up to `max` picks for this child and goal, best first, one per provider. */
export function picksFor<A extends PickInput>(
  kid: Pick<MatchKid, 'name' | 'age' | 'interests'> | MatchKid,
  goal: Goal,
  list: A[],
  opts: { place?: Place | null; dateLines?: Record<string, string>; max?: number } = {}
): { picks: KidPick<A>[]; eligible: number } {
  const age = (kid as MatchKid).age;
  if (age == null) return { picks: [], eligible: 0 };
  const place = opts.place ?? null;
  const dates = opts.dateLines ?? {};
  const cats = categoriesFor(kid as MatchKid);

  const fitsAge = list.filter((a) => ageOk(a, age) && (!place || closeness(a.neighborhood, place).tier !== 3));
  const usable = fitsAge.filter((a) => !singleGender(a));
  const scored = usable
    .filter((a) => fitsGoal(a, goal, cats))
    .map((a, i) => {
      const near = closeness(a.neighborhood, place);
      let s = 0;
      if (goal !== 'new' && matchesInterest(a, cats)) s += 4;
      if (place) s += near.tier === 0 ? 3 : near.tier === 1 ? 2 : near.tier === 2 ? 1 : 0;
      if (dates[a.id] && DATED.test(dates[a.id])) s += 2;
      if (goal === 'team' && a.level === 'rec') s += 1;
      if (a.price != null) s += 1;
      if (a.ageMax - a.ageMin <= 8) s += 1; // made for kids about this age, not "everyone"
      return { a, s, i, near };
    })
    .sort((x, y) => y.s - x.s || (x.near.miles ?? 99) - (y.near.miles ?? 99) || x.i - y.i);

  const max = opts.max ?? 3;
  const picks: KidPick<A>[] = [];
  const providers = new Set<string>();
  const newCats = new Set<string>();
  for (const x of scored) {
    if (picks.length >= max) break;
    const p = x.a.provider.toLowerCase().trim();
    if (providers.has(p)) continue;
    if (goal === 'new' && newCats.has(x.a.category)) continue; // "new" = a spread of different things
    providers.add(p);
    newCats.add(x.a.category);
    picks.push({ a: x.a, why: whyItFits(x.a, kid as MatchKid, goal, cats, place, dates[x.a.id]) });
  }
  return { picks, eligible: fitsAge.length };
}

/** One or two true reasons, most specific first. */
export function whyItFits(
  a: PickInput,
  kid: Pick<MatchKid, 'name' | 'age'>,
  goal: Goal,
  cats: Set<string>,
  place: Place | null,
  dateLine?: string
): string {
  const reasons: string[] = [];
  if (goal !== 'new' && matchesInterest(a, cats)) {
    const c = cats.has(a.category) ? a.category : a.theme ?? a.category;
    const word = INTEREST_WORD[c];
    if (word) reasons.push(`Matches ${kid.name}’s interest in ${word}.`);
  }
  if (goal === 'new' && cats.size) reasons.push(`A change from ${kid.name}’s usual interests.`);
  if (a.level === 'rec') reasons.push('Rec: everyone plays.');
  else if (a.level === 'club') reasons.push('Club team: tryouts.');
  if (place) {
    const near = closeness(a.neighborhood, place);
    if (near.tier === 0) reasons.push(place.profile ? `In ${a.neighborhood}, close to home.` : `In ${a.neighborhood}.`);
    else if (near.miles != null && near.miles <= 5) reasons.push(`About ${Math.max(1, Math.round(near.miles))} mi ${place.profile ? 'from home' : `from ${place.area}`}.`);
  }
  if (dateLine && DATED.test(dateLine)) reasons.push(`${dateLine}.`);
  if (reasons.length < 2) reasons.push(`Ages ${a.ageMin}${a.ageMax >= 18 ? '+' : `–${a.ageMax}`}, so ${kid.name} (${kid.age}) fits.`);
  return reasons.slice(0, 2).join(' ');
}
