// What the daily family-alerts job should do for one family: which picked
// sessions moved or disappeared (and how to update them), and which emails
// are due. Pure: the cron route does the reading, writing and sending.

import type { DateItem } from './activity-dates';
import { describeItem } from './date-agent-logic';
import { reconcile, registrationAlerts, sessionKey, whenText, type CalendarActivity } from './family-calendar';
import { emailShell, esc } from './notify';

export interface PickLike {
  id: string;
  activity_id: string;
  session_key: string;
  item: DateItem;
  status: 'active' | 'changed' | 'gone';
}

export type PickUpdate =
  | { id: string; kind: 'changed'; item: DateItem; key: string; note: string }
  | { id: string; kind: 'gone' };

export interface Alert {
  /** Unique per family in family_alert_log. */
  key: string;
  kind: 'reg-soon' | 'reg-today' | 'changed' | 'gone';
  activity: CalendarActivity;
  text: string; // plain text, escaped when put in the email
}

export function planFamily(opts: {
  today: string;
  saved: CalendarActivity[];
  picks: PickLike[];
  dates: Map<string, DateItem[]>;
}): { updates: PickUpdate[]; alerts: Alert[] } {
  const { today, saved, picks, dates } = opts;
  const byId = new Map(saved.map((a) => [a.activityId, a]));
  const updates: PickUpdate[] = [];
  const alerts: Alert[] = [];

  for (const p of picks) {
    const a = byId.get(p.activity_id);
    if (!a || p.status === 'gone') continue; // unsaved since, or already reported
    const r = reconcile(p.item, dates.get(p.activity_id) ?? [], today);
    if (r.kind === 'changed') {
      const key = sessionKey(r.item);
      const was = describeItem(p.item, today);
      const now = describeItem(r.item, today);
      updates.push({ id: p.id, kind: 'changed', item: r.item, key, note: `Was ${was}` });
      alerts.push({
        key: `chg|${p.id}|${key}`,
        kind: 'changed',
        activity: a,
        text: `The session you added changed. It's now ${now} (it was ${was}). Your Little Sound calendar is already updated.`,
      });
    } else if (r.kind === 'gone') {
      updates.push({ id: p.id, kind: 'gone' });
      alerts.push({
        key: `gone|${p.id}`,
        kind: 'gone',
        activity: a,
        text: `The session you added (${describeItem(p.item, today)}) is no longer on their schedule, so we took it off your Little Sound calendar. It's worth checking with ${a.provider || 'the provider'}.`,
      });
    }
  }

  for (const a of saved) {
    for (const r of registrationAlerts(a.activityId, dates.get(a.activityId) ?? [], today)) {
      alerts.push({
        key: r.key,
        kind: r.stage === 'today' ? 'reg-today' : 'reg-soon',
        activity: a,
        text: `Registration opens ${whenText(r.date, r.time, today)}${r.label ? ` (${r.label})` : ''}.`,
      });
    }
  }
  return { updates, alerts };
}

const ORDER: Alert['kind'][] = ['reg-today', 'reg-soon', 'changed', 'gone'];

/** One email per family per day, covering every alert that's due. */
export function buildAlertEmail(opts: {
  firstName: string | null;
  alerts: Alert[];
  dashboardUrl: string;
  unsubscribeUrl: string | null;
}): { subject: string; html: string } {
  const alerts = [...opts.alerts].sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind));
  const one = alerts.length === 1 ? alerts[0] : null;
  const title = (a: Alert) => a.activity.title;
  const subject = one
    ? one.kind === 'reg-today'
      ? `Registration opens today: ${title(one)}`
      : one.kind === 'reg-soon'
      ? `Registration opens soon: ${title(one)}`
      : one.kind === 'changed'
      ? `Schedule change: ${title(one)}`
      : `No longer listed: ${title(one)}`
    : `${alerts.length} updates for your family's activities`;

  const items = alerts
    .map((a) => {
      const name = a.activity.website
        ? `<a href="${esc(a.activity.website)}" style="color:#0D5C6E;font-weight:600;">${esc(title(a))}</a>`
        : `<strong style="color:#1C3A4A;">${esc(title(a))}</strong>`;
      const by = a.activity.provider ? ` <span style="color:#7A9AAA;">· ${esc(a.activity.provider)}</span>` : '';
      return `<li style="margin:0 0 14px;">${name}${by}<br>${esc(a.text)}</li>`;
    })
    .join('');
  const hi = opts.firstName ? `Hi ${esc(opts.firstName)},` : 'Hi there,';
  const footer = opts.unsubscribeUrl
    ? `<p style="font-size:12px;color:#7A9AAA;margin-top:24px;">You're getting this because you saved these activities on Little Sound. <a href="${esc(opts.unsubscribeUrl)}" style="color:#7A9AAA;">Turn off these emails</a>.</p>`
    : '';
  const body = `<p>${hi}</p><p>Here's what's coming up for the activities you saved:</p><ul style="padding-left:18px;margin:16px 0;">${items}</ul>${footer}`;
  return {
    subject,
    html: emailShell(one && one.kind.startsWith('reg') ? 'Registration reminder' : 'Updates for your family', body, {
      label: 'Open your dashboard',
      href: opts.dashboardUrl,
    }),
  };
}
