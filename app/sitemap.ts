import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// /sitemap.xml — the public pages we want search engines to find.
//
// Deliberately left out: sign-in / sign-up / password pages, dashboards, the
// claim flow, /admin and /api (all either private or thin forms), and
// /unlock. Discover's category filters (?category=...) are the same page, so
// they're not listed separately; there are no per-activity pages yet.
//
// No lastModified: these pages don't track edit dates, and stamping "today"
// on every crawl would just teach search engines to ignore the field.
const PAGES = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/discover', changeFrequency: 'daily', priority: 0.9 },
  { path: '/for-families', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/for-providers', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
] as const; // `as const` keeps changeFrequency as the literal values Next's type requires

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
