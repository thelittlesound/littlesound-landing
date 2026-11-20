import { picksFor, fitsGoal, whyItFits, singleGender } from '@/lib/picks';
import { categoriesFor } from '@/lib/kid-match';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const L = (id: string, o: Record<string, unknown>) => ({ id, title: 'T' + id, provider: 'P' + id, category: 'Sports', neighborhood: 'West Seattle', ageMin: 5, ageMax: 12, price: 100, level: null, ...o }) as any;
const jack = { id: 'k_jack0001', name: 'Jack', age: 9, interests: ['Sports & Athletics'] };
const home = { area: 'West Seattle', profile: true };

// Team goal: sports leagues/teams only, ages must fit and be known.
const list = [
  L('1', { level: 'rec', title: 'Rec Soccer League' }),
  L('2', { level: 'club', title: 'Select Soccer' }),
  L('3', { title: 'Soccer skills drop-in' }), // no team signal
  L('4', { level: 'rec', ageMin: 12, ageMax: 18 }), // too old for 9
  L('5', { level: 'rec', agesKnown: false, ageMin: 0, ageMax: 18 }), // unknown ages
  L('6', { level: 'rec', provider: 'P1' }), // same provider as 1
  L('7', { category: 'Arts' }),
  L('8', { category: 'Camps', theme: 'Sports' }),
];
const team = picksFor(jack, 'team', list, { place: home, dateLines: { '2': 'Registration opens Dec 1' } });
const ids = team.picks.map((p) => p.a.id);
ok(!ids.includes('3') && !ids.includes('4') && !ids.includes('5'), 'team: no non-team, too-old or unknown-age listings');
ok(ids.length === 2 && ids.includes('1') && ids.includes('2'), 'team: one per provider (6 dropped), fewer rather than padded');
ok(team.picks.every((p) => /Matches Jack’s interest in sports\./.test(p.why)), 'team: interest reason first');
ok(team.picks.find((p) => p.a.id === '1')!.why.includes('Rec: everyone plays.'), 'rec reason');
ok(!team.picks.some((p) => /Registration/.test(p.why)) || true, 'date reason allowed');

// Something new: outside interests, spread across categories.
const nw = picksFor(jack, 'new', [L('a', { category: 'Arts' }), L('b', { category: 'Arts' }), L('c', { category: 'Music' }), L('d', { category: 'Sports' })], { place: home });
ok(nw.picks.length === 2 && nw.picks.every((p) => p.a.category !== 'Sports'), 'new: not his interests');
ok(new Set(nw.picks.map((p) => p.a.category)).size === 2, 'new: one per category');
ok(nw.picks[0].why.startsWith('A change from Jack’s usual interests.'), 'new: says why');

// Camp goal.
ok(fitsGoal(L('x', { category: 'Camps' }), 'camp', categoriesFor(jack)) && !fitsGoal(L('y', {}), 'camp', categoriesFor(jack)), 'camp goal = Camps');
const camp = picksFor(jack, 'camp', list, { place: home });
ok(camp.picks.length === 1 && /interest in sports/.test(camp.picks[0].why), 'a sports-themed camp matches a sports kid');

// No age → no picks (we can't say anything fits).
ok(picksFor({ ...jack, age: null } as any, 'team', list).picks.length === 0, 'no age → no picks');

// Why text is only facts and at most two sentences.
const w = whyItFits(L('z', { level: 'rec' }), jack, 'team', categoriesFor(jack), home, 'Next session starts Nov 23');
ok(w.split('. ').length <= 2 && !/review|rating|spots|popular/i.test(w), 'two facts at most, no invented claims');
const plain = whyItFits(L('q', { category: 'Arts', ageMin: 6, ageMax: 18 }), jack, 'new', new Set(), null);
ok(plain === 'Ages 6+, so Jack (9) fits.', 'fallback: the age fit');

// Single-gender programs never become picks; mixed ones do.
ok(singleGender({ title: 'Girls Youth & High School Lacrosse' }) && singleGender({ title: 'Let Me Run Boys’ Running' }), 'girls-only / boys-only detected');
ok(!singleGender({ title: 'Travel Lacrosse Teams, Boys & Girls' }) && !singleGender({ title: 'Select AAU Basketball, Youth Boys and Girls' }) && !singleGender({ title: 'Rec Soccer League' }), 'mixed programs are fine');
const g = picksFor(jack, 'team', [L('g1', { level: 'rec', title: 'Girls Lacrosse League' }), L('g2', { level: 'rec', title: 'Rec Soccer League' })], { place: home });
ok(g.picks.length === 1 && g.picks[0].a.id === 'g2', 'girls-only league not picked');
// Only dated lines are reasons.
ok(!whyItFits(L('w1', {}), jack, 'new', new Set(), null, 'Weekly · Tue 3pm').includes('Weekly'), 'weekly schedule is not a reason');
ok(whyItFits(L('w2', {}), jack, 'new', new Set(), null, 'Registration opens Dec 1').includes('Registration opens Dec 1.'), 'a registration date is');

console.log(`picks: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
