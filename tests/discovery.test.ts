import { cleanNeighborhood, allQueries, buildKnown, cleanClub, dueQueries, isNew, isOwnSite, siteKey, DISCOVERY_AREAS } from '@/lib/discovery-logic';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

// searches
const qs = allQueries();
ok(qs.length === 48 && new Set(qs.map((q) => q.key)).size === 48, '16 sports × 3 areas, unique keys: ' + qs.length);
const now = new Date('2026-11-17T06:00:00Z');
ok(dueQueries(new Map(), now).length === 48, 'nothing run yet → all due');
const runs = new Map<string, { at: string | null; failed?: boolean }>([
  ['soccer|west-seattle', { at: '2026-11-10T00:00:00Z' }],
  ['baseball|west-seattle', { at: '2026-10-01T00:00:00Z' }],
  ['lacrosse|west-seattle', { at: '2026-11-17T05:30:00Z', failed: true }],
  ['football|west-seattle', { at: '2026-11-17T04:00:00Z', failed: true }],
]);
const due = dueQueries(runs, now).map((q) => q.key);
ok(!due.includes('soccer|west-seattle'), 'ran a week ago → not due');
ok(due.includes('baseball|west-seattle'), 'ran 47 days ago → due');
ok(!due.includes('lacrosse|west-seattle') && due.includes('football|west-seattle'), 'failed: retried after an hour, not sooner');
ok(due.indexOf('volleyball|west-seattle') < due.indexOf('baseball|west-seattle'), 'never-run before oldest');

// own sites
ok(isOwnSite('https://www.westseattlebaseball.com') && isOwnSite('swtitanslacrosse.teamsnapsites.com'), 'club sites are own sites');
ok(!isOwnSite('https://classcub.com/provider/x') && !isOwnSite('https://www.facebook.com/club') && !isOwnSite('https://westseattleblog.com/2025/x') && !isOwnSite('m.facebook.com/x'), 'directories, news and social are not');
ok(!isOwnSite('javascript:alert(1)') && !isOwnSite('localhost') && !isOwnSite(''), 'junk rejected');
ok(siteKey('https://clubs.bluesombrero.com/westseattlesoccer') !== siteKey('https://clubs.bluesombrero.com/hpfc'), 'two clubs on one platform are different sites');
ok(siteKey('https://www.gotimeathletics.com/volleyball') === siteKey('http://gotimeathletics.com/'), 'same host, any page, www or not');

// known
const known = buildKnown([
  { business: 'West Seattle Soccer Club', website: 'https://clubs.bluesombrero.com/westseattlesoccer' },
  { business: 'Go Time Athletics', website: 'https://www.gotimeathletics.com' },
  { business: 'Some Dismissed Studio', website: null },
]);
ok(!isNew({ organization: 'Seattle Volleyball Academy', website: 'https://gotimeathletics.com/sva' }, known), 'a known site is not new');
ok(!isNew({ organization: 'The West Seattle Soccer Club', website: 'https://wssc.example.org' }, known), 'a known name (minus "the", "club") is not new');
ok(!isNew({ organization: 'Some Dismissed Studio LLC', website: 'https://studio.example' }, known), 'dismissed/known names stay out');
ok(isNew({ organization: 'Highline Premier FC', website: 'https://clubs.bluesombrero.com/hpfc' }, known), 'another club on the same platform is new');

// cleanClub
const ws = DISCOVERY_AREAS[0];
const good = cleanClub({ organization: 'Alki Rowing', program_title: 'Junior Rowing', website: 'https://alkirowing.example', source_url: 'https://www.alkirowing.example/juniors', neighborhood: 'West Seattle', age_min: 16, age_max: 12, level: 'club', serves: 'Ages 12+', price: 450, price_unit: 'season', description: 'Rowing.' }, ws);
ok(!('skip' in good) && good.ageMin === 12 && good.ageMax === 16 && good.level === 'club' && good.price === 450, 'valid club, ages swapped');
ok('skip' in cleanClub({ organization: 'X', website: 'https://www.facebook.com/x' }, ws), 'facebook-only → skipped');
ok('skip' in cleanClub({ organization: 'X', website: 'https://x.example', source_url: 'https://classcub.com/x' }, ws), 'facts from a directory → skipped');
ok('skip' in cleanClub({ organization: 'X', website: 'https://x.example', source_url: 'https://y.example/x' }, ws), 'facts from another site → skipped');
const odd = cleanClub({ organization: 'Y', website: 'y.example', neighborhood: 'Mars 51', level: 'elite', age_min: 40, price: -1, price_unit: 'week' }, DISCOVERY_AREAS[2]);
ok(!('skip' in odd) && odd.neighborhood === 'White Center' && odd.level === null && odd.ageMin === null && odd.price === null && odd.priceUnit === null && odd.title === 'Y', 'bad values become null, area default neighborhood');

// neighborhoods
ok(cleanNeighborhood('Ballard') === 'Ballard' && cleanNeighborhood('south park') === 'South Park' && cleanNeighborhood('Burien') === 'Burien', 'real neighborhoods and cities kept, title-cased');
ok(cleanNeighborhood('Seattle') === 'Citywide' && cleanNeighborhood('Multiple locations') === 'Citywide', 'whole-city answers become Citywide');
ok(cleanNeighborhood('<b>x</b>') === null && cleanNeighborhood('98106') === null && cleanNeighborhood('') === null && cleanNeighborhood(7) === null, 'junk rejected');
const g = cleanClub({ organization: 'Seattle Jiu-Jitsu Academy', website: 'https://sjja.example', neighborhood: 'Georgetown' }, DISCOVERY_AREAS[2]);
ok(!('skip' in g) && g.neighborhood === 'Georgetown', 'Georgetown stays Georgetown (was forced to Citywide)');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
