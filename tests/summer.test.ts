import { isAddOnCare, isSummerProgram, runsInWeek, signupLine, summerIdeas, summerWeeks, weekCells, type CatalogItem } from '@/lib/summer';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const it = (o: any) => ({ kind: 'session', label: null, start_date: null, end_date: null, days_of_week: null, start_time: null, end_time: null, location: null, notes: null, source_excerpt: 'x', ...o });

// weeks
const s27 = summerWeeks('2026-11-15');
ok(s27.year === 2027 && s27.weeks.length === 10, 'November plans next summer (2027), 10 weeks');
ok(s27.weeks[0].start === '2027-06-21' && s27.weeks[9].start === '2027-08-23', 'Jun 21 … Aug 23, 2027: ' + s27.weeks[0].start);
ok(s27.weeks[0].label === 'Jun 21' && s27.weeks[2].note === 'Jul 4 holiday', 'labels + Jul 4 (Sunday → observed Mon Jul 5)');
ok(s27.weeks.filter((w) => w.note).length === 1, 'only one holiday note in 2027');
ok(summerWeeks('2027-03-01').year === 2027 && summerWeeks('2027-07-10').year === 2027 && summerWeeks('2027-09-01').year === 2028, 'spring/summer = this year, September → next');
const s28 = summerWeeks('2028-01-10');
ok(s28.weeks[0].start === '2028-06-19' && s28.weeks[0].note === 'Juneteenth', '2028 starts Mon Jun 19 (Juneteenth week)');
ok(s28.weeks.some((w) => w.start === '2028-07-03' && w.note === 'Jul 4 holiday'), '2028 Jul 4 (Tue) in week of Jul 3');

// runs in week
const camp = it({ start_date: '2027-07-12', end_date: '2027-07-16', start_time: '09:00', end_time: '15:00' });
ok(runsInWeek(camp, '2027-07-12') && !runsInWeek(camp, '2027-07-19') && !runsInWeek(camp, '2027-07-05'), 'a dated camp week');
ok(!runsInWeek(it({ days_of_week: ['TU'], start_time: '16:00' }), '2027-07-12'), 'an undated weekly class is not a summer week');
ok(!runsInWeek(it({ kind: 'registration', start_date: '2027-07-12' }), '2027-07-12'), 'registration dates are not sessions');
ok(runsInWeek(it({ start_date: '2027-06-01', end_date: '2027-08-31', days_of_week: ['MO', 'WE'] }), '2027-08-23'), 'a long weekly program runs every summer week');

// signup line
const T = '2026-11-15';
ok(signupLine([], T).text === 'Signup date not posted yet', 'no registration dates');
const reg = signupLine([it({ kind: 'registration', start_date: '2027-02-02', start_time: '09:00' })], T);
ok(reg.opens === '2027-02-02' && /^Signups open Feb 2.* at 9am$/.test(reg.text) && !reg.open, 'opens later: ' + reg.text);
ok(signupLine([it({ kind: 'registration', start_date: '2026-11-01', end_date: '2026-12-04' })], T).open, 'open now');

// ideas
const C = (o: Partial<CatalogItem> & { id: string }): CatalogItem => ({ title: 'X', provider: 'P', category: 'Camps', subcategory: null, neighborhood: 'Ballard', ageMin: 5, ageMax: 12, website: 'https://x', ...o });
const catalog = [
  C({ id: 'tech', title: 'Summer Tech Camp', category: 'STEM', subcategory: 'Coding & AI', ageMin: 7, ageMax: 18 }),
  C({ id: 'zoo', title: 'Kinder Camp at the Zoo', category: 'Outdoor', ageMin: 3, ageMax: 5 }),
  C({ id: 'day', title: 'Summer Day Camp', category: 'Camps' }),
  C({ id: 'swim', title: 'Year-Round Swim Lessons', category: 'Swimming', subcategory: 'Year-Round' }),
  C({ id: 'art', title: 'Art Week', category: 'Arts', subcategory: 'Summer Camps', ageMin: 6, ageMax: 12 }),
  C({ id: 'later', title: 'August Sailing Camp', category: 'Outdoor', ageMin: 8, ageMax: 16 }),
];
const dates = new Map<string, any[]>([
  ['art', [it({ start_date: '2027-07-12', end_date: '2027-07-16', start_time: '09:00', end_time: '12:00' })]],
  ['later', [it({ start_date: '2027-08-09', end_date: '2027-08-13' })]],
  ['tech', [it({ kind: 'registration', start_date: '2027-01-15' })]],
]);
const weeks = s27.weeks;
const window = { from: weeks[0].start, to: '2027-08-29' };
const ella = { id: 'k_ella0001', name: 'Ella', age: 10, interests: ['STEM & Tech'] };
const jack = { id: 'k_jack0001', name: 'Jack', age: 5, interests: [] };
const wk = (start: string) => weeks.find((w) => w.start === start)!;
const ids = (xs: { activityId: string }[]) => xs.map((x) => x.activityId).join(',');
const base = { catalog, dates, saved: new Map(), planned: new Set<string>(), window, today: T };

const e712 = summerIdeas({ ...base, kid: ella, week: wk('2027-07-12') });
ok(e712[0].activityId === 'art' && e712[0].runs && /Runs this week/.test(e712[0].why), 'Ella Jul 12: Art Week runs that week, ranked first: ' + ids(e712));
ok(e712[1].activityId === 'tech' && /interests/.test(e712[1].why) && /Jan 15/.test(e712[1].signup), 'then Tech (her interest), with its signup date');
ok(!e712.some((x) => x.activityId === 'zoo'), 'zoo (3–5) too young for Ella');
ok(!e712.some((x) => x.activityId === 'swim'), 'year-round swim is not a summer program');
ok(!e712.some((x) => x.activityId === 'later'), 'sailing is dated for August, so not offered for July');
ok(summerIdeas({ ...base, kid: ella, week: wk('2027-08-09') }).some((x) => x.activityId === 'later' && x.runs), 'sailing offered in its own week');
ok(!summerIdeas({ ...base, kid: ella, week: wk('2027-07-19') }).some((x) => x.activityId === 'art'), 'Art Week not offered the week after it runs');

const j = summerIdeas({ ...base, kid: jack, week: wk('2027-06-21') });
ok(ids(j) === 'zoo,day', 'Jack (5): zoo camp and day camp (tied, by title): ' + ids(j));
const savedForElla = summerIdeas({ ...base, kid: jack, week: wk('2027-06-21'), saved: new Map([['zoo', 'k_ella0001']]) });
ok(!savedForElla.some((x) => x.activityId === 'zoo'), 'a listing saved for a sibling is not suggested');
const savedJack = summerIdeas({ ...base, kid: jack, week: wk('2027-06-21'), saved: new Map([['zoo', 'k_jack0001']]) });
ok(savedJack[0].activityId === 'zoo' && /Saved for Jack/.test(savedJack[0].why), 'saved for Jack ranks first');
const planned = summerIdeas({ ...base, kid: jack, week: wk('2027-06-28'), planned: new Set(['day']) });
ok(planned[planned.length - 1].activityId === 'day', 'already pencilled another week → ranked last, still offered');
ok(isSummerProgram({ category: 'Language', subcategory: 'Summer Camps', title: 'Immersion' }) && !isSummerProgram({ category: 'Music', subcategory: 'Private Lessons', title: 'Piano' }), 'summer program detection');

// add-on care (decided 2026-11-16: leave it out of ideas)
const careCat = [...catalog, C({ id: 'care', title: 'Creative Care', category: 'Camps', subcategory: 'Before & After Care' }), C({ id: 'ext', title: 'Extended Day for Camp', category: 'Camps' })];
const careDates = new Map(dates); careDates.set('care', [it({ start_date: '2027-06-21', end_date: '2027-08-27', days_of_week: ['MO', 'TU', 'WE', 'TH', 'FR'] })]);
const withCare = summerIdeas({ ...base, catalog: careCat, dates: careDates, kid: jack, week: wk('2027-06-21') });
ok(!withCare.some((x) => x.activityId === 'care' || x.activityId === 'ext'), 'before/after care is not suggested even when it runs that week: ' + ids(withCare));
ok(!summerIdeas({ ...base, catalog: careCat, dates: careDates, kid: jack, week: wk('2027-06-21'), saved: new Map([['care', 'k_jack0001']]) }).some((x) => x.activityId === 'care'), 'not even when saved for the child');
ok(isAddOnCare({ title: 'Before and After Camp Care', subcategory: null }) && isAddOnCare({ title: 'Camp Aftercare', subcategory: null }) && isAddOnCare({ title: 'Creative Care', subcategory: null }) && isAddOnCare({ title: 'Summer Program', subcategory: 'Extended Care' }), 'add-on care names');
ok(!isAddOnCare({ title: 'Animal Care Camp', subcategory: null }) && !isAddOnCare({ title: 'After-School Climbing Program', subcategory: 'Climbing' }) && !isAddOnCare({ title: 'Summer Day Camp', subcategory: 'Day Camps' }) && !isAddOnCare({ title: 'Licensed School-Age Summer Day Camp', subcategory: 'Day Camps' }), 'real camps and classes are not care');

// cells
const listings = new Map([['day', { website: 'https://day', category: 'Camps' }], ['art', { website: 'https://art', category: 'Arts' }]]);
const cells = weekCells({
  weeks,
  plans: [
    { kid_id: 'k_jack0001', week_start: '2027-06-21', activity_id: 'day', title: 'Summer Day Camp', provider: 'P', website: null },
    { kid_id: 'k_jack0001', week_start: '2026-06-22', activity_id: 'day', title: 'Old', provider: null, website: null },
    { kid_id: 'k_ella0001', week_start: '2027-07-12', activity_id: 'tech', title: 'Tech', provider: null, website: null },
  ],
  picks: [
    { activityId: 'art', kidId: 'k_ella0001', item: dates.get('art')![0], title: 'Art Week', provider: 'Nest' },
    { activityId: 'art', kidId: null, item: dates.get('art')![0], title: 'Art Week', provider: 'Nest' },
  ],
  dates,
  listings,
  today: T,
});
ok(cells['k_jack0001|2027-06-21']?.kind === 'pencil' && cells['k_jack0001|2027-06-21'].website === 'https://day' && cells['k_jack0001|2027-06-21'].category === 'Camps', 'pencilled week, website from the catalog');
ok(Object.keys(cells).length === 2, 'last summer\'s plan and unassigned picks are ignored');
ok(cells['k_ella0001|2027-07-12']?.kind === 'calendar' && cells['k_ella0001|2027-07-12'].title === 'Art Week', 'a session on the calendar beats a pencilled plan');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
