import { registrationAlerts } from '@/lib/family-calendar';
import { buildAlertEmail, planFamily } from '@/lib/family-alerts';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const it = (o: any) => ({ kind: 'registration', label: null, start_date: null, end_date: null, days_of_week: null, start_time: null, end_time: null, location: null, notes: null, source_excerpt: 'x', ...o });
const reg = [it({ start_date: '2026-11-20', start_time: '09:00' })];
const R = new Set(['90|2026-11-20']);
const st = (today: string, rem?: Set<string>) => registrationAlerts('90', reg as any, today, rem).map((a) => `${a.stage}${a.explicit ? '*' : ''}`).join(',');

ok(st('2026-11-13') === 'soon' && st('2026-11-19') === 'soon' && st('2026-11-20') === 'today' && st('2026-11-12') === '', 'no reminder: soon (within 7 days) + today');
ok(st('2026-11-13', R) === 'soon*' && st('2026-11-19', R) === 'eve*' && st('2026-11-20', R) === 'today*', 'with "Remind me": day before is the reminder, then morning of');
const keys = ['2026-11-13', '2026-11-19', '2026-11-20'].map((d) => registrationAlerts('90', reg as any, d, R)[0].key);
ok(new Set(keys).size === 3, 'soon / eve / today each have their own key (each sent once)');
ok(registrationAlerts('90', reg as any, '2026-11-19', new Set(['90|2026-11-21'])).every((a) => !a.explicit), 'a reminder for another date does not count');

const act = { activityId: '90', title: 'Ski Camp', provider: 'Snoqualmie', website: 'https://x.example', neighborhood: null };
const plan = planFamily({ today: '2026-11-19', saved: [act], picks: [], dates: new Map([['90', reg as any]]), reminders: R });
ok(plan.alerts.length === 1 && plan.alerts[0].kind === 'reg-eve' && plan.alerts[0].explicit === true && /tomorrow at 9am/.test(plan.alerts[0].text), 'planner: day-before reminder: ' + plan.alerts[0]?.text);
const e = buildAlertEmail({ firstName: 'Kelly', alerts: plan.alerts, dashboardUrl: 'd', unsubscribeUrl: 'u' });
ok(e.subject === 'Registration opens tomorrow: Ski Camp' && /Registration reminder/.test(e.html), 'email subject for the day-before reminder');
const plain = planFamily({ today: '2026-11-19', saved: [act], picks: [], dates: new Map([['90', reg as any]]) });
ok(plain.alerts[0].kind === 'reg-soon' && !plain.alerts[0].explicit, 'without reminder: a normal "opens soon" alert');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
