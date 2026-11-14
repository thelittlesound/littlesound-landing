import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDatesByActivity } from '@/lib/activity-dates-server';
import { seattleToday } from '@/lib/activity-dates';
import { PICK_FIELDS, unsubscribeUrl, type PickRow } from '@/lib/family-calendar-server';
import { buildAlertEmail, planFamily, type PickUpdate } from '@/lib/family-alerts';
import type { CalendarActivity } from '@/lib/family-calendar';
import { sendEmail } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Daily family alerts, triggered by Vercel Cron (vercel.json) each morning
// after the date agent has run:
//   1. Picked sessions follow their listing's dates: a session that moved is
//      updated (and the family told); one that's gone is marked gone. This
//      runs for every family, so calendar feeds stay right even for families
//      who turned emails off.
//   2. One email per family (with email alerts on) covering registration
//      openings within a week / today and the changes above. Each alert is
//      logged in family_alert_log so it's never sent twice.
// Requires "Authorization: Bearer <CRON_SECRET>" (middleware lets /api/cron
// past the site password).
const STOP_SENDING_AFTER_MS = 45_000;

interface ProfileRow {
  id: string;
  first_name: string | null;
  email: string | null;
  email_alerts: boolean | null;
}
interface SavedRow {
  user_id: string;
  activity_id: string;
  title: string | null;
  provider: string | null;
  website: string | null;
  neighborhood: string | null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const today = seattleToday();

  const { data: savedRows, error: savedErr } = await supabaseAdmin
    .from('saved_activities')
    .select('user_id, activity_id, title, provider, website, neighborhood');
  if (savedErr) {
    console.error('family-alerts saved read error:', savedErr);
    return NextResponse.json({ error: 'Could not read saved activities' }, { status: 500 });
  }
  const { data: pickRows, error: picksErr } = await supabaseAdmin.from('calendar_picks').select(PICK_FIELDS);
  if (picksErr) {
    console.error('family-alerts picks read error (has supabase/family-calendar.sql been run?):', picksErr);
    return NextResponse.json({ error: 'Calendar tables missing' }, { status: 500 });
  }

  const savedByUser = new Map<string, CalendarActivity[]>();
  for (const r of (savedRows ?? []) as SavedRow[]) {
    const list = savedByUser.get(r.user_id) ?? [];
    list.push({ activityId: r.activity_id, title: r.title ?? 'Activity', provider: r.provider, website: r.website, neighborhood: r.neighborhood });
    savedByUser.set(r.user_id, list);
  }
  const picksByUser = new Map<string, PickRow[]>();
  for (const p of (pickRows ?? []) as PickRow[]) {
    const list = picksByUser.get(p.user_id) ?? [];
    list.push(p);
    picksByUser.set(p.user_id, list);
  }
  const userIds = [...savedByUser.keys()];
  if (!userIds.length) return NextResponse.json({ families: 0, emails: 0 });

  const activityIds = [...new Set(((savedRows ?? []) as SavedRow[]).map((r) => r.activity_id))];
  const dates = await getDatesByActivity(activityIds);

  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, email, email_alerts')
    .in('id', userIds);
  const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  let updated = 0;
  let emails = 0;
  let deferred = 0;
  for (const userId of userIds) {
    const plan = planFamily({ today, saved: savedByUser.get(userId) ?? [], picks: picksByUser.get(userId) ?? [], dates });

    // 1. Keep picks in step with the listing's dates.
    for (const u of plan.updates) {
      if (await applyUpdate(userId, u)) updated += 1;
    }

    // 2. Email, if they want it and anything new is due.
    const profile = profiles.get(userId);
    if (!profile?.email || profile.email_alerts === false || !plan.alerts.length) continue;
    const { data: logRows } = await supabaseAdmin
      .from('family_alert_log')
      .select('alert_key')
      .eq('user_id', userId)
      .in('alert_key', plan.alerts.map((a) => a.key));
    const sent = new Set(((logRows ?? []) as { alert_key: string }[]).map((r) => r.alert_key));
    const due = plan.alerts.filter((a) => !sent.has(a.key));
    if (!due.length) continue;
    if (Date.now() - started > STOP_SENDING_AFTER_MS) {
      deferred += 1; // "opens soon" alerts go out tomorrow instead
      continue;
    }

    const { subject, html } = buildAlertEmail({
      firstName: profile.first_name,
      alerts: due,
      dashboardUrl: `${SITE_URL}/families/dashboard`,
      unsubscribeUrl: unsubscribeUrl(userId),
    });
    const ok = await sendEmail({ to: profile.email, toName: profile.first_name ?? '', subject, html });
    if (!ok) continue; // not logged, so it's tried again tomorrow
    emails += 1;
    const { error: logErr } = await supabaseAdmin
      .from('family_alert_log')
      .upsert(due.map((a) => ({ user_id: userId, alert_key: a.key })), { onConflict: 'user_id,alert_key', ignoreDuplicates: true });
    if (logErr) console.error('family_alert_log insert error:', logErr);
  }

  return NextResponse.json({ families: userIds.length, picksUpdated: updated, emails, deferred });
}

async function applyUpdate(userId: string, u: PickUpdate): Promise<boolean> {
  if (u.kind === 'gone') {
    const { error } = await supabaseAdmin.from('calendar_picks').update({ status: 'gone', updated_at: new Date().toISOString() }).eq('id', u.id).eq('user_id', userId);
    if (error) console.error('pick gone update error:', error);
    return !error;
  }
  const { error } = await supabaseAdmin
    .from('calendar_picks')
    .update({ item: u.item, session_key: u.key, status: 'changed', change_note: u.note, updated_at: new Date().toISOString() })
    .eq('id', u.id)
    .eq('user_id', userId);
  if (error) {
    // The family already added the new time separately (same key): drop the old pick.
    if (error.code === '23505') {
      await supabaseAdmin.from('calendar_picks').delete().eq('id', u.id).eq('user_id', userId);
      return true;
    }
    console.error('pick change update error:', error);
    return false;
  }
  return true;
}
