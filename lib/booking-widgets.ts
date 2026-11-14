// Finds the booking/registration system a provider's schedule lives in.
//
// Many kids' programs don't put their schedule on their own page: it's in an
// embedded widget (a <script> or <iframe>) or behind a "Register" link to a
// booking system like Jackrabbit or iClassPro. The page around it reads fine,
// so the agent used to see "no dates". This spots those systems so the agent
// can read the system's own public page for the business (and, when it can't,
// say which system the schedule is in).
//
// Pure: no network. lib/date-agent.ts does the fetching (through fetchPage,
// which still applies URL safety and each host's robots.txt).

import type { Link } from './fetch-page';
import { addDays } from './date-agent-logic';

export interface Platform {
  name: string;
  hosts: string[]; // matches the host or any subdomain of it
}

// Kids' activity booking, registration and class-schedule systems.
export const PLATFORMS: Platform[] = [
  { name: 'Jackrabbit', hosts: ['jackrabbitclass.com'] },
  { name: 'iClassPro', hosts: ['iclasspro.com'] },
  { name: 'Sawyer', hosts: ['hisawyer.com'] },
  { name: 'ActiveNet', hosts: ['activecommunities.com'] },
  { name: 'Daxko', hosts: ['daxko.com'] },
  { name: 'Amilia', hosts: ['amilia.com'] },
  { name: 'Mindbody', hosts: ['mindbodyonline.com', 'mindbody.io', 'healcode.com'] },
  { name: 'Pike13', hosts: ['pike13.com'] },
  { name: 'UltraCamp', hosts: ['ultracamp.com'] },
  { name: 'CampMinder', hosts: ['campminder.com'] },
  { name: 'CampBrain', hosts: ['campbrainregistration.com', 'campbrain.com'] },
  { name: 'DanceStudio-Pro', hosts: ['dancestudio-pro.com'] },
  { name: 'Studio Director', hosts: ['studiodirector.com'] },
  { name: 'Akada', hosts: ['akadasoftware.com'] },
  { name: 'ClassJuggler', hosts: ['classjuggler.com'] },
  { name: 'SportsEngine', hosts: ['sportsengine.com', 'sportngin.com'] },
  { name: 'LeagueApps', hosts: ['leagueapps.com'] },
  { name: 'TeamSnap', hosts: ['teamsnap.com'] },
  { name: 'Upper Hand', hosts: ['upperhand.io', 'upperhand.com'] },
  { name: 'GoMotion', hosts: ['gomotionapp.com'] },
  { name: 'TeamUnify', hosts: ['teamunify.com'] },
  { name: 'Eventbrite', hosts: ['eventbrite.com'] },
  { name: 'Regpack', hosts: ['regpack.com'] },
  { name: 'Enrollsy', hosts: ['enrollsy.com'] },
  { name: 'Omnify', hosts: ['getomnify.com'] },
  { name: 'WellnessLiving', hosts: ['wellnessliving.com'] },
  { name: 'Zen Planner', hosts: ['zenplanner.com'] },
  { name: 'Spark Membership', hosts: ['sparkmembership.com'] },
  { name: 'Kicksite', hosts: ['kicksite.net'] },
  { name: 'Gymdesk', hosts: ['gymdesk.com'] },
  { name: 'Rec1', hosts: ['rec1.com'] },
  { name: 'CommunityPass', hosts: ['communitypass.net'] },
  { name: 'MyRec', hosts: ['myrec.com'] },
  { name: 'CivicRec', hosts: ['civicrec.com'] },
  { name: 'PerfectMind', hosts: ['perfectmind.com'] },
  { name: 'Checkfront', hosts: ['checkfront.com'] },
  { name: 'FareHarbor', hosts: ['fareharbor.com'] },
  { name: 'Bookeo', hosts: ['bookeo.com'] },
  { name: 'Acuity', hosts: ['acuityscheduling.com'] },
  { name: 'Square', hosts: ['square.site', 'squareup.com'] },
];

export function platformFor(rawUrl: string): Platform | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

// Jackrabbit's embed script (OpeningsJS, or the legacy Openings.asp) writes
// its class table with JavaScript. Jackrabbit publishes the same table as
// plain HTML at OpeningsDirect with the same parameters ("Direct Method" in
// help.jackrabbitclass.com/help/online-class-listings). Registration links
// (regv2.asp?id=…) carry the same organization ID.
function jackrabbitDirect(u: URL): string | null {
  if (!/(^|\.)jackrabbitclass\.com$/i.test(u.hostname)) return null;
  // Sites write the ID parameter as OrgID, orgID, orgId, id… so match any case.
  const params = new URLSearchParams(u.search);
  const idKeys = [...params.keys()].filter((k) => /^(orgid|id)$/i.test(k));
  const org = idKeys.map((k) => params.get(k)).find((v) => v && /^\d+$/.test(v));
  if (!org) return null;
  if (/\/Openings\/Openings(JS|Direct)$/i.test(u.pathname)) {
    // Keep their filters (category, columns), normalize the ID name.
    const rest = [...params.entries()].filter(([k]) => !/^(orgid|id)$/i.test(k));
    const out = new URLSearchParams([['OrgID', org], ...rest]);
    return `https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsDirect?${out.toString()}`;
  }
  return `https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsDirect?OrgID=${org}`;
}

// Sawyer: a business's public schedule lives at hisawyer.com/<business>/schedules.
// Sites often link somewhere else inside it (gift cards, one class's checkout).
function sawyerSchedules(u: URL): string | null {
  if (!/(^|\.)hisawyer\.com$/i.test(u.hostname)) return null;
  const seg = u.pathname.split('/').filter(Boolean);
  if (seg.length < 2 || seg[1] !== 'schedules' || !/^[a-z0-9_-]{2,80}$/i.test(seg[0])) return null;
  return `https://www.hisawyer.com/${seg[0]}/schedules`;
}

export interface Widget {
  platform: string;
  /** A page worth reading, or null when we know the system but not a readable page. */
  url: string | null;
  from: 'embed' | 'link';
  /** Set when url is a booking system's public JSON catalog, read by a dedicated reader. */
  reader?: 'iclasspro';
  /** The link's own words ("Register for Nature Adventure Trek"), when it was a link. */
  text?: string;
}

// iClassPro: the parent portal (portal.iclasspro.com/<code>/…) is a JavaScript
// app, but it loads the business's public class catalog from
// app.iclasspro.com/api/open/v1/<code>/classes, with no login. That's the same
// public catalog a parent sees; we read it instead of the app shell.
function iclassproCode(u: URL): string | null {
  if (!/(^|\.)iclasspro\.com$/i.test(u.hostname)) return null;
  const seg = u.pathname.split('/').filter(Boolean);
  // portal.iclasspro.com/<code>/…, embed.iclasspro.com/portal/<code>/…,
  // app.iclasspro.com/a/<code>/… and the catalog itself (…/api/open/v1/<code>/…).
  let code: string | undefined;
  if (seg[0] === 'api' && seg[1] === 'open') code = seg[3];
  else if (seg[0] === 'portal' || seg[0] === 'a') code = seg[1];
  else if (/^portal\./i.test(u.hostname)) code = seg[0];
  return code && /^[a-z0-9_-]{2,60}$/i.test(code) ? code.toLowerCase() : null;
}
export function iclassproCatalogUrl(code: string, kind: 'classes' | 'camps' = 'classes'): string {
  return `https://app.iclasspro.com/api/open/v1/${encodeURIComponent(code)}/${kind}?limit=200`;
}

const SKIP_PATH = /login|log-in|signin|sign-in|account|password|cart|checkout|privacy|terms|\.(js|css|png|jpe?g|gif|svg|ico|woff2?)$/i;
const SCHEDULEISH = /schedul|class|camp|session|regist|enrol|sign ?up|book|program|lesson|calendar|openings|availab/i;

/**
 * Booking-system widgets and links on a provider's pages, most useful first:
 * embedded frames/scripts, then links that look like a schedule or signup,
 * then other links to a known system. One entry per readable URL; systems
 * seen only as a script we can't convert are reported with url null.
 */
export function findWidgets(pages: { links: Link[]; embeds: string[] }[], max = 2): Widget[] {
  const ranked: { w: Widget; score: number }[] = [];
  const seenUrl = new Set<string>();
  const seenPlatformNoUrl = new Set<string>();

  const consider = (raw: string, from: 'embed' | 'link', text: string) => {
    const p = platformFor(raw);
    if (!p) return;
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return;
    }
    const icode = iclassproCode(u);
    if (icode) {
      const url = iclassproCatalogUrl(icode);
      if (seenUrl.has(url)) return;
      seenUrl.add(url);
      ranked.push({ w: { platform: p.name, url, from, reader: 'iclasspro' }, score: 20 });
      return;
    }
    if (p.name === 'iClassPro') {
      // e.g. a "Powered by iClassPro" link to their marketing site: no business code to read.
      if (!seenPlatformNoUrl.has(p.name)) {
        seenPlatformNoUrl.add(p.name);
        ranked.push({ w: { platform: p.name, url: null, from }, score: -1 });
      }
      return;
    }
    const direct = jackrabbitDirect(u) ?? sawyerSchedules(u);
    let url: string | null = direct;
    if (!url) {
      const isScript = /\.js$/i.test(u.pathname) || /\/OpeningsJS$/i.test(u.pathname);
      url = isScript || SKIP_PATH.test(u.pathname) ? null : (u.hash = '', u.toString());
    }
    if (url) {
      if (seenUrl.has(url)) return;
      seenUrl.add(url);
      const score = (from === 'embed' ? 10 : 0) + (direct ? 5 : 0) + (SCHEDULEISH.test(`${u.pathname} ${text}`) ? 3 : 0);
      ranked.push({ w: { platform: p.name, url, from, text: text || undefined }, score });
    } else if (!seenPlatformNoUrl.has(p.name)) {
      seenPlatformNoUrl.add(p.name);
      ranked.push({ w: { platform: p.name, url: null, from }, score: -1 });
    }
  };

  for (const page of pages) {
    for (const e of page.embeds) consider(e, 'embed', '');
    for (const l of page.links) consider(l.url, 'link', l.text);
  }
  const sorted = ranked.sort((a, b) => b.score - a.score).map((r) => r.w);
  const readable = sorted.filter((w) => w.url).slice(0, max);
  const named = sorted.filter((w) => !w.url && !readable.some((r) => r.platform === w.platform));
  return [...readable, ...named];
}

/** "Jackrabbit", "Jackrabbit and iClassPro", "Jackrabbit, iClassPro and Sawyer" */
export function platformList(names: string[]): string {
  const u = [...new Set(names)];
  return u.length <= 1 ? (u[0] ?? '') : `${u.slice(0, -1).join(', ')} and ${u[u.length - 1]}`;
}

// ── Turning a JSON catalog into plain text for the AI ────────────────────────

const DAY_FULL: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
};
const str = (v: unknown): string => (v == null ? '' : typeof v === 'string' ? v.trim() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');
/** "2026-09-08T00:00:00" → "2026-09-08"; other strings unchanged. */
const day = (v: unknown) => str(v).replace(/T00:00:00(\.0+)?Z?$/, '');

function ageText(r: Record<string, unknown>): string {
  const lo = str(r.minAgeYear) || str(r.minAge);
  const hi = str(r.maxAgeYear) || str(r.maxAge);
  if (!lo && !hi) return '';
  return `Ages ${lo || '?'}–${hi || '?'}`;
}

function scheduleText(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return v
    .map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      const d = str(r.dayName) || DAY_FULL[str(r.dayNumber)] || '';
      const t = [str(r.startTime), str(r.endTime)].filter(Boolean).join('–');
      return [d, t].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * One line per class/camp: "Name | Mon 4:00 PM–4:45 PM | 2026-09-08 to 2026-12-20 | Ages 3–5 | Registration 2026-08-01 to 2026-09-01".
 * Openings counts are left out on purpose: they change daily (which would
 * re-run the AI every day) and some businesses choose not to show them.
 */
export function iclassproRows(json: unknown): Record<string, unknown>[] {
  const env = (json ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(env.data) ? env.data : Array.isArray(json) ? (json as unknown[]) : [];
  return rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
}
export function iclassproTotal(json: unknown): number {
  const n = Number(((json ?? {}) as Record<string, unknown>).totalRecords);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function iclassproToText(json: unknown, heading: string, opts: { today?: string; total?: number } = {}): string {
  const rows = iclassproRows(json);
  const soon = opts.today ? addDays(opts.today, 14) : '';
  const lines: string[] = [];
  for (const r of rows.slice(0, 300)) {
    const name = str(r.name) || str(r.title);
    if (!name) continue;
    // An ongoing class has no end date, and its "start date" is just its next
    // meeting (it moves every week). Show a start only when it's a real
    // future start, so ongoing classes read as weekly and the text is stable.
    const start = day(r.startDate);
    const end = day(r.endDate);
    const dates = start && end ? `${start} to ${end}` : start && soon && start > soon ? `starts ${start}` : end ? `until ${end}` : '';
    const reg = [day(r.regStartDate), day(r.regEndDate)].filter(Boolean).join(' to ');
    const parts = [
      name,
      scheduleText(r.schedule),
      dates,
      ageText(r),
      str(r.tuition) ? `Tuition ${str(r.tuition).replace(/(\.\d\d)00$/, '$1')}${str(r.tuitionTerm) ? ` ${str(r.tuitionTerm)}` : ''}` : '',
      reg ? `Registration ${reg}` : '',
    ].filter(Boolean);
    lines.push(parts.join(' | '));
  }
  if (!lines.length) return '';
  const more = opts.total && opts.total > lines.length ? `\n(Showing ${lines.length} of ${opts.total}; the rest are on the provider’s booking page.)` : '';
  return `${heading}\n${lines.join('\n')}${more}`;
}
