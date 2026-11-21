import { ageFits, browsableKids, categoriesFor, fitsKid, INTERESTS, namedCategories } from '@/lib/kid-match';
import { INTERESTS as PROFILE_INTERESTS } from '@/lib/family-profile';
import { CATEGORY_NAMES } from '@/lib/categories';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

ok(INTERESTS === CATEGORY_NAMES && PROFILE_INTERESTS === CATEGORY_NAMES, 'interests are Discover\'s 14 everywhere');

const kids = browsableKids([
  { id: 'k_ella0001', name: 'Ella', age: 10, interests: ['Swimming', 'STEM', 'Nope'] },
  { id: 'k_jack0001', name: 'Jack', age: '5', interests: ['Arts & Crafts'] },
  { id: 'k_noname01', age: 7 },
  { name: 'No id', age: 3 },
  { id: 'k_ella0001', name: 'Dup' },
  'junk',
]);
ok(kids.length === 2 && kids[0].name === 'Ella' && kids[1].age === 5, 'only kids with an id and a name, no duplicates');
ok(kids[0].interests.join() === 'Swimming,STEM', 'unknown interests dropped');
ok(kids[1].interests.join() === 'Arts', 'old label read in today\'s name (Arts & Crafts → Arts)');
ok(browsableKids(null).length === 0 && browsableKids({}).length === 0, 'no kids list → none');

const ella = kids[0], jack = kids[1];
ok([...categoriesFor(ella)].sort().join() === 'STEM,Swimming', 'Ella → STEM, Swimming');
ok([...categoriesFor(jack)].sort().join() === 'Arts,Early Childhood', 'Jack (5) → Arts plus Early Childhood (auto for 5 and under); no hidden Cooking');
ok([...categoriesFor({ age: 4, interests: ['Early Childhood'] })].join() === 'Early Childhood', 'Early Childhood picked as a chip');
ok(categoriesFor({ age: 8, interests: ['Early Childhood', 'Music'] }).has('Early Childhood'), 'chip counts at any age');
ok(!categoriesFor({ age: 8, interests: ['Music'] }).has('Early Childhood'), 'no auto Early Childhood over 5');
ok(categoriesFor({ age: 4, interests: [] }).size === 0, 'no interests → no category preference');
ok(!categoriesFor({ age: 10, interests: ['Sports & Athletics'] }).has('Martial Arts'), 'old Sports label no longer matches Martial Arts');

const swim = { ageMin: 6, ageMax: 12, category: 'Swimming' };
const art = { ageMin: 3, ageMax: 6, category: 'Arts' };
ok(fitsKid(swim, ella) && !fitsKid(art, ella), 'Ella: swim fits, toddler art does not');
ok(!fitsKid(swim, jack) && fitsKid(art, jack), 'Jack: art fits, swim (6–12) is too old');
ok(fitsKid({ ageMin: 8, ageMax: 14, category: 'Theater' }, ella, false), 'show everything: any category at her age');
ok(!fitsKid({ ageMin: 8, ageMax: 14, category: 'Theater' }, ella, true), 'interests on: theater left out for Ella');
ok(fitsKid(swim, { age: null, interests: [] }), 'no age, no interests → everything');
ok(ageFits({ ageMin: null, ageMax: null }, 4) && ageFits({ ageMin: 4, ageMax: null }, 17) && !ageFits({ ageMin: 4, ageMax: 6 }, 7), 'age edges');

// "Ella likes" labels: only categories the parent named.
ok(CATEGORY_NAMES.every((c) => [...namedCategories({ interests: [c] })].join() === c), 'every chip names exactly its category');
ok([...namedCategories({ interests: ['Music & Dance', 'Dance & Movement'] })].join() === 'Music,Dance', 'old labels, no duplicates');
ok(!namedCategories({ age: 4, interests: ['Arts'] } as any).has('Early Childhood'), 'auto Early Childhood never labeled "likes"');
ok(namedCategories({ interests: ['Early Childhood'] }).has('Early Childhood'), 'picked Early Childhood is labeled');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
