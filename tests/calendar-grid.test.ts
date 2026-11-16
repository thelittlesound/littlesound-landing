import { occurrences, monthGrid, shiftMonth, monthLabel, dayLabel, overlaps, clashMap, normalizeKids, kidLabel, kidColor, KID_COLORS, UNASSIGNED_COLOR, newKidId, KID_ID_RE } from '@/lib/calendar-grid';
import { sessionTiming, plusDays, weekdayOf } from '@/lib/ics';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a: any, b: any, m: string) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : `\n   got  ${JSON.stringify(a)}\n   want ${JSON.stringify(b)}`));
const it = (o: any) => ({ kind: 'session', label: null, start_date: null, end_date: null, days_of_week: null, start_time: null, end_time: null, location: null, notes: null, source_excerpt: 'x', ...o });
const dates = (l: any[]) => l.map((o) => o.date);

// month grid
const g = monthGrid('2026-11');
ok(g.from === '2026-10-26' && g.to === '2026-12-06' && g.weeks.length === 6 && g.weeks.every((w) => w.length === 7 && weekdayOf(w[0]) === 'MO'), 'Nov 2026 grid: Mon Oct 26 – Sun Dec 6, 6 weeks');
const f = monthGrid('2027-02');
ok(f.from === '2027-02-01' && f.to === '2027-02-28' && f.weeks.length === 4, 'Feb 2027 starts Monday, 4 weeks');
ok(monthGrid('2028-02').to >= '2028-02-29', 'leap February');
eq([shiftMonth('2026-11', 1), shiftMonth('2026-12', 1), shiftMonth('2027-01', -1), shiftMonth('2026-11', -13)], ['2026-12', '2027-01', '2026-12', '2025-10'], 'shiftMonth');
eq([monthLabel('2026-11'), dayLabel('2026-11-18')], ['November 2026', 'Wednesday, Nov 18'], 'labels');

// occurrences
const R = ['2026-10-26', '2026-12-06'] as const;
eq(dates(occurrences(it({ days_of_week: ['WE'], start_time: '16:00', end_time: '16:30', start_date: '2026-11-04' }), R[0], R[1], '2026-11-16')), ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02'], 'weekly with start, no end → runs on');
eq(dates(occurrences(it({ days_of_week: ['TU', 'TH'], start_date: '2026-11-10', end_date: '2026-11-19', start_time: '10:00' }), R[0], R[1], '')), ['2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19'], 'two weekdays inside a range');
eq(dates(occurrences(it({ days_of_week: ['SU'], start_time: '12:00' }), R[0], R[1], '2026-11-16')), ['2026-11-22', '2026-11-29', '2026-12-06'], 'undated weekly starts at the anchor');
eq(dates(occurrences(it({ start_date: '2026-11-23', end_date: '2026-11-27', start_time: '09:00', end_time: '15:00' }), R[0], R[1], '')), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'], 'camp week Mon–Fri');
eq(dates(occurrences(it({ start_date: '2026-11-20', end_date: '2026-11-24', start_time: '09:00' }), R[0], R[1], '')), ['2026-11-20', '2026-11-23', '2026-11-24'], 'Fri–Tue range with hours → skips the weekend');
eq(dates(occurrences(it({ start_date: '2026-11-21', end_date: '2026-11-24', start_time: '09:00' }), R[0], R[1], '')), ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'], 'range starting on Saturday → every day');
eq(dates(occurrences(it({ start_date: '2026-11-21', end_date: '2026-11-22' }), R[0], R[1], '')), ['2026-11-21', '2026-11-22'], 'untimed range → every day');
eq(occurrences(it({ start_date: '2026-11-18', start_time: '15:45', end_time: '16:45' }), R[0], R[1], ''), [{ date: '2026-11-18', start: '15:45', end: '16:45' }], 'single day with times');
eq(occurrences(it({ start_date: '2026-11-18', start_time: '15:45' }), R[0], R[1], '')[0].end, '16:45', 'no end time → 1 hour');
eq(occurrences(it({ start_date: '2026-11-18' }), R[0], R[1], '')[0], { date: '2026-11-18', start: null, end: null }, 'all day');
eq(dates(occurrences(it({ start_date: '2026-09-01', end_date: '2027-06-30', days_of_week: ['MO'] }), R[0], R[1], '')), ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'], 'long range clipped to the grid');
ok(occurrences(it({ kind: 'registration', start_date: '2026-11-18' }), R[0], R[1], '').length === 0 && occurrences(it({}), R[0], R[1], '').length === 0, 'registration / nothing → no sessions');
ok(occurrences(it({ start_date: '2027-03-01', days_of_week: ['MO'] }), R[0], R[1], '').length === 0, 'starts after the grid → none');

// same days as the phone feed (ICS DTSTART = first occurrence, RRULE days)
const cases = [
  it({ days_of_week: ['WE'], start_time: '16:00', start_date: '2026-11-03', end_date: '2026-12-31' }),
  it({ days_of_week: ['SU'], start_time: '12:00' }),
  it({ start_date: '2026-11-23', end_date: '2026-11-27', start_time: '09:00' }),
  it({ start_date: '2026-11-20', end_date: '2026-11-24', start_time: '09:00' }),
  it({ start_date: '2026-11-21', end_date: '2026-11-24', start_time: '09:00' }),
  it({ start_date: '2026-11-18', start_time: '15:45' }),
];
for (const c of cases) {
  const t = sessionTiming(c as any, '2026-11-16')!;
  const first = t[0].match(/:(\d{4})(\d{2})(\d{2})/)!.slice(1).join('-');
  const occ = occurrences(c as any, '2026-11-01', '2027-01-31', '2026-11-16');
  ok(occ[0].date === first, `first day matches the phone feed (${first} vs ${occ[0]?.date})`);
  const rr = t.find((l) => l.startsWith('RRULE'));
  if (rr && /BYDAY=([A-Z,]+)/.test(rr)) {
    const by = rr.match(/BYDAY=([A-Z,]+)/)![1].split(',');
    ok(occ.every((o) => by.includes(weekdayOf(o.date))), 'weekdays match the phone feed rule ' + rr);
  }
}

// overlaps / clashes
ok(overlaps({ id: 'a', start: '15:45', end: '16:45' }, { id: 'b', start: '16:00', end: '16:30' }), 'overlap');
ok(!overlaps({ id: 'a', start: '15:00', end: '16:00' }, { id: 'b', start: '16:00', end: '17:00' }), 'back-to-back is not a clash');
ok(!overlaps({ id: 'a', start: null, end: null }, { id: 'b', start: '10:00', end: '11:00' }), 'all-day never clashes');
const cm = clashMap([{ id: 'a', start: '09:00', end: '10:00' }, { id: 'b', start: '09:30', end: '10:30' }, { id: 'c', start: '10:15', end: '11:00' }, { id: 'd', start: '12:00', end: '13:00' }]);
eq([cm.get('a'), cm.get('b'), cm.get('c'), cm.get('d')], [['b'], ['a', 'c'], ['b'], undefined], 'clash map');

// kids
let n = 0; const rand = () => ((n++ * 7919) % 36) / 36;
const nk = normalizeKids([{ age: 9 }, { age: '4', name: '  Leo ' }, { id: 'k_keep1234', age: 6, name: 'Ana' }, { id: 'k_keep1234', age: 2 }, 'junk', null], rand);
ok(nk.changed && nk.kids.length === 4 && nk.kids[2].id === 'k_keep1234' && nk.kids[3].id !== 'k_keep1234' && nk.kids.every((k) => KID_ID_RE.test(k.id)), 'ids added, kept, de-duplicated; junk dropped');
ok(nk.kids[1].name === 'Leo' && nk.kids[1].age === 4 && nk.stored[1].id === nk.kids[1].id && (nk.stored[1] as any).name === '  Leo ', 'names trimmed for display; stored rows keep their data + id');
ok(!normalizeKids([{ id: 'k_abcd1234', age: 3 }]).changed && normalizeKids(null).kids.length === 0, 'already-normalized → unchanged; null → none');
eq([kidLabel({ id: 'k', name: 'Maya', age: 9 }, 0), kidLabel({ id: 'k', name: '', age: 4 }, 1), kidLabel({ id: 'k', name: '', age: null }, 2)], ['Maya', 'Age 4', 'Kid 3'], 'kid labels');
const ks = nk.kids;
ok(kidColor(ks, ks[1].id) === KID_COLORS[1] && kidColor(ks, null) === UNASSIGNED_COLOR && kidColor(ks, 'k_gone0000') === UNASSIGNED_COLOR, 'kid colors (removed kid → unassigned)');
ok(KID_ID_RE.test(newKidId()) && newKidId() !== newKidId(), 'new kid ids');
console.log(`\n${pass} passed, ${fail} failed`);
