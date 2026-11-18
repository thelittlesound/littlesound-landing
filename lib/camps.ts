// Camps are their own category (Evan, 2026-11-17): every listing that is
// mainly a camp lives in Camps, never also in its subject category. Inside
// Camps, the subcategory is WHEN it runs and the theme is WHAT it's about
// (one of Discover's subject categories, or "All-around").
// Pure and client-safe: Discover, the catalog and the agents all use it.

export const CAMP_WHEN = ['Summer weeks', 'School breaks', 'Overnight', 'Before & after care'] as const;
export type CampWhen = (typeof CAMP_WHEN)[number];

export const ALL_AROUND = 'All-around';

/** Themes, in the order Discover shows them. All but All-around are Discover categories. */
export const CAMP_THEMES = [
  'Sports', 'Outdoor', 'STEM', 'Arts', 'Theater', 'Swimming', 'Music', 'Dance',
  'Cooking', 'Martial Arts', 'Language', 'Academic', ALL_AROUND,
] as const;

const WHEN_RULES: [CampWhen, RegExp][] = [
  ['Summer weeks', /summer/i],
  ['School breaks', /break|single[- ]day|winter|thanksgiving|spring|conference|no[- ]school|days? off/i],
  ['Overnight', /overnight|sleepaway|resident camp/i],
  ['Before & after care', /before\s*(&|and)\s*after|after[- ]care|before[- ]care|extended care|creative care/i],
];

/** When a camp runs, guessed from its words. Nothing said → Summer weeks (most camps). */
export function whenFromText(text: string): CampWhen[] {
  const found = WHEN_RULES.filter(([, re]) => re.test(text)).map(([w]) => w);
  // "Before & after care" is its own thing, not a camp week.
  if (found.includes('Before & after care')) return ['Before & after care'];
  return found.length ? found : ['Summer weeks'];
}

/**
 * The When values of a camp listing. The stored subcategory wins (it may hold
 * several, comma-separated, e.g. "Summer weeks, School breaks"); an older or
 * free-text subcategory falls back to reading the title.
 */
export function campWhens(a: { subcategory?: string | null; title?: string | null }): CampWhen[] {
  const stored = (a.subcategory ?? '')
    .split(/\s*,\s*/)
    .filter((s): s is CampWhen => (CAMP_WHEN as readonly string[]).includes(s));
  if (stored.length) return CAMP_WHEN.filter((w) => stored.includes(w));
  return whenFromText(`${a.title ?? ''} ${a.subcategory ?? ''}`);
}

const THEME_RULES: [string, RegExp][] = [
  ['Swimming', /\bswim/i],
  ['Martial Arts', /karate|martial|taekwondo|jiu[- ]?jitsu|judo|kung fu/i],
  ['Outdoor', /sail|kayak|paddl|canoe|rowing|nature|zoo|farm|garden|forest|outdoor|wilderness/i],
  ['STEM', /\bstea?m\b|lego|robot|coding|\bcode\b|science|\btech|minecraft|engineer/i],
  ['Theater', /drama|theat|acting|costume|improv|story explorers/i],
  ['Cooking', /cook|bak(e|ing)|culinary|chef/i],
  ['Dance', /dance|ballet|hip ?hop/i],
  ['Music', /music|rock band|choir|guitar|piano/i],
  ['Language', /language|spanish|french|mandarin|japanese|immersion/i],
  ['Arts', /\bart\b|\barts\b|paint|draw|pottery|clay|craft/i],
  ['Sports', /soccer|baseball|softball|basketball|volleyball|ultimate|pickleball|tennis|lacrosse|football|sport|skate|climb|gymnast/i],
];

/** A camp's theme from its words; mixed or unclear → All-around. */
export function themeFromText(text: string): string {
  const hits = THEME_RULES.filter(([, re]) => re.test(text)).map(([t]) => t);
  return hits.length === 1 ? hits[0] : ALL_AROUND;
}

/** The theme to show: the stored one, else read from the title. */
export function campTheme(a: { theme?: string | null; title?: string | null }): string {
  const t = a.theme?.trim();
  if (t && (CAMP_THEMES as readonly string[]).includes(t)) return t;
  return themeFromText(a.title ?? '');
}

/**
 * Is this title mainly a camp? "Youth Summer Sailing Camps" yes; "Kids Baking
 * Classes, Camps & After-School" no (a year-round program that also runs
 * camps stays in its subject). "Camp Long" is a park, not a camp.
 */
export function isMainlyCamp(title: string): boolean {
  if (!/\bcamps?\b/i.test(title)) return false;
  if (/camp long|base camp/i.test(title)) return false;
  return !/class|lesson|club|clinic|workshop|after[- ]?school|program|team|league|production|enrichment/i.test(title);
}

/**
 * Where a new listing belongs. A camp (filed as Camps, or a subject listing
 * that is mainly a camp) → Camps, with its When as the subcategory and its
 * subject as the theme. Anything else comes back unchanged with theme null.
 */
export function placeListing(l: { category: string; subcategory?: string | null; title: string; description?: string | null }): {
  category: string; subcategory: string | null; theme: string | null;
} {
  const isCamp = l.category === 'Camps' || isMainlyCamp(l.title);
  if (!isCamp) return { category: l.category, subcategory: l.subcategory ?? null, theme: null };
  const whens = campWhens({ subcategory: l.subcategory, title: l.title });
  const theme = l.category !== 'Camps' && (CAMP_THEMES as readonly string[]).includes(l.category)
    ? l.category
    : themeFromText(l.title);
  return { category: 'Camps', subcategory: whens.join(', '), theme };
}

/** Label for a theme pill / card tag. */
export function themeLabel(theme: string): string {
  return theme === ALL_AROUND ? 'All-around day camps' : theme;
}
