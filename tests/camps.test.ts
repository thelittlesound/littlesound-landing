import { campTheme, campWhens, isMainlyCamp, placeListing, themeFromText, whenFromText, CAMP_THEMES } from '@/lib/camps';
import { fitsKid } from '@/lib/kid-match';
import { isSummerProgram } from '@/lib/summer';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a: unknown, b: unknown, m: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)}`);

// Mainly a camp, or a program that also runs camps?
ok(isMainlyCamp('Youth Summer Sailing Camps'), 'sailing camps are camps');
ok(isMainlyCamp('Kids Camp: Kayak, Paddleboard & Sail (ages 6–12)'), '"Kids Camp:" is a camp');
ok(isMainlyCamp('Kids Culinary & Baking Camps (Winter Break)'), 'baking camps are camps');
ok(!isMainlyCamp('Kids Baking Classes, Camps & After-School'), 'classes + camps stays in its subject');
ok(!isMainlyCamp('Chess Classes, Camps & Clubs, K-8'), 'classes, camps & clubs stays');
ok(!isMainlyCamp('Farm & Garden Camps and After-School Programs'), 'camps + after-school programs stays');
ok(!isMainlyCamp('Environmental Learning at Camp Long'), 'Camp Long is a park');
ok(!isMainlyCamp('Youth Climbing Classes & Clubs (Mo Mini, Base Camp, Youth Club)'), 'Base Camp is a class name');
ok(!isMainlyCamp('Youth Tennis Group Lessons & Junior Camps'), 'lessons + camps stays');
ok(!isMainlyCamp('Recreational Youth Soccer'), 'no camp word');

// When it runs
eq(whenFromText('Youth Summer Sailing Camps'), ['Summer weeks'], 'summer');
eq(whenFromText('Kids Culinary & Baking Camps (Winter Break)'), ['School breaks'], 'winter break');
eq(whenFromText('Single Day Camp: Thanksgiving Break 2026'), ['School breaks'], 'single day');
eq(whenFromText('Summer and School Break Camps'), ['Summer weeks', 'School breaks'], 'both');
eq(whenFromText('Summer Overnight Camp (Camp Colman & Camp Orkila)'), ['Summer weeks', 'Overnight'], 'overnight summer');
eq(whenFromText('Creative Care (before & after care)'), ['Before & after care'], 'care is its own');
eq(whenFromText('Camps (Super Quest and Skill Thrill)'), ['Summer weeks'], 'nothing said → summer');
eq(campWhens({ subcategory: 'School breaks', title: 'Drama Quest - Create a Festival' }), ['School breaks'], 'stored wins over the title');
eq(campWhens({ subcategory: 'School breaks, Summer weeks', title: 'x' }), ['Summer weeks', 'School breaks'], 'several stored, in order');
eq(campWhens({ subcategory: 'Day Camps', title: 'Mid-Winter Break Day Camp' }), ['School breaks'], 'old label → read the title');

// Theme
ok(themeFromText('Youth Summer Sailing Camps') === 'Outdoor', 'sailing → Outdoor');
ok(themeFromText('Nike Soccer Camp at Moshier Park') === 'Sports', 'soccer → Sports');
ok(themeFromText('Camp Galileo STEAM Summer Camp') === 'STEM', 'STEAM → STEM');
ok(themeFromText('Pokemon LEGO Masters (Winter Camp)') === 'STEM', 'LEGO → STEM');
ok(themeFromText('Activity Camps — Art, LEGO, Science, Theater & More') === 'All-around', 'mixed → All-around');
ok(themeFromText('Summer Day Camp at High Point Community Center') === 'All-around', 'plain day camp → All-around');
ok(themeFromText('Start your summer party') === 'All-around', '"start"/"party" are not art');
ok(campTheme({ theme: 'Outdoor', title: 'Soccer camp' }) === 'Outdoor', 'stored theme wins');
ok(campTheme({ theme: 'Nonsense', title: 'Soccer camp' }) === 'Sports', 'unknown stored theme ignored');
ok(CAMP_THEMES.every((t) => t === 'All-around' || ['Sports','Swimming','Arts','Outdoor','STEM','Music','Dance','Cooking','Language','Martial Arts','Early Childhood','Theater','Camps','Academic'].includes(t)), 'themes are Discover categories');

// Where a new listing goes
eq(placeListing({ category: 'Outdoor', subcategory: 'Water Sports', title: 'Youth Summer Sailing Camps' }),
  { category: 'Camps', subcategory: 'Summer weeks', theme: 'Outdoor' }, 'sailing camp → Camps, theme Outdoor');
eq(placeListing({ category: 'Cooking', subcategory: 'Baking', title: 'Kids Baking Classes, Camps & After-School' }),
  { category: 'Cooking', subcategory: 'Baking', theme: null }, 'classes + camps stays');
eq(placeListing({ category: 'Camps', subcategory: 'Day Camps', title: 'Mid-Winter Break Day Camp (Beacon Hill)' }),
  { category: 'Camps', subcategory: 'School breaks', theme: 'All-around' }, 'a Camps search result gets When + theme');

// Kids: a camp matches by its theme
const outdoorKid = { age: 9, interests: ['Outdoor Adventure'] };
ok(fitsKid({ ageMin: 8, ageMax: 12, category: 'Camps', theme: 'Outdoor' }, outdoorKid), 'Outdoor kid sees an outdoor camp');
ok(!fitsKid({ ageMin: 8, ageMax: 12, category: 'Camps', theme: 'Sports' }, outdoorKid), '…but not a sports camp');
ok(fitsKid({ ageMin: 8, ageMax: 12, category: 'Camps', theme: 'Sports' }, { age: 9, interests: ['Camps'] }), 'a Camps kid sees every camp');

// Summer planner: break-only camps aren't summer weeks
ok(isSummerProgram({ category: 'Camps', subcategory: 'Summer weeks', title: 'x' }), 'summer camp');
ok(isSummerProgram({ category: 'Camps', subcategory: 'Overnight', title: 'x' }), 'overnight camp');
ok(!isSummerProgram({ category: 'Camps', subcategory: 'School breaks', title: 'Single Day Camp: Thanksgiving Break' }), 'Thanksgiving camp is not a summer week');
ok(isSummerProgram({ category: 'Cooking', subcategory: 'Baking', title: 'Kids Baking Classes, Camps & After-School' }), 'a subject listing with camps is still offered');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
