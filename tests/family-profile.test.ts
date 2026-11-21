import { cleanProfile, INTERESTS, MAX_KIDS } from '@/lib/family-profile';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const good = (r: ReturnType<typeof cleanProfile>) => ('error' in r ? null : r);

const r1 = good(cleanProfile({
  first_name: '  Evan ',
  neighborhood: 'Ballard',
  kids: [
    { id: 'k_abcd1234', name: 'Maya', age: '9', interests: ['Swimming', 'STEM', 'STEM', 'Hacking'] },
    { id: 'k_efgh5678', name: 'Leo', age: 4, interests: ['Camps'] },
  ],
}));
ok(!!r1, 'valid profile accepted');
ok(r1?.first_name === 'Evan', 'first name trimmed');
ok(r1?.kids[0].age === 9 && r1?.kids[1].age === 4, 'ages as numbers (string "9" too)');
ok(JSON.stringify(r1?.kids[0].interests) === JSON.stringify(['Swimming', 'STEM']), 'per-kid interests: duplicates and unknown ones dropped');
ok(JSON.stringify(r1?.kids[1].interests) === JSON.stringify(['Camps']), 'each kid keeps their own interests');
ok(JSON.stringify(r1?.preferences) === JSON.stringify(['Camps', 'Swimming', 'STEM']), 'preferences = all kids together, in list order');
ok(r1?.kids[0].id === 'k_abcd1234', 'kid ids kept (calendar items point at them)');

const r2 = good(cleanProfile({ first_name: '', neighborhood: 'Atlantis', kids: [{ id: 'k_abcd1234', name: '', age: '', interests: [] }] }));
ok(r2?.first_name === null && r2?.neighborhood === null, 'blank name and unknown neighborhood become empty');
ok(r2?.kids.length === 0 && r2?.preferences.length === 0, 'an empty kid row is skipped');

const r3 = good(cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'Maya' }] }));
ok(!!r3 && r3.kids[0].age === undefined && r3.kids[0].interests === undefined, 'name only is fine (no age, no interests)');

ok('error' in cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'A', age: 19 }] }), 'age over 18 rejected');
ok('error' in cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'A', age: '3.5' }] }), 'non-whole age rejected');
ok('error' in cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'A', age: -1 }] }), 'negative age rejected');
ok('error' in cleanProfile({ kids: [{ id: 'bad', name: 'A' }] }), 'bad kid id rejected');
ok('error' in cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'A' }, { id: 'k_abcd1234', name: 'B' }] }), 'duplicate kid ids rejected');
ok('error' in cleanProfile({ kids: 'nope' }), 'kids must be a list');
ok('error' in cleanProfile({ kids: Array.from({ length: MAX_KIDS + 1 }, (_, i) => ({ id: `k_kid0000${i}`, name: 'x' })) }), 'too many kids rejected');
ok(good(cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'x'.repeat(60) }] }))?.kids[0].name?.length === 40, 'long names trimmed to 40');
ok(INTERESTS.length === 14 && INTERESTS.includes('Early Childhood'), 'interests = Discover\'s 14, Early Childhood included');
const r4 = good(cleanProfile({ kids: [{ id: 'k_abcd1234', name: 'Old', interests: ['Music & Dance', 'Sports & Athletics', 'Dance'] }] }));
ok(JSON.stringify(r4?.kids[0].interests) === JSON.stringify(['Sports', 'Music', 'Dance']), 'old labels saved before 11-20 come back in today\'s names (no Martial Arts added)');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
