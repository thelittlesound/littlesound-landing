// "What kind?" inside each Discover category (approved 2026-11-17, Discover
// redesign). Each listing is sorted into a kind by its own words (title +
// subcategory); Camps use When it runs. Pure and client-safe.

import { campWhens, CAMP_WHEN } from '@/lib/camps';

export interface Kind {
  key: string;
  label: string;
  /** One plain line on what it's like (tiles). Empty for pill-style kinds. */
  ex: string;
  re?: RegExp;
}

export interface KindDef {
  /** The question above the choices; {name} becomes the child's name. */
  question: string;
  /** tiles: cards with a line each. pills: a compact row (many short choices). */
  mode: 'tiles' | 'pills';
  /** tags: a listing can be several kinds (a studio teaching ballet and hip hop). */
  tags?: boolean;
  kinds: Kind[];
  /** Kind for a listing nothing else matched (none: it has no kind). */
  fallback?: string;
  /** Order to test the kinds in, when it differs from the display order. */
  matchOrder?: string[];
}

/** Categories smaller than this skip "What kind?": one question is enough. */
export const MIN_FOR_KINDS = 8;

export const KIND_DEFS: Record<string, KindDef> = {
  Sports: {
    question: 'Which sport?',
    mode: 'pills',
    fallback: 'more',
    kinds: [
      { key: 'soccer', label: 'Soccer', ex: '', re: /soccer|futsal|goalkeeper/i },
      { key: 'baseball', label: 'Baseball & softball', ex: '', re: /baseball|softball|t-?ball|tee-?ball|little league/i },
      { key: 'basketball', label: 'Basketball', ex: '', re: /basketball|hoops/i },
      { key: 'volleyball', label: 'Volleyball', ex: '', re: /volleyball/i },
      { key: 'football', label: 'Football', ex: '', re: /football/i },
      { key: 'lacrosse', label: 'Lacrosse', ex: '', re: /lacrosse/i },
      { key: 'running', label: 'Running', ex: '', re: /running|cross country|\btrack\b/i },
      { key: 'tennis', label: 'Tennis & pickleball', ex: '', re: /tennis|pickleball/i },
      { key: 'gymnastics', label: 'Gymnastics', ex: '', re: /gymnast|tumbl|cheer|circus/i },
      { key: 'climbing', label: 'Climbing', ex: '', re: /climb|boulder/i },
      { key: 'skateboarding', label: 'Skateboarding', ex: '', re: /skateboard|skatepark/i },
      { key: 'skating', label: 'Skating & derby', ex: '', re: /skat(e|ing)|hockey|derby/i },
      { key: 'wrestling', label: 'Wrestling', ex: '', re: /wrestl/i },
      { key: 'ultimate', label: 'Ultimate', ex: '', re: /ultimate/i },
      { key: 'waterpolo', label: 'Water polo', ex: '', re: /water polo/i },
      { key: 'multi', label: 'Several sports', ex: '', re: /multi|leagues|clinics/i },
      { key: 'more', label: 'More sports', ex: '' },
    ],
  },
  Swimming: {
    question: 'What kind of swimming?',
    mode: 'tiles',
    fallback: 'group',
    kinds: [
      { key: 'group', label: 'Group lessons', ex: 'A few kids per teacher, grouped by stage.' },
      { key: 'private', label: 'Private & at home', ex: 'One teacher. Some come to your pool.', re: /private|backyard|your pool|in-home/i },
      { key: 'team', label: 'Swim team', ex: 'Practices and meets, for kids who swim laps.', re: /swim team|swim club|usa swimming|swim league|mako|competitive/i },
      { key: 'dive', label: 'Diving', ex: 'Springboard basics for confident swimmers.', re: /\bdiv(e|ing)\b/i },
    ],
  },
  'Martial Arts': {
    question: 'What kind?',
    mode: 'tiles',
    fallback: 'other',
    kinds: [
      { key: 'bjj', label: 'Jiu-jitsu', ex: 'Grappling: holds and escapes on the mat. No punches or kicks.', re: /jiu|bjj|gracie/i },
      { key: 'tkd', label: 'Taekwondo', ex: 'Fast kicks and belts. An Olympic sport.', re: /taekwondo|tae kwon/i },
      { key: 'karate', label: 'Karate', ex: 'Strikes, blocks and forms, with belts.', re: /karate|tang soo/i },
      { key: 'judo', label: 'Judo', ex: 'Throws, and learning to fall safely.', re: /judo/i },
      { key: 'other', label: 'Other styles', ex: 'Hapkido, kickboxing and mixed martial arts.' },
    ],
  },
  Music: {
    question: 'What does {name} want to do?',
    mode: 'tiles',
    fallback: 'lessons',
    matchOrder: ['early', 'lessons', 'choir', 'ens'],
    kinds: [
      { key: 'lessons', label: 'Learn an instrument', ex: 'Lessons: piano, guitar, drums, strings, voice.', re: /lesson|private|instruction/i },
      { key: 'choir', label: 'Sing', ex: 'Choirs and voice classes, with concerts.', re: /choir|voice|sing|glee|treble/i },
      { key: 'ens', label: 'Play in a group', ex: 'Bands and orchestras. Most need some experience.', re: /orchestra|\bband\b|conservatory|perform/i },
      { key: 'early', label: 'First music', ex: 'Songs, rhythm and movement for little ones.', re: /early childhood|funtime|toddler|bab(y|ies)/i },
    ],
  },
  Dance: {
    question: 'Which style?',
    mode: 'tiles',
    tags: true,
    kinds: [
      { key: 'ballet', label: 'Ballet', ex: 'Technique and posture. Often leads to pointe.', re: /ballet|pointe/i },
      { key: 'hiphop', label: 'Hip hop', ex: 'High energy, current music. Includes K-pop.', re: /hip ?hop|k-?pop/i },
      { key: 'jazztap', label: 'Jazz & tap', ex: 'Big moves, or rhythm with tap shoes.', re: /jazz|\btap\b/i },
      { key: 'contemp', label: 'Contemporary', ex: 'Expressive. Includes modern and lyrical.', re: /contemporary|modern|lyrical/i },
      { key: 'creative', label: 'Creative movement', ex: 'Play-based dance and tumbling for beginners.', re: /creative|tumbling|pre-?dance/i },
    ],
  },
  Theater: {
    question: 'What kind?',
    mode: 'tiles',
    fallback: 'acting',
    kinds: [
      { key: 'acting', label: 'Acting & improv', ex: 'Scenes, games and quick thinking.' },
      { key: 'musical', label: 'Musical theatre', ex: 'Singing, dancing and acting together.', re: /musical/i },
      { key: 'shows', label: 'Shows', ex: 'Rehearse and perform a full production.', re: /production|theatre team|ensemble/i },
    ],
  },
  Arts: {
    question: 'What kind of art?',
    mode: 'tiles',
    fallback: 'mixed',
    kinds: [
      { key: 'draw', label: 'Drawing & painting', ex: 'Drawing, painting and printmaking.', re: /draw|paint|print|sculpt/i },
      { key: 'clay', label: 'Clay & pottery', ex: 'Wheel, hand-building and glazing.', re: /pottery|ceramic|clay/i },
      { key: 'craft', label: 'Crafts & reuse', ex: 'Making things from everyday materials.', re: /craft|reuse|trash|treasure/i },
      { key: 'mixed', label: 'Art classes & studios', ex: 'Mixed-media classes and open studios.' },
    ],
  },
  Outdoor: {
    question: 'What kind?',
    mode: 'tiles',
    fallback: 'nature',
    kinds: [
      { key: 'water', label: 'On the water', ex: 'Sailing, rowing, kayaks and paddleboards.', re: /sail|kayak|paddl|canoe|outrigger|rowing|water/i },
      { key: 'nature', label: 'Nature & forest', ex: 'Exploring outside, rain or shine.' },
      { key: 'farm', label: 'Farm & garden', ex: 'Growing food and caring for land.', re: /farm|garden|grow/i },
      { key: 'teen', label: 'Teen programs', ex: 'Service and job programs for high schoolers.', re: /corps|y-we|teen/i },
    ],
  },
  'Early Childhood': {
    question: 'What kind?',
    mode: 'tiles',
    fallback: 'move',
    kinds: [
      { key: 'move', label: 'Movement & play', ex: 'Tumbling, dance and play.' },
      { key: 'nature', label: 'Nature', ex: 'Outdoor classes for little ones.', re: /nature|forest|outdoor|garden|bugs/i },
      { key: 'music', label: 'Music', ex: 'Songs and rhythm for babies and toddlers.', re: /music|jazz|minimeter|sound/i },
      { key: 'art', label: 'Art', ex: 'First art classes.', re: /\bart/i },
    ],
  },
  Language: {
    question: 'Which language?',
    mode: 'pills',
    tags: true,
    kinds: [
      { key: 'spanish', label: 'Spanish', ex: '', re: /spanish/i },
      { key: 'french', label: 'French', ex: '', re: /french/i },
      { key: 'german', label: 'German', ex: '', re: /german/i },
      { key: 'japanese', label: 'Japanese', ex: '', re: /japanese/i },
      { key: 'mandarin', label: 'Mandarin', ex: '', re: /mandarin|chinese/i },
    ],
  },
  Camps: {
    question: 'When do you need it?',
    mode: 'tiles',
    tags: true,
    kinds: [
      { key: 'Summer weeks', label: 'Summer weeks', ex: 'Week-long day camps, June to August.' },
      { key: 'School breaks', label: 'School breaks', ex: 'Winter, mid-winter, spring break and days off.' },
      { key: 'Overnight', label: 'Overnight', ex: 'Sleepaway camp, a week or more.' },
      { key: 'Before & after care', label: 'Before & after care', ex: 'Covers the hours around camp or school.' },
    ],
  },
};

type Listing = { category: string; title: string; subcategory?: string | null };

/** The kinds of one listing (keys of its category's KindDef); [] when the category has none. */
export function kindsOf(a: Listing): string[] {
  const def = KIND_DEFS[a.category];
  if (!def) return [];
  if (a.category === 'Camps') return campWhens(a).filter((w) => (CAMP_WHEN as readonly string[]).includes(w));
  const text = `${a.title} ${a.subcategory ?? ''}`;
  if (def.tags) return def.kinds.filter((k) => k.re && k.re.test(text)).map((k) => k.key);
  const ordered = def.matchOrder ? def.matchOrder.map((key) => def.kinds.find((k) => k.key === key)!) : def.kinds;
  const hit = ordered.find((k) => k.re && k.re.test(text));
  return hit ? [hit.key] : def.fallback ? [def.fallback] : [];
}

/** Show "What kind?" for this category? Small categories (Cooking, STEM, Academic) skip it. */
export function showKinds(category: string, programCount: number): boolean {
  return !!KIND_DEFS[category] && programCount >= MIN_FOR_KINDS;
}

/** A kind's label, e.g. kindLabel('Music', 'choir') → "Sing". */
export function kindLabel(category: string, key: string): string {
  return KIND_DEFS[category]?.kinds.find((k) => k.key === key)?.label ?? key;
}
