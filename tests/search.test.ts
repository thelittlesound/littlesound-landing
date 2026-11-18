import { parse, describe, closeness, nearestArea, placeLabel, suggestActivities, suggestPlaces, AREA_CENTERS } from '@/lib/search';
import { kindsOf, showKinds, KIND_DEFS } from '@/lib/kinds';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a: unknown, b: unknown, m: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)}`);
const kids = [{ id: 'k_ella0001', name: 'Ella' }, { id: 'k_jack0001', name: 'Jack' }];

// Parsing what parents type
eq(parse('swim lessons near 98126'), { place: { zip: '98126', area: 'West Seattle' }, cat: 'Swimming', kind: 'group', theme: 'All', act: 'Swim lessons' }, 'swim lessons + ZIP');
eq(describe(parse('jiu-jitsu for a 7 year old')), ['Jiu-jitsu', 'Age 7'], 'jiu-jitsu + age');
eq(describe(parse('free summer camp in Burien')), ['Summer camps', 'In or near Burien', 'Free'], 'free summer camp in Burien');
eq(parse('sailing camp 2nd grade'), { age: 7, cat: 'Camps', kind: null, theme: 'Outdoor', act: 'Outdoor camps' }, 'sailing camp → Outdoor theme, grade → age');
eq(parse('winter break camp').kind, 'School breaks', 'winter break camp');
eq(parse('summer swim team').cat, 'Swimming', '"summer swim team" is a team, not a camp');
eq(parse('choir for Ella', kids).kidId, 'k_ella0001', 'kid name');
ok(parse('choir for Ella', kids).kind === 'choir', 'choir kind');
eq(parse('piano lessons under $150').under, 150, 'under $150');
ok(parse('martial arts').cat === 'Martial Arts', 'martial arts is not Arts');
ok(parse('art class').cat === 'Arts', 'art class → Arts');
ok(parse('soccer in West Seattle').kind === 'soccer' && parse('soccer in West Seattle').place?.area === 'West Seattle', 'soccer + neighborhood');
ok(parse('karate in alki').place?.area === 'West Seattle', 'alias Alki → West Seattle');
ok(parse('ballet for preschoolers').age === 4, 'preschoolers → 4');
ok(parse('teen improv').age === 14 && parse('teen improv').kind === 'acting', 'teen improv');
ok(parse('zip code 98116').cat === undefined && parse('zip code 98116').place?.zip === '98116', '"zip code" is not coding');
eq(parse('gracie'), { text: 'gracie' }, 'unknown word → plain text');
ok(parse('98999').place === undefined, 'unknown ZIP is ignored');
ok(parse('5 year old').age === 5 && parse('ages 9').age === 9 && parse('kindergarten').age === 5, 'age forms');
ok(parse('my 40 year old').age === undefined, 'adult age ignored');

// Places: closest first
ok(closeness('West Seattle', { area: 'West Seattle' }).tier === 0, 'same area');
ok(closeness('White Center', { area: 'West Seattle' }).tier === 1, 'White Center is near West Seattle');
ok(closeness('Burien', { area: 'West Seattle' }).tier === 1, 'Burien is near West Seattle');
ok(closeness('Shoreline', { area: 'West Seattle' }).tier === 3, 'Shoreline is farther');
ok(closeness('Citywide', { area: 'West Seattle' }).tier === 2, 'several locations');
ok(closeness('Somewhere New', { area: 'West Seattle' }).tier === 2, 'unknown neighborhood is not hidden');
ok(closeness('Shoreline', null).tier === 0, 'no place → no ranking');
ok(nearestArea(47.5615, -122.3866).area === 'West Seattle', 'phone at the Junction');
ok(nearestArea(47.6687, -122.3845).area === 'Ballard', 'phone in Ballard');
ok(placeLabel({ area: 'Delridge', me: true }) === 'Near you · Delridge', 'location label');
ok(Object.keys(AREA_CENTERS).length > 40, 'neighborhood centers');

// Suggestions
ok(suggestActivities('swi').includes('Swim team') && suggestActivities('swi').includes('Swim lessons'), 'swi → swim suggestions');
ok(suggestActivities('jiu')[0] === 'Jiu-jitsu', 'jiu → Jiu-jitsu');
ok(suggestPlaces('9812').every((p) => p.label.startsWith('9812')), 'ZIP prefix only');
ok(suggestPlaces('bur').some((p) => p.label === 'Burien'), 'bur → Burien');
ok(suggestPlaces('alk').some((p) => p.hint === 'in West Seattle'), 'alk → Alki in West Seattle');

// Kinds
eq(kindsOf({ category: 'Music', title: 'Kids Music Lessons, Band & Glee Club' }), ['lessons'], 'lessons win over glee');
eq(kindsOf({ category: 'Music', title: 'Music FunTime — Early Childhood Music' }), ['early'], 'early music');
eq(kindsOf({ category: 'Music', title: 'Youth Treble Choirs, Grades 1–12' }), ['choir'], 'choir');
eq(kindsOf({ category: 'Swimming', title: 'Year-Round USA Swimming Club Team' }), ['team'], 'swim club team');
eq(kindsOf({ category: 'Swimming', title: 'Year-Round Swim Lessons', subcategory: 'Year-Round' }), ['group'], 'lessons fallback');
eq(kindsOf({ category: 'Martial Arts', title: 'Kids Tang Soo Do Karate' }), ['karate'], 'tang soo do');
eq(kindsOf({ category: 'Martial Arts', title: 'Kids Hapkido Class' }), ['other'], 'hapkido → other');
eq(kindsOf({ category: 'Dance', title: 'Ballet, Tap, Jazz & Hip Hop' }), ['ballet', 'hiphop', 'jazztap'], 'dance tags');
eq(kindsOf({ category: 'Dance', title: 'Grade School Dance' }), [], 'no style named');
eq(kindsOf({ category: 'Camps', title: 'x', subcategory: 'Summer weeks, School breaks' }), ['Summer weeks', 'School breaks'], 'camps by When');
eq(kindsOf({ category: 'Sports', title: 'Goalkeeper Development Program', subcategory: null }), ['soccer'], 'goalkeeper → soccer');
eq(kindsOf({ category: 'Sports', title: 'Junior Roller Derby', subcategory: 'Roller Derby' }), ['skating'], 'derby → skating');
eq(kindsOf({ category: 'Sports', title: 'Indoor Skatepark Lessons', subcategory: 'Skateboarding' }), ['skateboarding'], 'skatepark');
eq(kindsOf({ category: 'Language', title: 'Spanish, Mandarin & French Immersion' }), ['spanish', 'french', 'mandarin'], 'language tags');
eq(kindsOf({ category: 'Cooking', title: 'Kids Cooking Classes' }), [], 'cooking has no kinds');
ok(showKinds('Music', 17) && !showKinds('STEM', 7) && !showKinds('Cooking', 20), 'small categories skip kinds');
ok(Object.values(KIND_DEFS).every((d) => d.mode === 'pills' || d.kinds.every((k) => k.ex)), 'every tile has a line');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
