// Catalog counts for marketing stat cards (2026-11-18). Counts change daily,
// so cards show a rounded-down figure with "+" (304 -> "300+") and the label
// "and counting", rather than a hard-coded number that goes stale.

export interface CatalogStats {
  programs: number;
  providers: number;
  categories: number;
}

/** Round down to a friendly figure: nearest 50 from 100 up, nearest 10 from 20 up. */
export function roundedCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const step = n >= 100 ? 50 : n >= 20 ? 10 : 1;
  const r = Math.floor(n / step) * step;
  return r < n ? `${r}+` : `${r}`;
}

export function catalogStats(items: { provider?: string | null; category?: string | null }[]): CatalogStats {
  const providers = new Set(items.map((x) => (x.provider || '').toLowerCase().trim()).filter(Boolean));
  const categories = new Set(items.map((x) => x.category).filter(Boolean));
  return { programs: items.length, providers: providers.size, categories: categories.size };
}

/** Shown until /api/stats answers (figures as of 2026-11-18). */
export const FALLBACK_STATS: CatalogStats = { programs: 304, providers: 228, categories: 14 };
