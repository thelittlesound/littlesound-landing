import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { type DatesListing } from '@/lib/activity-dates-server';
import {
  fetchJson, fetchPage, fetchPdfPages, listingTerms, pickPdfLinks, pickScheduleLinks, selectPdfPages, type FetchedPage,
} from '@/lib/fetch-page';
import { findWidgets, iclassproRows, iclassproToText, iclassproTotal, platformList, type Widget } from '@/lib/booking-widgets';
import { extractDates, type OtherProgram } from '@/lib/extract-dates';
import { seattleToday, type DateItem } from '@/lib/activity-dates';
import {
  AGENT, decide, dedupeKey, excerptOnPage, isAgentApproval, isPast, normalizeForMatch, sameProviderTitles,
} from '@/lib/date-agent-logic';

// Server-only. The date agent: for one listing, read its website, find the
// schedule pages, have Claude extract the dates, verify every date's quote is
// really on the page, then publish / park for review / skip — and suggest any
// other kids' programs it found. Records what it saw in listing_sources so an
// unchanged site skips the AI next time.

export type AgentStatus = 'published' | 'review' | 'unchanged' | 'no_dates' | 'unreadable' | 'error' | 'skipped';

export interface AgentResult {
  activityId: string;
  title: string;
  status: AgentStatus;
  message: string;
  suggestions: number;
}

const MIN_TEXT = 300;
const EXTRA_PAGES = 3;
const WIDGET_PAGES = 2; // booking-system pages read per listing
const WIDGET_MIN_TEXT = 200; // less than this = the widget page needs JavaScript too
const PDF_FILES = 2; // schedule PDFs (brochures, lesson grids) read per listing
const PDF_CHARS = 16_000; // of each PDF, the pages most about this listing
const AI_CHARS = 48_000; // total page text sent to the AI
const FOCUSED_CHARS = 36_000; // of that, for booking-system pages + PDFs
const DATE_FIELDS = 'kind, label, start_date, end_date, days_of_week, start_time, end_time, location, notes, source_excerpt, approved_by';

async function record(activityId: string, fields: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('listing_sources')
    .upsert({ activity_id: activityId, last_checked_at: new Date().toISOString(), ...fields });
  if (error) console.error('listing_sources upsert error:', activityId, error);
}

async function clearPendingDraft(activityId: string) {
  await supabaseAdmin.from('date_drafts').delete().eq('activity_id', activityId).eq('status', 'pending');
}

export async function checkListing(
  listing: DatesListing,
  opts: { catalog: DatesListing[]; force?: boolean }
): Promise<AgentResult> {
  const id = listing.activityId;
  const done = async (status: AgentStatus, message: string, fields: Record<string, unknown> = {}, suggestions = 0) => {
    await record(id, { last_status: status, last_message: message, ...fields });
    return { activityId: id, title: listing.title, status, message, suggestions };
  };

  if (!listing.website) return done('skipped', 'This listing has no website');

  // ── 1. Read the site: the listing's page plus its likeliest schedule pages ──
  const today = seattleToday();
  const readPdfs = async (urls: string[]): Promise<FetchedPage[]> =>
    (await Promise.all(urls.map((u) => readPdf(u, listing)))).filter((p): p is FetchedPage => !('error' in p));

  let home = await fetchPage(listing.website);
  if ('error' in home && home.pdf) home = await readPdf(listing.website, listing); // the listing's page is itself a PDF
  if ('error' in home) return done('unreadable', home.error);
  const homeIsPdf = /\.pdf$/i.test(new URL(home.url).pathname) && home.links.length === 0;

  // Schedule pages on their site, and (in parallel) any booking system the
  // home page embeds or links to. Widgets found only on the schedule pages
  // are read after, if the home page had none.
  // Schedule PDFs (brochures, lesson grids) are read the same way: the home
  // page's first, otherwise ones linked from the schedule pages.
  const links = pickScheduleLinks(home.links, home.url, EXTRA_PAGES);
  const homeWidgets = findWidgets([home], WIDGET_PAGES);
  const homePdfLinks = pickPdfLinks(home.links, home.url, today, PDF_FILES);
  const [extra, homeWidgetPages, homePdfs] = await Promise.all([
    Promise.all(links.map((u) => fetchPage(u))),
    readWidgets(homeWidgets),
    readPdfs(homePdfLinks),
  ]);
  const extraPages = extra.filter((p): p is FetchedPage => !('error' in p));
  const sitePages = [home, ...extraPages];
  let widgets = homeWidgets;
  let widgetPages = homeWidgetPages;
  let pdfPages = homePdfs;
  const needWidgets = !homeWidgets.some((w) => w.url);
  const needPdfs = homePdfs.length === 0;
  if (needWidgets || needPdfs) {
    if (needWidgets) widgets = findWidgets(sitePages, WIDGET_PAGES);
    const morePdfLinks = needPdfs
      ? pickPdfLinks(extraPages.flatMap((p) => p.links), home.url, today, PDF_FILES).filter((u) => !homePdfLinks.includes(u))
      : [];
    const [w, p] = await Promise.all([needWidgets ? readWidgets(widgets) : widgetPages, readPdfs(morePdfLinks)]);
    widgetPages = w;
    if (needPdfs) pdfPages = p;
  }
  // Focused sources (booking-system pages, PDFs) go right after the home page.
  const focused = [...widgetPages.read, ...pdfPages, ...(homeIsPdf ? [home] : [])];
  const pages = [home, ...widgetPages.read, ...pdfPages, ...extraPages].filter((p) => p.text.length >= 50);
  const checked_urls = pages.map((p) => p.url);
  // Booking systems we saw but couldn't read (needs JavaScript, blocked, …).
  const unreadWidgets = widgets
    .filter((w) => !w.url || widgetPages.failed.includes(w.url))
    .filter((w) => !widgetPages.read.some((p) => p.platform === w.platform));
  // Say why, so a fixable cause (a link form we don't know yet) is visible.
  const whyUnread = unreadWidgets.map((w) => (w.url ? widgetPages.why[w.url] : '') || 'no link to this business’s schedule there')[0];
  const widgetHint = unreadWidgets.length
    ? `Its schedule seems to be in ${platformList(unreadWidgets.map((w) => w.platform))}, which the agent couldn’t read (${whyUnread}). Paste it in the Dates tab.`
    : '';

  const totalText = pages.reduce((n, p) => n + p.text.length, 0);
  if (totalText < MIN_TEXT) {
    return done(
      'unreadable',
      widgetHint || 'The site shows almost no text to a reader like ours (it may need JavaScript). Paste its schedule in the Dates tab.',
      { checked_urls }
    );
  }

  // ── 2. Unchanged since last time? Skip the AI. ─────────────────────────────
  const page_hash = createHash('sha256').update(pages.map((p) => `${p.url}\n${p.text}`).join('\n\n')).digest('hex');
  const { data: prev } = await supabaseAdmin
    .from('listing_sources')
    .select('page_hash, last_status, last_message')
    .eq('activity_id', id)
    .maybeSingle();
  const changed = !prev || prev.page_hash !== page_hash;
  // Unchanged, no dates last time, and a booking system we can't read: the
  // schedule is in there, so it needs a hand (no point asking the AI again).
  if (!opts.force && !changed && ['unreadable', 'no_dates'].includes(prev?.last_status ?? '') && widgetHint) {
    return done('unreadable', widgetHint, { page_hash, checked_urls });
  }
  if (!opts.force && !changed && ['published', 'unchanged', 'no_dates', 'review'].includes(prev?.last_status ?? '')) {
    const keep = prev!.last_status === 'review' ? 'review' : 'unchanged';
    return done(keep, keep === 'review' ? 'Still waiting for your review (site unchanged)' : 'Site unchanged since last check', { page_hash, checked_urls });
  }
  const changeFields = { page_hash, checked_urls, ...(changed ? { last_changed_at: new Date().toISOString() } : {}) };

  // ── 3. Extract ─────────────────────────────────────────────────────────────
  const ext = await extractDates({
    pages: fitPages(pages, focused),
    listing,
    today,
    knownTitles: sameProviderTitles(listing, opts.catalog),
  });
  // Don't store the hash on failure, so the next check retries the AI.
  if ('error' in ext) return done('error', ext.error, { checked_urls });

  // ── 4. Verify and decide ────────────────────────────────────────────────────
  const normalizedPage = normalizeForMatch(pages.map((p) => p.text).join('\n'));
  const kept = ext.items.map((it, i) => ({ it, y: ext.yearInferred[i] })).filter((x) => !isPast(x.it, today));
  const items = kept.map((x) => x.it);
  const yearInferred = kept.map((x) => x.y);
  const verified = items.map((it) => excerptOnPage(it.source_excerpt, normalizedPage));

  const { data: curRows } = await supabaseAdmin.from('activity_dates').select(DATE_FIELDS).eq('activity_id', id);
  const currentAll = ((curRows ?? []) as (DateItem & { approved_by: string | null })[]).filter((c) => !isPast(c, today));
  const current: DateItem[] = currentAll.map(({ approved_by, ...c }) => c);
  const currentHumanEdited = currentAll.some((c) => !isAgentApproval(c.approved_by));

  const decision = decide({ items, yearInferred, verified, warnings: ext.warnings, current, currentHumanEdited, today });

  // ── 5. Act ─────────────────────────────────────────────────────────────────
  let status: AgentStatus;
  if (decision.action === 'publish') {
    const { error } = await supabaseAdmin.rpc('replace_activity_dates', {
      p_activity_id: id,
      p_items: items,
      p_source_url: pages[0].url,
      p_approved_by: AGENT,
    });
    if (error) {
      console.error('agent publish error:', id, error);
      return done('error', 'Found dates but could not save them', { checked_urls });
    }
    await clearPendingDraft(id);
    status = 'published';
  } else if (decision.action === 'review') {
    await clearPendingDraft(id);
    const { error } = await supabaseAdmin.from('date_drafts').insert({
      activity_id: id,
      items,
      // Doubts first, then FYI notes; the reason already quotes the first doubt.
      warnings: [...ext.warnings, ...ext.notes],
      reason: decision.reason,
      source_urls: checked_urls,
    });
    if (error) console.error('date_drafts insert error:', id, error);
    status = 'review';
  } else {
    await clearPendingDraft(id); // anything still pending is out of date now
    status = decision.action === 'noop' ? 'unchanged' : 'no_dates';
  }
  // No dates found, but we saw a booking system we couldn't read: that's
  // where the schedule is, so this listing needs a hand (Dates tab paste).
  let reason = decision.reason;
  if (status === 'no_dates' && widgetHint) {
    status = 'unreadable';
    reason = widgetHint;
  }

  const suggestions = await saveSuggestions(listing, ext.otherPrograms, pages[0].url, opts.catalog, today);
  const fyi = status === 'published' && ext.notes.length ? ` · Note: ${ext.notes[0]}`.slice(0, 300) : '';
  const note = suggestions ? ` · ${suggestions} new program${suggestions === 1 ? '' : 's'} suggested` : '';
  return done(status, reason + fyi + note, changeFields, suggestions);
}

async function saveSuggestions(
  listing: DatesListing,
  programs: OtherProgram[],
  fallbackUrl: string,
  catalog: DatesListing[],
  today: string
): Promise<number> {
  const existing = new Set(catalog.map((l) => dedupeKey(l.business, l.title)));
  let added = 0;
  for (const p of programs) {
    const key = dedupeKey(listing.business, p.title);
    if (existing.has(key)) continue; // already a listing
    const { data, error } = await supabaseAdmin
      .from('suggested_listings')
      .upsert(
        {
          dedupe_key: key,
          found_on: listing.activityId,
          business: listing.business,
          title: p.title,
          category: p.category,
          subcategory: p.subcategory,
          age_min: p.age_min,
          age_max: p.age_max,
          price: p.price,
          price_unit: p.price_unit,
          description: p.description,
          website: p.page_url ?? fallbackUrl,
          neighborhood: listing.neighborhood,
          items: p.items.filter((i) => !isPast(i, today)),
        },
        { onConflict: 'dedupe_key', ignoreDuplicates: true } // never re-suggest, even if dismissed
      )
      .select('id');
    if (error) console.error('suggested_listings upsert error:', key, error);
    else added += (data ?? []).length;
  }
  return added;
}

// Reads booking-system pages. A page with almost no text needs JavaScript
// (or is an error page) and counts as failed.
async function readWidgets(
  widgets: Widget[]
): Promise<{ read: (FetchedPage & { platform: string })[]; failed: string[]; why: Record<string, string> }> {
  const targets = widgets.filter((w): w is Widget & { url: string } => !!w.url);
  const results = await Promise.all(targets.map((w) => (w.reader === 'iclasspro' ? readIclassPro(w.url) : fetchPage(w.url, 6000))));
  const read: (FetchedPage & { platform: string })[] = [];
  const failed: string[] = [];
  const why: Record<string, string> = {};
  results.forEach((r, i) => {
    const t = targets[i];
    // A dedicated reader's text is already just the schedule, so a short one is fine.
    const tooShort = !('error' in r) && r.text.length < (t.reader ? 20 : WIDGET_MIN_TEXT);
    if ('error' in r || tooShort) {
      failed.push(t.url);
      const reason = 'error' in r ? r.error : t.reader ? 'its class list came back empty' : 'its page needs JavaScript';
      why[t.url] = reason.replace(/^The /, 'the ').replace(/\.$/, '').slice(0, 120);
    } else read.push({ ...r, platform: t.platform });
  });
  return { read, failed, why };
}

// iClassPro's public catalog: classes plus camps (camps is optional; many
// gyms have none). Rendered as plain lines the AI can read and quote.
async function readIclassPro(classesUrl: string): Promise<FetchedPage | { error: string }> {
  const campsUrl = classesUrl.replace(/\/classes\?/, '/camps?');
  const [classes, camps] = await Promise.all([iclassproAll(classesUrl), iclassproAll(campsUrl)]);
  if ('error' in classes) return classes;
  const today = seattleToday();
  const text = [
    iclassproToText({ data: classes.rows }, 'Classes (from the iClassPro parent portal):', { today, total: classes.total }),
    'error' in camps ? '' : iclassproToText({ data: camps.rows }, 'Camps (from the iClassPro parent portal):', { today, total: camps.total }),
  ]
    .filter(Boolean)
    .join('\n\n');
  return { url: classes.url, text, links: [], embeds: [] };
}

// The catalog comes ~19 records at a time whatever page size is asked for
// (seen 2026-11: 139 classes at one swim school, 535 at another), so read
// the following pages too, up to a cap. Records are de-duplicated by id in
// case the page number is ignored as well.
const ICLASS_MAX_PAGES = 8;
async function iclassproAll(
  url: string
): Promise<{ url: string; rows: Record<string, unknown>[]; total: number } | { error: string }> {
  const first = await fetchJson(url, 6000);
  if ('error' in first) return first;
  const rows = iclassproRows(first.data);
  const total = Math.max(iclassproTotal(first.data), rows.length);
  if (rows.length > 0 && total > rows.length) {
    const pages = Math.min(Math.ceil(total / rows.length), ICLASS_MAX_PAGES);
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => fetchJson(`${url}&page=${i + 2}`, 6000))
    );
    const seen = new Set(rows.map((r) => String(r.id ?? JSON.stringify(r))));
    for (const page of rest) {
      if ('error' in page) continue;
      for (const r of iclassproRows(page.data)) {
        const key = String(r.id ?? JSON.stringify(r));
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(r);
        }
      }
    }
  }
  return { url: first.url, rows, total };
}

// A schedule PDF as a page: only the PDF pages most about this listing (a
// city-wide brochure runs 50+ pages), marked "[PDF page N]".
async function readPdf(url: string, listing: DatesListing): Promise<FetchedPage | { error: string }> {
  const pdf = await fetchPdfPages(url);
  if ('error' in pdf) return pdf;
  return { url: pdf.url, text: selectPdfPages(pdf.pages, listingTerms(listing), PDF_CHARS), links: [], embeds: [] };
}

/**
 * Fits the pages into the AI's budget so nothing important is cut off the end:
 * focused sources (booking-system pages, PDFs) share FOCUSED_CHARS, and the
 * site's own pages share what's left. No-op when everything already fits.
 */
export function fitPages(pages: FetchedPage[], focused: FetchedPage[]): { url: string; text: string }[] {
  const total = pages.reduce((n, p) => n + p.text.length, 0);
  if (total <= AI_CHARS) return pages.map((p) => ({ url: p.url, text: p.text }));
  const isFocused = (p: FetchedPage) => focused.includes(p);
  const f = pages.filter(isFocused);
  const others = pages.filter((p) => !isFocused(p));
  const perFocused = f.length ? Math.floor(FOCUSED_CHARS / f.length) : 0;
  const focusedUsed = f.reduce((n, p) => n + Math.min(p.text.length, perFocused), 0);
  const perOther = others.length ? Math.max(3_000, Math.floor((AI_CHARS - focusedUsed) / others.length)) : 0;
  return pages.map((p) => ({ url: p.url, text: p.text.slice(0, isFocused(p) ? perFocused : perOther) }));
}
