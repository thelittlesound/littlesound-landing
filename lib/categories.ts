// The one category list (2026-11-20, canvas
// https://claude.ai/artifact/95ChP6iycRLC8Mwdt9RxoE): Discover's 14
// categories, biggest first. Discover's tiles, the home and /for-families
// rows, the provider forms and each child's interests all use these names.
// Pure and client-safe.

export const CATEGORY_NAMES = [
  'Sports', 'Camps', 'Swimming', 'Arts', 'Martial Arts', 'Music', 'Outdoor',
  'Theater', 'Dance', 'Early Childhood', 'Language', 'STEM', 'Cooking', 'Academic',
];

/**
 * The older 10-label list (provider forms and family interests before
 * 2026-11-20) → today's names. Only what the label actually said: "Sports &
 * Athletics" is Sports, not Martial Arts. Kept so old rows and old links
 * still read correctly.
 */
export const OLD_LABELS: Record<string, string[]> = {
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

export function isCategory(x: unknown): x is string {
  return typeof x === 'string' && CATEGORY_NAMES.includes(x);
}

/** A child's interests in today's names: old labels mapped, unknowns dropped, no repeats, list order. */
export function normalizeInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const got = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    if (isCategory(x)) got.add(x);
    else for (const c of OLD_LABELS[x] ?? []) got.add(c);
  }
  return CATEGORY_NAMES.filter((c) => got.has(c));
}

/**
 * A listing's stored category in today's names. An old two-subject label
 * ("Music & Dance") takes its first subject. "Other" stays under Arts, where
 * it has always shown, until each is filed; no category at all → 'Other'.
 */
export function normalizeCategory(raw: string | null | undefined): string {
  if (!raw) return 'Other';
  if (isCategory(raw)) return raw;
  if (raw === 'Other') return 'Arts';
  return OLD_LABELS[raw]?.[0] ?? raw;
}

/** What a provider form starts on: today's name, an old label's first subject, or nothing ("Other" makes them pick). */
export function formCategory(raw: string | null | undefined): string {
  if (isCategory(raw)) return raw;
  return OLD_LABELS[raw ?? '']?.[0] ?? '';
}
