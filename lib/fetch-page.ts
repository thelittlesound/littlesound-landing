// Server-only: fetches provider web pages for the date agent.
//
// Polite: identifies itself, honors robots.txt, one listing at a time.
// Safe: listing websites can be typed in by providers, so a "website" could
// point at an internal address. Only public http(s) URLs on standard ports
// are fetched, and every redirect hop is re-checked.

export const BOT_UA = 'LittleSoundBot/1.0 (+https://www.thelittlesound.com; hello@thelittlesound.com)';
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;

export interface Link {
  url: string;
  text: string;
}
export interface FetchedPage {
  url: string; // final URL after redirects
  text: string;
  links: Link[];
  /** src of <iframe>/<script> tags: where booking widgets usually live. */
  embeds: string[];
}
export type FetchResult = FetchedPage | { error: string };

// ── URL safety ───────────────────────────────────────────────────────────────

function isPrivateIPv4(h: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** A parsed URL if it's safe to fetch (public http/https, default port), else null. */
export function safeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.')) return null; // "localhost", bare intranet names
  if (/(^|\.)(localhost|local|internal|intranet|lan|home\.arpa)$/.test(host)) return null;
  if (host.startsWith('[') || host.includes(':')) return null; // IPv6 literals: not needed for provider sites
  if (isPrivateIPv4(host)) return null;
  u.hash = '';
  return u;
}

// ── robots.txt ───────────────────────────────────────────────────────────────

/** Disallow/Allow rules for our bot (or "*") from a robots.txt body. */
export function parseRobots(body: string): { allow: string[]; disallow: string[] } {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], allow: [], disallow: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'disallow' && val) cur.disallow.push(val);
    if (key === 'allow' && val) cur.allow.push(val);
  }
  const ours = groups.find((g) => g.agents.some((a) => a.includes('littlesoundbot')));
  const star = groups.find((g) => g.agents.includes('*'));
  const g = ours ?? star;
  return { allow: g?.allow ?? [], disallow: g?.disallow ?? [] };
}

// RFC 9309 matching: rules match from the start of path+query, "*" matches
// any run of characters, a trailing "$" anchors the end. The longest matching
// rule wins and Allow wins ties. (Squarespace's default robots.txt has rules
// like "/*?author=*", which must only block author-filtered URLs.)
function ruleMatches(rule: string, target: string): boolean {
  const anchored = rule.endsWith('$');
  const body = anchored ? rule.slice(0, -1) : rule;
  const re = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${re}${anchored ? '$' : ''}`).test(target);
}

export function robotsAllows(rules: { allow: string[]; disallow: string[] }, path: string): boolean {
  const longest = (list: string[]) =>
    list.filter((r) => ruleMatches(r, path)).sort((a, b) => b.length - a.length)[0];
  const dis = longest(rules.disallow);
  if (!dis) return true;
  const allow = longest(rules.allow);
  return !!allow && allow.length >= dis.length;
}

const robotsCache = new Map<string, { allow: string[]; disallow: string[] }>();

async function robotsFor(origin: string) {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let rules = { allow: [] as string[], disallow: [] as string[] };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': BOT_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) rules = parseRobots((await res.text()).slice(0, 200_000));
  } catch {
    // no robots.txt reachable → nothing is disallowed
  }
  robotsCache.set(origin, rules);
  return rules;
}

// ── HTML → text and links ───────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', bull: '•', middot: '·', copy: '©',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n• ')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer|ul|ol|table|blockquote)>/gi, '\n')
      .replace(/<(td|th)\b[^>]*>/gi, ' | ')
      .replace(/<[^>]+>/g, ' ')
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractLinks(html: string, base: string): Link[] {
  const out: Link[] = [];
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = decodeEntities((m[1] ?? m[2] ?? m[3] ?? '').trim());
    if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const u = new URL(href, base);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      u.hash = '';
      out.push({ url: u.toString(), text: htmlToText(m[4]).replace(/\s+/g, ' ').slice(0, 120) });
    } catch {
      // unparseable href
    }
  }
  return out;
}

export function extractEmbeds(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /<(?:iframe|script)\b[^>]*?\s(?:data-)?src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = decodeEntities((m[1] ?? m[2] ?? m[3] ?? '').trim());
    if (!src) continue;
    try {
      const u = new URL(src, base);
      if (u.protocol === 'http:' || u.protocol === 'https:') out.add(u.toString());
    } catch {
      // unparseable src
    }
  }
  return [...out].slice(0, 200);
}

// ── Finding the schedule pages ──────────────────────────────────────────────

const GOOD: [RegExp, number][] = [
  [/camp/, 5], [/summer|winter|spring break|mid-?winter|holiday/, 3], [/schedule|calendar|session|dates/, 4],
  [/class|lesson|program|course/, 3], [/regist|enroll|sign-?up/, 3], [/youth|kid|child|teen|junior/, 2],
];
const BAD = /blog|news|press|about|contact|privacy|terms|career|job|donat|shop|store|cart|login|account|gallery|faq|policy|staff|team-member|rental|birthday-part/;
const FILE = /\.(pdf|jpe?g|png|gif|webp|zip|docx?|xlsx?|mp4|mov)$/i;

function bareHost(h: string): string {
  return h.toLowerCase().replace(/^www\./, '');
}

/** Up to `max` same-site links that most look like schedule/camp/registration pages. */
export function pickScheduleLinks(links: Link[], pageUrl: string, max = 3): string[] {
  const base = new URL(pageUrl);
  const seen = new Set([base.origin + base.pathname.replace(/\/$/, '')]);
  const scored: { url: string; score: number }[] = [];
  for (const l of links) {
    let u: URL;
    try {
      u = new URL(l.url);
    } catch {
      continue;
    }
    if (bareHost(u.hostname) !== bareHost(base.hostname)) continue; // same site only
    if (FILE.test(u.pathname)) continue;
    const key = u.origin + u.pathname.replace(/\/$/, '');
    if (seen.has(key)) continue;
    const hay = `${decodeURIComponent(u.pathname)} ${l.text}`.toLowerCase();
    if (BAD.test(u.pathname.toLowerCase())) continue;
    const score = GOOD.reduce((s, [re, w]) => (re.test(hay) ? s + w : s), 0);
    if (score > 0) {
      seen.add(key);
      scored.push({ url: u.origin + u.pathname + u.search, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max).map((s) => s.url);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

// Turns Node's network error codes into something an admin can act on.
function connectError(e: unknown): string {
  const cause = (e as { cause?: { code?: string } } | null)?.cause;
  const code = cause?.code ?? '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Could not connect: the web address doesn’t exist (check the listing’s website)';
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET') return 'Could not connect: the site refused the connection';
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_(VERIFY|GET)/.test(code)) {
    return 'Could not connect: the site’s security certificate is incomplete or invalid (browsers often work around this; paste the schedule in the Dates tab)';
  }
  if (code === 'UND_ERR_CONNECT_TIMEOUT') return 'The site took too long to respond';
  return code ? `Could not connect to the site (${code})` : 'Could not connect to the site';
}

// One polite, safe GET (URL safety + robots.txt on every redirect hop),
// returning the body as text. Shared by fetchPage (HTML) and fetchJson.
async function fetchRaw(
  raw: string,
  timeoutMs: number,
  accept: string
): Promise<{ url: URL; type: string; body: string } | { error: string }> {
  let url = safeUrl(raw);
  if (!url) return { error: 'Not a public web address' };

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Checked on every hop: a redirect can land on another site or path.
    const rules = await robotsFor(url.origin);
    if (!robotsAllows(rules, url.pathname + url.search)) {
      return { error: 'The site asks bots not to read this page (robots.txt)' };
    }
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { 'user-agent': BOT_UA, accept },
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { error: timedOut ? 'The site took too long to respond' : connectError(e) };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      const next = loc ? safeUrl(new URL(loc, url).toString()) : null;
      if (!next) return { error: 'The site redirected somewhere unsafe or invalid' };
      url = next;
      continue;
    }
    if (res.status === 403 || res.status === 429) return { error: `The site blocked automated reading (HTTP ${res.status})` };
    if (!res.ok) return { error: `The page returned HTTP ${res.status}` };

    const type = res.headers.get('content-type') ?? '';
    if (/pdf/i.test(type)) return { error: 'The schedule is a PDF (not read automatically yet)' };
    const buf = await res.arrayBuffer();
    const body = new TextDecoder('utf-8').decode(buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf);
    return { url, type, body };
  }
  return { error: 'Too many redirects' };
}

export async function fetchPage(raw: string, timeoutMs = 8000): Promise<FetchResult> {
  const r = await fetchRaw(raw, timeoutMs, 'text/html,text/plain;q=0.9,*/*;q=0.5');
  if ('error' in r) return r;
  if (!/text\/html|text\/plain|application\/xhtml/i.test(r.type)) {
    return { error: `Not a web page (${r.type || 'unknown type'})` };
  }
  const isHtml = !/text\/plain/i.test(r.type);
  const url = r.url.toString();
  return {
    url,
    text: isHtml ? htmlToText(r.body) : r.body,
    links: isHtml ? extractLinks(r.body, url) : [],
    embeds: isHtml ? extractEmbeds(r.body, url) : [],
  };
}

/** GET a public JSON document (booking-system catalogs), same safety rules as fetchPage. */
export async function fetchJson(raw: string, timeoutMs = 8000): Promise<{ url: string; data: unknown } | { error: string }> {
  const r = await fetchRaw(raw, timeoutMs, 'application/json');
  if ('error' in r) return r;
  if (!/json/i.test(r.type)) return { error: `Not JSON (${r.type || 'unknown type'})` };
  try {
    return { url: r.url.toString(), data: JSON.parse(r.body) };
  } catch {
    return { error: 'The response wasn’t valid JSON' };
  }
}
