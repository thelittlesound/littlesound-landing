// Discover's search box (approved 2026-11-17): parents type the way they talk
// ("swim lessons near 98126 for a 7 year old") and we turn it into filters
// they can see and remove. Pure and client-safe.

import { ZIP_NEIGHBORHOODS } from '@/lib/discovery-logic';

export interface Place {
  /** A neighborhood name, as listings use them. */
  area: string;
  zip?: string;
  /** From the browser's location. */
  me?: boolean;
  /** From the family's profile. */
  profile?: boolean;
}

export interface SearchQuery {
  /** Discover category. */
  cat?: string;
  /** Kind key inside the category (lib/kinds.ts). */
  kind?: string | null;
  /** Camps only: subject theme ("Outdoor") or 'All'. */
  theme?: string;
  /** What the activity chip says, e.g. "Swim lessons". */
  act?: string;
  place?: Place;
  age?: number;
  kidId?: string;
  free?: boolean;
  under?: number;
  /** Words we didn't recognize: searched as plain text. */
  text?: string;
}

// Rough middle of each neighborhood (lat, lon). Only used to rank "closest
// first" and to name where a phone is; good to about half a mile.
export const AREA_CENTERS: Record<string, [number, number]> = {
  'West Seattle': [47.561, -122.387], 'Delridge': [47.545, -122.362], 'White Center': [47.517, -122.355],
  'Burien': [47.470, -122.347], 'Normandy Park': [47.436, -122.341], 'Des Moines': [47.402, -122.324],
  'SeaTac': [47.444, -122.297], 'Tukwila': [47.474, -122.261], 'South Park': [47.528, -122.323],
  'Georgetown': [47.546, -122.320], 'South Seattle': [47.540, -122.300], 'SODO': [47.580, -122.334],
  'Rainier Beach': [47.513, -122.262], 'Columbia City': [47.560, -122.287], 'Beacon Hill': [47.567, -122.308],
  'Mount Baker': [47.578, -122.290], 'International District': [47.598, -122.324], 'Downtown': [47.606, -122.334],
  'Belltown': [47.614, -122.346], 'First Hill': [47.608, -122.323], 'Central District': [47.608, -122.302],
  'Leschi': [47.600, -122.288], 'Madrona': [47.612, -122.289], 'Capitol Hill': [47.623, -122.319],
  'Madison Valley': [47.624, -122.296], 'Eastlake': [47.640, -122.326], 'Montlake': [47.640, -122.305],
  'South Lake Union': [47.627, -122.337], 'Seattle Center': [47.621, -122.352], 'Queen Anne': [47.637, -122.357],
  'Interbay': [47.645, -122.378], 'Magnolia': [47.650, -122.400], 'Fremont': [47.651, -122.350],
  'Wallingford': [47.661, -122.334], 'Ballard': [47.668, -122.384], 'Phinney Ridge': [47.675, -122.354],
  'Green Lake': [47.680, -122.328], 'Greenwood': [47.691, -122.355], 'Crown Hill': [47.695, -122.372],
  'University District': [47.661, -122.313], 'University Village': [47.663, -122.299], 'Laurelhurst': [47.661, -122.278],
  'Wedgwood': [47.690, -122.290], 'Maple Leaf': [47.695, -122.318], 'Northeast Seattle': [47.685, -122.295],
  'Northgate': [47.706, -122.325], 'North Seattle': [47.705, -122.340], 'Lake City': [47.719, -122.296],
  'Shoreline': [47.756, -122.341], 'Kirkland': [47.681, -122.209], 'Redmond': [47.674, -122.121],
  'Bellevue': [47.610, -122.201], 'Mercer Island': [47.570, -122.222], 'Renton': [47.482, -122.217],
};
/** Other names parents use for a place. */
export const AREA_ALIASES: Record<string, string> = {
  'alki': 'West Seattle', 'admiral': 'West Seattle', 'fauntleroy': 'West Seattle', 'arbor heights': 'West Seattle',
  'the junction': 'West Seattle', 'morgan junction': 'West Seattle', 'high point': 'Delridge', 'highland park': 'Delridge',
  'u district': 'University District', 'udistrict': 'University District', 'cap hill': 'Capitol Hill', 'slu': 'South Lake Union',
  'chinatown': 'International District', 'sodo': 'SODO', 'u village': 'University Village', 'boulevard park': 'White Center',
};

/** Within this many miles counts as nearby; farther waits behind "Show N farther away". */
export const NEARBY_MILES = 7;

export function milesBetween(a: [number, number], b: [number, number]): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The neighborhood nearest a point (for "Use my location"). */
export function nearestArea(lat: number, lon: number): { area: string; miles: number } {
  let best = { area: 'Citywide', miles: Infinity };
  for (const [area, c] of Object.entries(AREA_CENTERS)) {
    const m = milesBetween([lat, lon], c);
    if (m < best.miles) best = { area, miles: m };
  }
  return best;
}

/**
 * How close a listing's neighborhood is to the place searched.
 * tier 0 = same neighborhood, 1 = nearby (with miles), 2 = several locations
 * (Citywide) or unknown, 3 = farther.
 */
export function closeness(neighborhood: string, place: Place | null | undefined): { tier: 0 | 1 | 2 | 3; miles: number | null } {
  if (!place) return { tier: 0, miles: null };
  if (neighborhood === place.area) return { tier: 0, miles: 0 };
  const a = AREA_CENTERS[neighborhood];
  const b = AREA_CENTERS[place.area];
  if (neighborhood === 'Citywide' || !a || !b) return { tier: 2, miles: null };
  const miles = milesBetween(a, b);
  return { tier: miles <= NEARBY_MILES ? 1 : 3, miles };
}

/** "Near 98126 · West Seattle", "Near you · Delridge", "In or near Burien". */
export function placeLabel(p: Place): string {
  if (p.me) return `Near you · ${p.area}`;
  if (p.zip) return `Near ${p.zip} · ${p.area}`;
  return `In or near ${p.area}`;
}

// What parents type → Discover category and kind. Specific before general;
// the first match wins.
export const ACTIVITY_WORDS: [label: string, cat: string, kind: string | null, re: RegExp][] = [
  ['Swim team', 'Swimming', 'team', /\b(swim ?team|swim club|competitive swim)/],
  ['Diving', 'Swimming', 'dive', /\bdiv(e|ing)\b/],
  ['Private swim lessons', 'Swimming', 'private', /\b(private swim|backyard swim|swim lessons at home|at.home swim)/],
  ['Swim lessons', 'Swimming', 'group', /\b(swim(ming)? lessons?|learn to swim)/],
  ['Swimming', 'Swimming', null, /\bswim(ming)?\b/],
  ['Instrument lessons', 'Music', 'lessons', /\b(piano|guitar|drums?|violin|cello|ukulele|bass|instruments?|music lessons?)\b/],
  ['Choir & singing', 'Music', 'choir', /\b(choir|chorus|sing|singing|voice lessons?)\b/],
  ['Band & orchestra', 'Music', 'ens', /\b(band|orchestra)\b/],
  ['Music', 'Music', null, /\bmusic\b/],
  ['Jiu-jitsu', 'Martial Arts', 'bjj', /\b(jiu.?jitsu|bjj|jujitsu|grappling)\b/],
  ['Taekwondo', 'Martial Arts', 'tkd', /\b(taekwondo|tae kwon do|tkd)\b/],
  ['Karate', 'Martial Arts', 'karate', /\b(karate|tang soo do)\b/],
  ['Judo', 'Martial Arts', 'judo', /\bjudo\b/],
  ['Martial arts', 'Martial Arts', null, /\b(martial arts?|self.?defen[cs]e|kickboxing)\b/],
  ['Soccer', 'Sports', 'soccer', /\b(soccer|futsal)\b/],
  ['Baseball & softball', 'Sports', 'baseball', /\b(baseball|softball|t.?ball|tee.?ball|little league)\b/],
  ['Basketball', 'Sports', 'basketball', /\b(basketball|hoops)\b/],
  ['Volleyball', 'Sports', 'volleyball', /\bvolleyball\b/],
  ['Football', 'Sports', 'football', /\b(football|flag football)\b/],
  ['Lacrosse', 'Sports', 'lacrosse', /\blacrosse\b/],
  ['Running', 'Sports', 'running', /\b(running|cross country|track)\b/],
  ['Tennis & pickleball', 'Sports', 'tennis', /\b(tennis|pickleball)\b/],
  ['Gymnastics', 'Sports', 'gymnastics', /\b(gymnastics|tumbling|cheer)\b/],
  ['Climbing', 'Sports', 'climbing', /\b(climbing|bouldering)\b/],
  ['Skateboarding', 'Sports', 'skateboarding', /\b(skateboard(ing)?|skate park)\b/],
  ['Skating & derby', 'Sports', 'skating', /\b(ice skating|skating|hockey|roller derby)\b/],
  ['Wrestling', 'Sports', 'wrestling', /\bwrestling\b/],
  ['Ultimate', 'Sports', 'ultimate', /\bultimate\b/],
  ['Sports', 'Sports', null, /\b(sports?|team sports?)\b/],
  ['Ballet', 'Dance', 'ballet', /\bballet\b/],
  ['Hip hop', 'Dance', 'hiphop', /\b(hip ?hop|k.?pop|breakdanc\w*)\b/],
  ['Jazz & tap', 'Dance', 'jazztap', /\b(jazz dance|tap dance|tap)\b/],
  ['Dance', 'Dance', null, /\b(dance|dancing)\b/],
  ['Musical theatre', 'Theater', 'musical', /\bmusical theat(er|re)|musicals?\b/],
  ['Acting & improv', 'Theater', 'acting', /\b(acting|improv)\b/],
  ['Theater', 'Theater', null, /\b(drama|theater|theatre)\b/],
  ['Clay & pottery', 'Arts', 'clay', /\b(pottery|ceramics|clay)\b/],
  ['Drawing & painting', 'Arts', 'draw', /\b(drawing|painting|draw|paint)\b/],
  ['Art', 'Arts', null, /\b(art|arts|crafts?)\b/],
  ['On the water', 'Outdoor', 'water', /\b(sailing|sail|rowing|kayak\w*|paddle\w*|canoe)\b/],
  ['Farm & garden', 'Outdoor', 'farm', /\b(farm|gardening|garden)\b/],
  ['Nature & forest', 'Outdoor', 'nature', /\b(nature|forest|hiking|outdoors?)\b/],
  ['Parent & me classes', 'Early Childhood', null, /\b(parent.?and.?me|mommy.?and.?me|parent.?child|toddler class(es)?|baby class(es)?)\b/],
  ['Spanish', 'Language', 'spanish', /\bspanish\b/],
  ['French', 'Language', 'french', /\bfrench\b/],
  ['Mandarin', 'Language', 'mandarin', /\b(mandarin|chinese)\b/],
  ['Japanese', 'Language', 'japanese', /\bjapanese\b/],
  ['German', 'Language', 'german', /\bgerman\b/],
  ['Languages', 'Language', null, /\b(language|languages|immersion)\b/],
  ['STEM', 'STEM', null, /\b(stem|steam|coding|robotics?|lego|science|engineering|chess|minecraft)\b/],
  ['Cooking', 'Cooking', null, /\b(cooking|baking|chef|culinary)\b/],
  ['Tutoring', 'Academic', null, /\b(tutor|tutoring|math|reading|homework)\b/],
];

const WHEN_WORDS: [kind: string, word: string, re: RegExp][] = [
  ['Overnight', 'overnight', /\b(overnight|sleepaway|sleep.?away)\b/],
  ['School breaks', 'school-break', /\b(winter break|spring break|mid.?winter|thanksgiving|break|days? off|no school)\b/],
  ['Summer weeks', 'summer', /\bsummer\b/],
  ['Before & after care', 'before & after care', /\b(before.?and.?after|after.?care|before.?care)\b/],
];
// In a camp search, the subject becomes the camp's theme.
const CAMP_THEME_FOR: Record<string, string> = {
  Swimming: 'Swimming', Music: 'Music', 'Martial Arts': 'Martial Arts', Sports: 'Sports', Dance: 'Dance', Theater: 'Theater',
  Arts: 'Arts', Outdoor: 'Outdoor', Language: 'Language', STEM: 'STEM', Cooking: 'Cooking', Academic: 'Academic',
};

function norm(text: string): string {
  return ` ${String(text || '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim()} `;
}

/** Reads a typed phrase. Only what it understood is set. */
export function parse(text: string, kids: { id: string; name: string }[] = []): SearchQuery {
  const t = norm(text);
  const out: SearchQuery = {};

  for (const k of kids) {
    if (k.name && new RegExp(`\\b${k.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')}\\b`).test(t)) { out.kidId = k.id; break; }
  }

  const zip = t.match(/\b(98\d{3})\b/);
  if (zip && ZIP_NEIGHBORHOODS[zip[1]]) out.place = { zip: zip[1], area: ZIP_NEIGHBORHOODS[zip[1]] };
  else {
    const names = [...Object.keys(AREA_CENTERS), ...Object.keys(AREA_ALIASES)].sort((a, b) => b.length - a.length);
    const hit = names.find((n) => new RegExp(`\\b${n.toLowerCase()}\\b`).test(t));
    if (hit) out.place = { area: AREA_CENTERS[hit] ? hit : AREA_ALIASES[hit] };
  }

  const m = t.match(/\b(\d{1,2})\s*-?\s*(year|yr)s?\s*-?\s*olds?\b/) || t.match(/\bages?\s*(\d{1,2})\b/) || t.match(/\b(\d{1,2})\s*yo\b/);
  if (m) out.age = Number(m[1]);
  const grade = t.match(/\b(\d{1,2})(st|nd|rd|th)\s*grade/);
  if (grade) out.age = Number(grade[1]) + 5;
  if (out.age == null) {
    if (/\bkinder(garten|gartner)?\b/.test(t)) out.age = 5;
    else if (/\b(preschool(er)?s?|pre-?k)\b/.test(t)) out.age = 4;
    else if (/\btoddlers?\b/.test(t)) out.age = 2;
    else if (/\b(bab(y|ies)|infants?)\b/.test(t)) out.age = 1;
    else if (/\btweens?\b/.test(t)) out.age = 11;
    else if (/\b(teens?|teenagers?|high school)\b/.test(t)) out.age = 14;
    else if (/\bmiddle school\b/.test(t)) out.age = 12;
  }
  if (out.age != null && (out.age < 0 || out.age > 18)) delete out.age;

  if (/\bfree\b/.test(t)) out.free = true;
  const under = t.match(/\b(under|below|less than|max)\s*\$?(\d+)/);
  if (under) out.under = Number(under[2]);

  const act = ACTIVITY_WORDS.find(([, , , re]) => re.test(t));
  const when = WHEN_WORDS.find(([, , re]) => re.test(t));
  const camp = /\bcamps?\b/.test(t) || (!act && !!when);
  if (camp) {
    out.cat = 'Camps';
    out.kind = when ? when[0] : null;
    out.theme = act ? CAMP_THEME_FOR[act[1]] ?? 'All' : 'All';
    const subject = act && out.theme !== 'All' ? (out.theme === 'Outdoor' ? 'outdoor' : out.theme === 'Martial Arts' ? 'martial arts' : out.theme) : '';
    const lbl = [subject, when ? when[1] : '', 'camps'].filter(Boolean).join(' ');
    out.act = lbl.charAt(0).toUpperCase() + lbl.slice(1);
  } else if (act) {
    out.cat = act[1];
    out.kind = act[2];
    out.theme = 'All';
    out.act = act[0];
  }

  const understood = out.kidId || out.place || out.age != null || out.free || out.under || out.cat;
  if (!understood && t.trim().length >= 2) out.text = t.trim();
  return out;
}

/** The chips a query becomes, in order. */
export function describe(q: SearchQuery, kids: { id: string; name: string }[] = []): string[] {
  const bits: string[] = [];
  if (q.act) bits.push(q.act);
  if (q.place) bits.push(placeLabel(q.place));
  if (q.age != null) bits.push(`Age ${q.age}`);
  if (q.kidId) bits.push(`For ${kids.find((k) => k.id === q.kidId)?.name ?? 'your child'}`);
  if (q.free) bits.push('Free');
  if (q.under) bits.push(`Under $${q.under}`);
  if (q.text) bits.push(`“${q.text}”`);
  return bits;
}

/** Activity suggestions for what's typed so far (labels; each is itself a query). */
export function suggestActivities(typed: string, max = 4): string[] {
  const t = norm(typed).trim();
  if (!t) return [];
  const last = t.split(' ').pop() ?? '';
  const camps = ['Summer camps', 'School-break camps', 'Overnight camps', 'Outdoor summer camps', 'STEM summer camps', 'Sports summer camps', 'Art summer camps'];
  const labels = Array.from(new Set([...ACTIVITY_WORDS.map(([l]) => l), ...camps]));
  const parsed = parse(typed).act;
  const out = labels.filter((l) => {
    const ll = l.toLowerCase();
    return ll === (parsed ?? '').toLowerCase() || (last.length >= 2 && ll.split(/[ &-]+/).some((w) => w.startsWith(last)));
  });
  if (parsed && !out.includes(parsed)) out.unshift(parsed);
  return out.slice(0, max);
}

/** Place suggestions: ZIPs by their first digits, neighborhoods by name. */
export function suggestPlaces(typed: string, max = 4): { label: string; hint: string; query: string }[] {
  const t = norm(typed).trim();
  const last = t.split(' ').pop() ?? '';
  if (/^\d{2,5}$/.test(last)) {
    return Object.keys(ZIP_NEIGHBORHOODS)
      .filter((z) => z.startsWith(last))
      .slice(0, max)
      .map((z) => ({ label: z, hint: ZIP_NEIGHBORHOODS[z], query: z }));
  }
  if (last.length < 3) return [];
  const out: { label: string; hint: string; query: string }[] = [];
  for (const n of Object.keys(AREA_CENTERS)) {
    if (n.toLowerCase().split(' ').some((w) => w.startsWith(last)) || n.toLowerCase().includes(t)) out.push({ label: n, hint: 'Neighborhood', query: n });
  }
  for (const [alias, area] of Object.entries(AREA_ALIASES)) {
    if (alias.startsWith(last) && !out.some((o) => o.label === area)) {
      out.push({ label: alias.replace(/\b\w/g, (c) => c.toUpperCase()), hint: `in ${area}`, query: alias });
    }
  }
  return out.slice(0, max);
}

export const SEARCH_EXAMPLES = [
  'swim lessons near 98126',
  'jiu-jitsu for a 7 year old',
  'free summer camp in Burien',
  'winter break camp',
  'piano lessons under $150',
  'soccer in West Seattle',
];
