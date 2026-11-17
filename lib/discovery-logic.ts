// Pure rules for the discovery agent (lib/discovery.ts): which searches to
// run, which sites count as a provider's own, and what's already known.
// No network, no database: safe to test.

export const DISCOVERY_REFRESH_DAYS = 30;

export interface DiscoveryArea {
  key: string;
  /** How the search names the area. */
  label: string;
  zips: string[];
  /** Discover neighborhood for what's found here (unless the AI says Citywide). */
  neighborhood: string;
}

export interface DiscoverySport {
  key: string;
  /** How the search names the sport. */
  label: string;
  category: string;
  subcategory: string;
}

// West Seattle + White Center first (decided 2026-11-16). Add areas here to grow.
export const DISCOVERY_AREAS: DiscoveryArea[] = [
  { key: 'west-seattle', label: 'West Seattle (Alki, Admiral, the Junction, Morgan Junction, Fauntleroy, Arbor Heights)', zips: ['98116', '98136', '98126'], neighborhood: 'West Seattle' },
  { key: 'delridge', label: 'Delridge, High Point and Highland Park in West Seattle', zips: ['98106', '98126'], neighborhood: 'West Seattle' },
  { key: 'white-center', label: 'White Center and South Park', zips: ['98146', '98106', '98108'], neighborhood: 'White Center' },
];

export const DISCOVERY_SPORTS: DiscoverySport[] = [
  { key: 'soccer', label: 'youth soccer clubs and leagues', category: 'Sports', subcategory: 'Soccer' },
  { key: 'baseball', label: 'youth baseball and softball leagues and select teams', category: 'Sports', subcategory: 'Baseball & Softball' },
  { key: 'basketball', label: 'youth basketball leagues, clubs and AAU teams', category: 'Sports', subcategory: 'Basketball' },
  { key: 'volleyball', label: 'youth volleyball clubs and leagues', category: 'Sports', subcategory: 'Volleyball' },
  { key: 'football', label: 'youth tackle and flag football leagues', category: 'Sports', subcategory: 'Football' },
  { key: 'lacrosse', label: 'youth lacrosse clubs', category: 'Sports', subcategory: 'Lacrosse' },
  { key: 'running', label: 'youth running, cross country and track clubs', category: 'Sports', subcategory: 'Running' },
  { key: 'swim-team', label: 'youth competitive swim teams', category: 'Swimming', subcategory: 'Swim Team' },
  { key: 'gymnastics', label: 'kids gymnastics, tumbling and cheer programs', category: 'Sports', subcategory: 'Gymnastics' },
  { key: 'martial-arts', label: 'kids martial arts schools (karate, taekwondo, jiu jitsu, judo)', category: 'Martial Arts', subcategory: 'Martial Arts' },
  { key: 'tennis', label: 'youth tennis and pickleball programs', category: 'Sports', subcategory: 'Tennis' },
  { key: 'skating', label: 'kids ice skating, hockey and roller skating programs', category: 'Sports', subcategory: 'Skating' },
  { key: 'ultimate', label: 'youth ultimate frisbee teams and leagues', category: 'Sports', subcategory: 'Ultimate' },
  { key: 'climbing', label: 'kids climbing and bouldering programs', category: 'Sports', subcategory: 'Climbing' },
  { key: 'wrestling', label: 'youth wrestling clubs', category: 'Sports', subcategory: 'Wrestling' },
  { key: 'water', label: 'youth rowing, sailing, kayaking and paddling programs', category: 'Outdoor', subcategory: 'Water Sports' },
];

export interface DiscoveryQuery {
  key: string;
  sport: DiscoverySport;
  area: DiscoveryArea;
}

export function allQueries(): DiscoveryQuery[] {
  const out: DiscoveryQuery[] = [];
  for (const area of DISCOVERY_AREAS) for (const sport of DISCOVERY_SPORTS) out.push({ key: `${sport.key}|${area.key}`, sport, area });
  return out;
}

/**
 * Searches due now, most overdue first: never run, then oldest. A search is due
 * DISCOVERY_REFRESH_DAYS after it last ran (and an hour after a failure, so a
 * bad run doesn't block the queue but isn't retried in a tight loop).
 */
export function dueQueries(
  lastRun: Map<string, { at: string | null; failed?: boolean }>,
  now: Date
): DiscoveryQuery[] {
  const nowMs = now.getTime();
  return allQueries()
    .map((q) => ({ q, r: lastRun.get(q.key) }))
    .filter(({ r }) => {
      if (!r?.at) return true;
      const age = nowMs - Date.parse(r.at);
      return r.failed ? age > 60 * 60 * 1000 : age > DISCOVERY_REFRESH_DAYS * 86_400_000;
    })
    .sort((a, b) => (a.r?.at ?? '').localeCompare(b.r?.at ?? ''))
    .map(({ q }) => q);
}

// Directories, news, social and booking marketplaces: fine for finding names,
// never the provider's own site (facts must come from the provider).
const NOT_OWN_SITE = [
  'classcub.com', 'enrichment.kids', 'parentmap.com', 'seattleschild.com', 'westseattleblog.com', 'westsideseattle.com',
  'whitecenternow.com', 'b-townblog.com', 'macaronikid.com', 'yelp.com', 'facebook.com', 'instagram.com', 'x.com',
  'twitter.com', 'tiktok.com', 'youtube.com', 'linkedin.com', 'nextdoor.com', 'google.com', 'goo.gl', 'mapquest.com',
  'yopki.com', 'atly.com', 'lessons.com', 'letsroll.co', 'activekids.com', 'active.com', 'eventbrite.com',
  'sawyer.com', 'hisawyer.com', 'care.com', 'thumbtack.com', 'tripadvisor.com', 'wikipedia.org', 'maxpreps.com',
  'charitynavigator.org', 'propublica.org', 'guidestar.org', 'wagives.org', 'givebutter.com', 'gofundme.com',
  'myclubscout.com', 'checkbook.org', 'localgymsandfitness.com', 'revgear.com', 'reclub.co', 'pickleheads.com',
  'jotform.com', 'linktr.ee', 'thehomeschoolmom.com', 'kidsoutandabout.com', 'patch.com',
];

// Platforms that host many organizations: the first path segment names the club.
const SHARED_HOSTS = ['clubs.bluesombrero.com', 'tshq.bluesombrero.com', 'sites.google.com', 'leagueapps.com', 'go.teamsnap.com', 'sportsengine.com'];

function parseUrl(url: string | null | undefined): URL | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The provider's own website (not a directory, news site or social page). */
export function isOwnSite(url: string | null | undefined): boolean {
  const u = parseUrl(url);
  if (!u) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.includes('.')) return false;
  return !NOT_OWN_SITE.some((d) => matchesDomain(host, d));
}

/** One key per organization's site: the host, plus the club's path on a shared platform. */
export function siteKey(url: string | null | undefined): string | null {
  const u = parseUrl(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (SHARED_HOSTS.some((d) => matchesDomain(host, d))) {
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? `${host}/${seg.toLowerCase()}` : host;
  }
  return host;
}

export function normName(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(the|inc|llc|club|association|of|youth|seattle)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface Known {
  sites: Set<string>;
  names: Set<string>;
}

/** What Little Sound already lists or has suggested (any status, so dismissed ones never come back). */
export function buildKnown(rows: { business?: string | null; website?: string | null }[]): Known {
  const sites = new Set<string>();
  const names = new Set<string>();
  for (const r of rows) {
    const k = siteKey(r.website);
    if (k) sites.add(k);
    const n = normName(r.business);
    if (n) names.add(n);
  }
  return { sites, names };
}

export const LEVELS = ['rec', 'club'] as const;

export interface FoundClub {
  organization: string;
  title: string;
  website: string;
  sourceUrl: string;
  neighborhood: string;
  ageMin: number | null;
  ageMax: number | null;
  level: 'rec' | 'club' | null;
  serves: string | null;
  price: number | null;
  priceUnit: string | null;
  description: string | null;
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const age = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 18 ? v : null);

/**
 * Validates one club the AI reported. Rejects anything without the provider's
 * own website, or whose facts came from a page that isn't on that site.
 */
export function cleanClub(raw: unknown, area: DiscoveryArea): FoundClub | { skip: string } {
  if (!raw || typeof raw !== 'object') return { skip: 'not an object' };
  const r = raw as Record<string, unknown>;
  const organization = str(r.organization, 120);
  if (!organization) return { skip: 'no organization name' };
  const website = str(r.website, 500);
  if (!website || !isOwnSite(website)) return { skip: `${organization}: no own website` };
  const sourceUrl = str(r.source_url, 500) ?? website;
  if (!isOwnSite(sourceUrl) || siteKey(sourceUrl)?.split('/')[0] !== siteKey(website)?.split('/')[0]) {
    return { skip: `${organization}: facts not from its own site` };
  }
  let ageMin = age(r.age_min);
  let ageMax = age(r.age_max);
  if (ageMin != null && ageMax != null && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
  const neighborhood = r.neighborhood === 'Citywide' ? 'Citywide' : r.neighborhood === 'White Center' ? 'White Center' : r.neighborhood === 'West Seattle' ? 'West Seattle' : area.neighborhood;
  const price = typeof r.price === 'number' && r.price >= 0 && r.price < 100_000 ? r.price : null;
  return {
    organization,
    title: str(r.program_title, 120) ?? organization,
    website: parseUrl(website)!.toString(),
    sourceUrl: parseUrl(sourceUrl)!.toString(),
    neighborhood,
    ageMin,
    ageMax,
    level: r.level === 'rec' || r.level === 'club' ? r.level : null,
    serves: str(r.serves, 200),
    price,
    priceUnit: price != null ? str(r.price_unit, 30) : null,
    description: str(r.description, 500),
  };
}

/** Is this club new to Little Sound? (Its site and its name both unknown.) */
export function isNew(c: Pick<FoundClub, 'organization' | 'website'>, known: Known): boolean {
  const k = siteKey(c.website);
  if (k && known.sites.has(k)) return false;
  const n = normName(c.organization);
  return !(n && known.names.has(n));
}
