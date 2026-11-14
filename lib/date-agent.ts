import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { type DatesListing } from '@/lib/activity-dates-server';
import { fetchPage, pickScheduleLinks, type FetchedPage } from '@/lib/fetch-page';
import { extractDates, type OtherProgram } from '@/lib/extract-dates';
import { seattleToday, type DateItem } from '@/lib/activity-dates';
import {
  AGENT, decide, dedupeKey, excerptOnPage, isAgentApproval, isPast, normalizeForMatch,
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
  const home = await fetchPage(listing.website);
  if ('error' in home) return done('unreadable', home.error);

  const links = pickScheduleLinks(home.links, home.url, EXTRA_PAGES);
  const extra = await Promise.all(links.map((u) => fetchPage(u)));
  const pages = [home, ...extra.filter((p): p is FetchedPage => !('error' in p))].filter((p) => p.text.length >= 50);
  const checked_urls = pages.map((p) => p.url);
  const totalText = pages.reduce((n, p) => n + p.text.length, 0);
  if (totalText < MIN_TEXT) {
    return done('unreadable', 'The site shows almost no text to a reader like ours (it may need JavaScript). Paste its schedule in the Dates tab.', { checked_urls });
  }

  // ── 2. Unchanged since last time? Skip the AI. ─────────────────────────────
  const page_hash = createHash('sha256').update(pages.map((p) => `${p.url}\n${p.text}`).join('\n\n')).digest('hex');
  const { data: prev } = await supabaseAdmin
    .from('listing_sources')
    .select('page_hash, last_status')
    .eq('activity_id', id)
    .maybeSingle();
  const changed = !prev || prev.page_hash !== page_hash;
  if (!opts.force && !changed && ['published', 'unchanged', 'no_dates', 'review'].includes(prev?.last_status ?? '')) {
    const keep = prev!.last_status === 'review' ? 'review' : 'unchanged';
    return done(keep, keep === 'review' ? 'Still waiting for your review (site unchanged)' : 'Site unchanged since last check', { page_hash, checked_urls });
  }
  const changeFields = { page_hash, checked_urls, ...(changed ? { last_changed_at: new Date().toISOString() } : {}) };

  // ── 3. Extract ─────────────────────────────────────────────────────────────
  const today = seattleToday();
  const ext = await extractDates({ pages: pages.map((p) => ({ url: p.url, text: p.text })), listing, today });
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

  const suggestions = await saveSuggestions(listing, ext.otherPrograms, pages[0].url, opts.catalog, today);
  const fyi = status === 'published' && ext.notes.length ? ` · Note: ${ext.notes[0]}`.slice(0, 300) : '';
  const note = suggestions ? ` · ${suggestions} new program${suggestions === 1 ? '' : 's'} suggested` : '';
  return done(status, decision.reason + fyi + note, changeFields, suggestions);
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
