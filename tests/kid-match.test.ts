import { ageFits, browsableKids, categoriesFor, fitsKid, INTEREST_CATEGORIES, namedCategories } from '@/lib/kid-match';
import { INTERESTS } from '@/lib/family-profile';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

ok(INTERESTS.every((i) => INTEREST_CATEGORIES[i]?.length), 'every profile interest maps to Discover categories');

const kids = browsableKids([
  { id: 'k_ella0001', name: 'Ella', age: 10, interests: ['Swim & Aquatics', 'STEM & Tech', 'Nope'] },
  { id: 'k_jack0001', name: 'Jack', age: '5', interests: ['Arts & Crafts'] },
  { id: 'k_noname01', age: 7 },
  { name: 'No id', age: 3 },
  { id: 'k_ella0001', name: 'Dup' },
  'junk',
]);
ok(kids.length === 2 && kids[0].name === 'Ella' && kids[1].age === 5, 'only kids with an id and a name, no duplicates');
ok(kids[0].interests.join() === 'Swim & Aquatics,STEM & Tech', 'unknown interests dropped');
ok(browsableKids(null).length === 0 && browsableKids({}).length === 0, 'no kids list → none');

const ella = kids[0], jack = kids[1];
ok([...categoriesFor(ella)].sort().join() === 'STEM,Swimming', 'Ella → STEM, Swimming');
ok(categoriesFor(jack).has('Arts') && categoriesFor(jack).has('Cooking') && categoriesFor(jack).has('Early Childhood'), 'Jack (5) → Arts, Cooking, plus Early Childhood');
ok(categoriesFor({ age: 4, interests: [] }).size === 0, 'no interests → no category preference');

const swim = { ageMin: 6, ageMax: 12, category: 'Swimming' };
const art = { ageMin: 3, ageMax: 6, category: 'Arts' };
ok(fitsKid(swim, ella) && !fitsKid(art, ella), 'Ella: swim fits, toddler art does not');
ok(!fitsKid(swim, jack) && fitsKid(art, jack), 'Jack: art fits, swim (6–12) is too old');
ok(fitsKid({ ageMin: 8, ageMax: 14, category: 'Theater' }, ella, false), 'show everything: any category at her age');
ok(!fitsKid({ ageMin: 8, ageMax: 14, category: 'Theater' }, ella, true), 'interests on: theater left out for Ella');
ok(fitsKid(swim, { age: null, interests: [] }), 'no age, no interests → everything');
ok(ageFits({ ageMin: null, ageMax: null }, 4) && ageFits({ ageMin: 4, ageMax: null }, 17) && !ageFits({ ageMin: 4, ageMax: 6 }, 7), 'age edges');


// "Ella likes" labels: only categories the parent named.
ok(INTERESTS.every((i) => namedCategories({ interests: [i] }).size > 0), 'every profile interest names at least one category');
ok([...namedCategories({ interests: ['Arts & Crafts'] })].join() === 'Arts', 'Arts & Crafts → Arts only (not Cooking)');
ok([...namedCategories({ interests: ['Music & Dance', 'Dance & Movement'] })].sort().join() === 'Dance,Music', 'no duplicates');
ok(!namedCategories({ interests: ['Arts & Crafts'] }).has('Early Childhood'), 'Early Childhood never added for labels');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
