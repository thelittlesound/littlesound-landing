import { CATEGORY_NAMES, OLD_LABELS, formCategory, normalizeCategory, normalizeInterests } from '@/lib/categories';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

ok(CATEGORY_NAMES.length === 14 && new Set(CATEGORY_NAMES).size === 14, '14 distinct categories');
const iconSrc = readFileSync(`${process.env.LS_ROOT}/app/components/LineIcon.tsx`, 'utf8');
ok(CATEGORY_NAMES.every((c) => iconSrc.includes(`"${c}": '`)), 'every category has a line icon');
ok(Object.values(OLD_LABELS).every((v) => v.length && v.every((c) => CATEGORY_NAMES.includes(c))), 'every old label maps into the 14');

ok(normalizeCategory('Martial Arts') === 'Martial Arts', 'today\'s name kept');
ok(normalizeCategory('Swim & Aquatics') === 'Swimming' && normalizeCategory('Music & Dance') === 'Music', 'old labels → first subject');
ok(normalizeCategory('Other') === 'Arts', '"Other" still shows as Arts until filed');
ok(normalizeCategory(null) === 'Other' && normalizeCategory('Weird') === 'Weird', 'no category / unknown unchanged');

ok(formCategory('Dance & Movement') === 'Dance' && formCategory('Cooking') === 'Cooking', 'form opens on today\'s name');
ok(formCategory('Other') === '' && formCategory(null) === '', '"Other" asks the provider to pick');

ok(normalizeInterests(['STEM', 'Camps', 'Music & Dance', 'x', 3]).join() === 'Camps,Music,Dance,STEM', 'interests: mapped, unknowns dropped, list order');
ok(normalizeInterests('nope').length === 0, 'not a list → none');

// No page keeps its own copy of the old list.
const files = ['app/providers/signup/page.tsx', 'app/providers/listings/new/ListingForm.tsx', 'app/families/signup/page.tsx',
  'app/for-families/page.tsx', 'app/components/Categories.tsx', 'app/discover/page.tsx', 'lib/family-profile.ts', 'lib/kid-match.ts',
  'lib/catalog-server.ts', 'lib/claimable.ts'];
for (const f of files) {
  const src = readFileSync(`${process.env.LS_ROOT}/${f}`, 'utf8');
  ok(!Object.keys(OLD_LABELS).some((o) => o.includes('&') && src.includes(`'${o}'`)), `${f}: no old labels`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
