// Server-only: family calendar data (service-role key) and the .ics feed.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { getDatesByActivity } from '@/lib/activity-dates-server';
import { seattleToday, type DateItem } from '@/lib/activity-dates';
import { SITE_URL } from '@/lib/site';
import { buildCalendar, type IcsEvent } from '@/lib/ics';
import {
  reconcile,
  registrationEvents,
  sessionEvent,
  type CalendarActivity,
} from '@/lib/family-calendar';

export interface PickRow {
  id: string;
  user_id: string;
  activity_id: string;
  session_key: string;
  item: DateItem;
  title: string | null;
  provider: string | null;
  status: 'active' | 'changed' | 'gone';
  change_note: string | null;
  created_at: string;
}

export const PICK_FIELDS = 'id, user_id, activity_id, session_key, item, title, provider, status, change_note, created_at';

// ── Feed link ───────────────────────────────────────────────────────────────

const newToken = () => randomBytes(24).toString('base64url'); // 32 chars, unguessable
export const TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/;

export function feedUrl(token: string): string {
  return `${SITE_URL}/api/calendar/${token}.ics`;
}

/** The family's feed token, created on first use. Null if the tables aren't set up yet. */
export async function getOrCreateFeedToken(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('family_calendar_feeds').select('token').eq('user_id', userId).maybeSingle();
  if (error) {
    console.error('family_calendar_feeds read error:', error);
    return null;
  }
  if (data?.token) return data.token as string;
  const token = newToken();
  const { error: insErr } = await supabaseAdmin
    .from('family_calendar_feeds')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (insErr) {
    console.error('family_calendar_feeds insert error:', insErr);
    return null;
  }
  // Re-read: a parallel request may have created it first.
  const { data: again } = await supabaseAdmin.from('family_calendar_feeds').select('token').eq('user_id', userId).maybeSingle();
  return (again?.token as string) ?? null;
}

/** New link; the old one stops working immediately. */
export async function resetFeedToken(userId: string): Promise<string | null> {
  const token = newToken();
  const { error } = await supabaseAdmin
    .from('family_calendar_feeds')
    .upsert({ user_id: userId, token, created_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) {
    console.error('family_calendar_feeds reset error:', error);
    return null;
  }
  return token;
}

// ── Saved activities + picks ────────────────────────────────────────────────

interface SavedRow {
  activity_id: string;
  title: string | null;
  provider: string | null;
  website: string | null;
  neighborhood: string | null;
}

export async function getSaved(userId: string): Promise<CalendarActivity[]> {
  const { data } = await supabaseAdmin
    .from('saved_activities')
    .select('activity_id, title, provider, website, neighborhood')
    .eq('user_id', userId);
  return ((data ?? []) as SavedRow[]).map((r) => ({
    activityId: r.activity_id,
    title: r.title ?? 'Activity',
    provider: r.provider,
    website: r.website,
    neighborhood: r.neighborhood,
  }));
}

export async function getPicks(userId: string): Promise<PickRow[]> {
  const { data, error } = await supabaseAdmin.from('calendar_picks').select(PICK_FIELDS).eq('user_id', userId);
  if (error) {
    console.error('calendar_picks read error:', error);
    return [];
  }
  return (data ?? []) as PickRow[];
}

// ── The feed ────────────────────────────────────────────────────────────────

/**
 * The family's calendar: every session they picked (following the listing's
 * current dates when a session moved) plus registration open/close reminders
 * for everything they saved. Only activities still saved are included.
 */
export async function buildFamilyFeed(userId: string, now = new Date()): Promise<string> {
  const today = seattleToday(now);
  const saved = await getSaved(userId);
  const byId = new Map(saved.map((s) => [s.activityId, s]));
  const picks = (await getPicks(userId)).filter((p) => p.status !== 'gone' && byId.has(p.activity_id));
  const dates = await getDatesByActivity(saved.map((s) => s.activityId));

  const events: IcsEvent[] = [];
  const seen = new Set<string>();
  for (const p of picks) {
    const a = byId.get(p.activity_id)!;
    const r = reconcile(p.item, dates.get(p.activity_id) ?? [], today);
    if (r.kind === 'past' || r.kind === 'gone') continue;
    const e = sessionEvent(a, r.item, userId, p.created_at.slice(0, 10));
    if (e && !seen.has(e.uid)) {
      seen.add(e.uid);
      events.push(e);
    }
  }
  for (const a of saved) events.push(...registrationEvents(a, dates.get(a.activityId) ?? [], userId, today));

  return buildCalendar({ name: 'Little Sound', events, now, refreshHours: 6 });
}

// ── Unsubscribe links ───────────────────────────────────────────────────────

function alertsSecret(): string | null {
  return process.env.ALERTS_SECRET || process.env.CRON_SECRET || null;
}

export function unsubscribeSignature(userId: string): string | null {
  const secret = alertsSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`unsubscribe:${userId}`).digest('base64url').slice(0, 32);
}

export function unsubscribeUrl(userId: string): string | null {
  const sig = unsubscribeSignature(userId);
  return sig ? `${SITE_URL}/api/families/alerts/unsubscribe?u=${encodeURIComponent(userId)}&t=${sig}` : null;
}

export function verifyUnsubscribe(userId: string, sig: string): boolean {
  const expected = unsubscribeSignature(userId);
  if (!expected || sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
