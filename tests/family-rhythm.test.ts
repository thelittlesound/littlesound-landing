import {
  breathing, clashes, daysBetween, dayWord, greeting, ideaFor, kidsFor, lanes, radar, rhythmEvents, sessionShort,
  summaryLine, UNASSIGNED, watching, weekDays, weekStart, type RhythmData,
} from '@/lib/family-rhythm';
import { sessionKey } from '@/lib/family-calendar';
import { describeItem } from '@/lib/date-agent-logic';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a: any, b: any, m: string) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : `\n   got  ${JSON.stringify(a)}\n   want ${JSON.stringify(b)}`));
const T = '2026-11-16'; // a Monday
const it = (o: any) => ({ kind: 'session', label: null, start_date: null, end_date: null, days_of_week: null, start_time: null, end_time: null, location: null, notes: null, source_excerpt: 'x', ...o });
const S = (o: any) => { const item = it(o); return { key: sessionKey(item as any), text: describeItem(item as any, T), item }; };
const A = (id: string, title: string, ageMin: number | null = null, ageMax: number | null = null) => ({ activityId: id, title, provider: 'P ' + id, website: null, neighborhood: 'Ballard', ageMin, ageMax });
const kids = [{ id: 'k_maya0001', name: 'Maya', age: 9 }, { id: 'k_leo00002', name: 'Leo', age: 4 }];
const MAYA = 'k_maya0001', LEO = 'k_leo00002';

const pottery = S({ label: 'Final class', start_date: '2026-11-18', start_time: '15:45', end_time: '16:45' });
const swimWed = S({ label: 'Starfish Wed', days_of_week: ['WE'], start_time: '16:00', end_time: '16:30', start_date: '2026-11-04' });
const swimSat = S({ label: 'Starfish Sat', days_of_week: ['SA'], start_time: '09:30', end_time: '10:00', start_date: '2026-11-07' });
const soccer = S({ days_of_week: ['SA'], start_time: '09:00', end_time: '10:00', start_date: '2026-11-07' });
const soccerLate = S({ days_of_week: ['SA'], start_time: '10:30', end_time: '11:30', start_date: '2026-11-07' });
const skate = S({ days_of_week: ['SU'], start_time: '12:00', end_time: '13:00' });
const tot = S({ days_of_week: ['TH'], start_time: '10:00', end_time: '10:30', start_date: '2026-11-05' });
const P = (activityId: string, s: any, kidId: string | null, extra: any = {}) => ({ activityId, key: s.key, status: 'active' as const, changeNote: null, kidId, anchor: '2026-11-10', ...extra });

const base = (): RhythmData => ({
  activities: [A('9', 'Pottery', 5, 16), A('65', 'Swim', 0, 12), A('19', 'Soccer', 6, 12), A('24', 'Skate', 4, 14), A('70', 'Tot Swim', 1, 5), A('90', 'Ski Camp', 7, 14), A('3', 'Nature Trek', 5, 12)],
  sessions: { '9': [pottery], '65': [swimWed, swimSat], '19': [soccer], '24': [skate], '70': [tot] },
  registrations: { '90': [it({ kind: 'registration', start_date: '2026-11-20', start_time: '09:00', end_date: '2026-12-04' })], '19': [it({ kind: 'registration', end_date: '2026-11-25' })] },
  picks: [P('9', pottery, MAYA), P('65', swimWed, MAYA), P('24', skate, LEO)],
  kids,
});

// dates
ok(weekStart('2026-11-16') === '2026-11-16' && weekStart('2026-11-22') === '2026-11-16' && weekStart('2026-11-23') === '2026-11-23', 'weekStart (Mon–Sun)');
ok(weekStart('2027-01-01') === '2026-12-28', 'weekStart across the year');
eq(weekDays('2026-11-16'), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'], 'weekDays');
eq([dayWord(T, T), dayWord('2026-11-17', T), dayWord('2026-11-20', T), dayWord('2026-11-25', T)], ['today', 'tomorrow', 'Friday', 'Wed, Nov 25'], 'dayWord');
ok(daysBetween(T, '2026-11-20') === 4 && daysBetween('2026-03-07', '2026-03-09') === 2, 'daysBetween (across DST)');
eq([greeting(7), greeting(13), greeting(19)], ['Good morning', 'Good afternoon', 'Good evening'], 'greeting');

// events + lanes
const d = base();
const wk = weekDays(T);
const ev = rhythmEvents(d, wk[0], wk[6]);
eq(ev.map((e) => [e.date, e.activityId, e.lane]), [['2026-11-18', '9', MAYA], ['2026-11-18', '65', MAYA], ['2026-11-22', '24', LEO]], 'week events in order, in kid lanes');
eq(lanes(kids, ev), [MAYA, LEO], 'lanes = kids');
const d2 = base(); d2.picks.push(P('70', tot, null));
eq(lanes(kids, rhythmEvents(d2, wk[0], wk[6])), [MAYA, LEO, UNASSIGNED], 'unassigned lane appears when needed');
const d3 = base(); d3.picks[0] = P('9', pottery, 'k_removed00');
ok(rhythmEvents(d3, wk[0], wk[6])[0].lane === UNASSIGNED, 'a removed child’s items fall to unassigned');
const d4 = base(); d4.picks.push(P('3', S({ start_date: '2026-11-19' }), MAYA)); d4.picks.push(P('9', pottery, MAYA, { status: 'gone' }));
ok(rhythmEvents(d4, wk[0], wk[6]).filter((e) => e.activityId === '9').length === 1, 'gone picks and sessions no longer listed are skipped');
eq(lanes([], []), [UNASSIGNED], 'no kids yet → one family lane');

// breathing
const bm = breathing(ev, MAYA, wk), bl = breathing(ev, LEO, wk);
ok(bm.hours === 1.5 && bm.freeAfternoons === 4 && bm.word === 'Light', 'Maya: 1.5h, 4 free afternoons, light: ' + JSON.stringify(bm));
ok(bl.hours === 1 && bl.freeAfternoons === 5, 'Leo: weekend only → all 5 afternoons free');
const busy = base(); busy.sessions['19'] = [S({ days_of_week: ['MO', 'TU', 'WE', 'TH'], start_time: '15:00', end_time: '17:00', start_date: '2026-11-01' })]; busy.picks.push(P('19', busy.sessions['19'][0], MAYA));
const bb = breathing(rhythmEvents(busy, wk[0], wk[6]), MAYA, wk);
ok(bb.word === 'Full' && bb.pct === 100 && bb.freeAfternoons === 1, 'busy week → Full: ' + JSON.stringify(bb));

const sunWin = weekDays('2026-11-15'); // a Sunday: the dashboard's window starts today
const bs = breathing(rhythmEvents(d, sunWin[0], sunWin[6]), MAYA, sunWin);
ok(bs.hours === 1.5 && bs.freeAfternoons === 4, 'rolling window from Sunday: weekdays counted by weekday, not position: ' + JSON.stringify(bs));

// clashes + fixes
const cl = clashes(d, T, '2026-11-29', T);
ok(cl.length === 1 && cl[0].lane === MAYA && cl[0].date === '2026-11-18', 'Maya’s Wed clash found once');
ok(cl[0].fix?.move.activityId === '65' && cl[0].fix?.to.key === swimSat.key && cl[0].fix?.label === 'Sat 9:30am', 'fix: move swim to Sat 9:30am: ' + JSON.stringify(cl[0].fix && { m: cl[0].fix.move.activityId, l: cl[0].fix.label }));
const dSoc = base(); dSoc.picks.push(P('19', soccer, MAYA));
ok(clashes(dSoc, T, '2026-11-29', T)[0].fix === null, 'no fix when the other session would clash too (soccer Sat 9–10)');
const dSoc2 = base(); dSoc2.picks.push(P('19', soccerLate, MAYA));
ok(clashes(dSoc2, T, '2026-11-29', T)[0].fix?.label === 'Sat 9:30am', 'fix allowed when it fits around Saturday soccer at 10:30');
const dKids = base(); dKids.picks[1] = P('65', swimWed, LEO);
ok(clashes(dKids, T, '2026-11-29', T).length === 0, 'two kids at once is not a clash');
const dWeekly = base(); dWeekly.picks[0] = P('9', S({ days_of_week: ['WE'], start_time: '15:45', end_time: '16:45', start_date: '2026-11-04' }), MAYA); dWeekly.sessions['9'] = [S({ days_of_week: ['WE'], start_time: '15:45', end_time: '16:45', start_date: '2026-11-04' })];
ok(clashes(dWeekly, T, '2026-12-13', T).length === 1, 'a weekly clash is reported once, not every week');
eq(sessionShort(it({ days_of_week: ['TU', 'TH'], start_time: '16:00' }) as any, T), 'Tue, Thu 4pm', 'sessionShort weekly');
eq(sessionShort(it({ start_date: '2027-01-06', start_time: '14:30' }) as any, T), 'Jan 6, 2027 2:30pm', 'sessionShort dated');

// radar
const r = radar(d, T);
eq(r.map((x) => [x.kind, x.activity.activityId, x.days]), [['opens', '90', 4], ['closes', '19', 9]], 'radar: openings first, then open-now closing');
eq(r[0].forKids.map((k) => k.name), ['Maya'], 'ski camp (7–14) is for Maya only');
eq(kidsFor(A('x', 'x'), kids), [], 'unknown ages → no kid guess');
eq(watching(d).map((a) => a.activityId), ['3'], 'watching: saved with no dates yet');
const dPast = base(); dPast.registrations['90'] = [it({ kind: 'registration', start_date: '2026-11-01', end_date: '2026-11-10' })];
ok(!radar(dPast, T).some((x) => x.activity.activityId === '90'), 'finished registration drops off');

// ideas
const id1 = ideaFor(d, LEO, '2026-11-19', ev);
ok(id1?.activity.activityId === '70' && id1?.start === '10:00', 'idea for Leo Thu: tot swim (ages 1–5)');
ok(ideaFor(d, MAYA, '2026-11-19', ev) === null, 'no idea for Maya Thu (tot swim is too young for 9)');
ok(ideaFor(d, MAYA, '2026-11-18', ev) === null, 'no idea on a day that already has something');
const satIdea = ideaFor(d, MAYA, '2026-11-21', ev);
ok(satIdea?.activity.activityId === '19', 'Sat idea for Maya is soccer (saved, ages 6–12), not a second swim session: ' + satIdea?.activity.activityId);
ok(ideaFor(d, UNASSIGNED, '2026-11-19', ev) === null, 'no ideas in the unassigned lane');

// summary
eq(summaryLine(d, T, 1), 'A full Wednesday, a wide-open tomorrow, one clash to sort out, and one signup to catch on Friday.', 'summary with clash + signup');
const dq = base(); dq.picks = [];
eq(summaryLine(dq, T), 'One signup to catch on Friday.', 'summary: nothing added, one signup');
const de = base(); de.picks = []; de.registrations = {};
eq(summaryLine(de, T), 'A quiet week ahead. Add sessions from your saved activities to see them here.', 'summary: quiet');
eq(summaryLine({ activities: [], sessions: {}, registrations: {}, picks: [], kids }, T), 'A quiet week ahead. Save activities on Discover and they’ll show up here.', 'summary: nothing saved');
const ds = base(); ds.picks = [P('24', skate, LEO)];
eq(summaryLine(ds, '2026-11-20'), 'One activity on the calendar, a wide-open Monday, and one signup to catch today.', 'summary on a Friday: ' + summaryLine(ds, '2026-11-20'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
