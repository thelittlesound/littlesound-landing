'use client';

import { useEffect, useState } from 'react';
import { CatalogStats, FALLBACK_STATS, roundedCount } from '@/lib/catalog-stats';

/** Rounded live catalog counts ("300+"), starting from the fallback figures. */
export function useCatalogStats() {
  const [stats, setStats] = useState<CatalogStats>(FALLBACK_STATS);
  useEffect(() => {
    let alive = true;
    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.programs === 'number' && d.programs > 0) setStats(d);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return {
    programs: roundedCount(stats.programs),
    providers: roundedCount(stats.providers),
    categories: String(stats.categories),
    /** Exact per-category counts once /api/stats answers; null until then. */
    byCategory: stats.byCategory ?? null,
  };
}
