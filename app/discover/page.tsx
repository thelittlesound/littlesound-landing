'use client';

// Discover (redesigned 2026-11-17, mockup approved by Evan): a short hero
// with the search box and who you're browsing for, one row of category
// tiles, "What kind?" inside a category, a quiet refine line, and cards that
// all answer the same four things (When, Ages, Where, Cost).

import { useState, useMemo, useEffect, useRef } from 'react';
import staticActivities from '../data/activities.json';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { browsableKids, fitsKid, type MatchKid } from '@/lib/kid-match';
import { CAMP_THEMES, campTheme, themeLabel } from '@/lib/camps';
import { KIND_DEFS, kindsOf, kindLabel, showKinds } from '@/lib/kinds';
import { closeness, parse, placeLabel, type Place, type SearchQuery } from '@/lib/search';
import SearchBox from './SearchBox';

type Activity = Omit<typeof staticActivities[0], 'price' | 'level' | 'serves' | 'theme' | 'subcategory'> & {
  /** null when the provider doesn't post a fee. */
  price: number | null;
  subcategory?: string | null;
  source?: string;
  /** Team sports: 'rec' (everyone plays, no tryouts) or 'club' (select/club, by tryout). */
  level?: string | null;
  /** Who can join, e.g. a league's boundary. */
  serves?: string | null;
  /** Camps: what it's about (a Discover category or "All-around"). */
  theme?: string | null;
};

const LEVELS: { key: 'rec' | 'club'; label: string; short: string }[] = [
  { key: 'rec', label: 'Rec · everyone plays', short: 'Rec' },
  { key: 'club', label: 'Club · tryouts', short: 'Club · tryouts' },
];

// Tiles, biggest first. Each has a thin line icon (24×24 stroke paths).
const CATEGORIES: { name: string; label: string; icon: string }[] = [
  { name: 'Sports', label: 'Sports', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3.6 9.5c5 1.6 11.8 1.6 16.8 0M3.6 14.5c5-1.6 11.8-1.6 16.8 0' },
  { name: 'Camps', label: 'Camps', icon: 'M3 20L12 4l9 16zM12 4v16M9 20l3-5 3 5' },
  { name: 'Swimming', label: 'Swimming', icon: 'M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6 0M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6 0' },
  { name: 'Arts', label: 'Arts', icon: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 3-2 3-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01' },
  { name: 'Martial Arts', label: 'Martial Arts', icon: 'M3 10h18v3H3zM10 13l-2 7M14 13l2 7M10 9.5h4v4h-4z' },
  { name: 'Music', label: 'Music', icon: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0' },
  { name: 'Outdoor', label: 'Outdoor', icon: 'M12 3l-6 9h4l-4 6h12l-4-6h4zM12 18v3' },
  { name: 'Theater', label: 'Theater', icon: 'M4 4h10v6a5 5 0 0 1-10 0zM7 8h.01M11 8h.01M7 11c1 1 3 1 4 0M15 9h5v5a5 5 0 0 1-8 4' },
  { name: 'Dance', label: 'Dance', icon: 'M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z' },
  { name: 'Early Childhood', label: 'Early Childhood', icon: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2-5 6-5 0 3-2 5-6 5z' },
  { name: 'Language', label: 'Language', icon: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5' },
  { name: 'STEM', label: 'STEM', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9' },
  { name: 'Cooking', label: 'Cooking', icon: 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h20M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5' },
  { name: 'Academic', label: 'Academic', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7' },
];
const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
const iconFor = (cat: string) => CATEGORIES.find((c) => c.name === cat)?.icon ?? CATEGORIES[0].icon;
const TINTS: Record<string, string> = {
  Sports: '#E3EFE6', Camps: '#E8EFE4', Swimming: '#E4ECF3', Arts: '#EFE6F0', 'Martial Arts': '#EAE7F0', Music: '#F3EBDD', Outdoor: '#E3EFE6',
  Theater: '#F3E7DC', Dance: '#F3E4E4', 'Early Childhood': '#F2EFD9', Language: '#E0F0E9', STEM: '#E1EEF3', Cooking: '#F5E8D6', Academic: '#E5E8F3',
};
const CATEGORY_LINES: Record<string, string> = {
  Sports: 'Rec leagues, club teams and clinics.',
  Camps: 'Summer weeks and school-break days, from sailing to science.',
  Swimming: 'From parent-and-tot lessons to year-round club teams.',
  Arts: 'Drawing, clay, crafts and open studios.',
  'Martial Arts': 'Classes for little kickers through teens.',
  Music: 'Lessons, choirs and bands.',
  Outdoor: 'On the water, in the woods and on the farm.',
  Theater: 'Acting, improv, musicals and real shows.',
  Dance: 'Ballet to hip hop, for first-timers and dancers.',
  'Early Childhood': 'Classes for babies, toddlers and preschoolers.',
  Language: 'Weekend schools and classes, for new learners and kids who speak it at home.',
  STEM: 'Coding, robotics, science and chess.',
  Cooking: 'Cooking and baking classes and camps.',
  Academic: 'Tutoring and enrichment.',
};

const AGE_GROUPS = [
  { label: 'Any age', key: 'All ages', min: 0, max: 18 },
  { label: '2–4', key: '2-4', min: 2, max: 4 },
  { label: '5–7', key: '5-7', min: 5, max: 7 },
  { label: '8–11', key: '8-11', min: 8, max: 11 },
  { label: '12+', key: '12+', min: 12, max: 18 },
];
const SORTS = [
  { key: 'match', label: 'Best match' },
  { key: 'soon', label: 'Dates posted first' },
  { key: 'price', label: 'Price, low to high' },
];

/** A provider listing with 0–18 almost always means the ages weren't found. */
const agesUnknown = (a: Activity) => a.source === 'provider' && a.ageMin === 0 && a.ageMax === 18;

function costText(a: Activity) {
  if (a.price == null) return 'Fees on their site';
  if (a.price === 0) return 'Free';
  return `$${a.price}${a.priceUnit ? ` / ${a.priceUnit}` : ''}`;
}

function ActivityCard({
  a,
  saved,
  onToggleSave,
  dateLine,
  place,
  saveLabel,
  savedLabel,
}: {
  a: Activity;
  saved: boolean;
  onToggleSave: (a: Activity) => void;
  dateLine?: string;
  place: Place | null;
  saveLabel: string;
  savedLabel: string;
}) {
  const kinds = kindsOf(a).slice(0, 3).map((k) => kindLabel(a.category, k));
  const theme = a.category === 'Camps' ? campTheme(a) : null;
  const level = a.level === 'rec' || a.level === 'club' ? LEVELS.find((l) => l.key === a.level)!.label : null;
  const kindLine = [...kinds, theme && theme !== 'All-around' ? theme : null, level].filter(Boolean).join(' · ') || a.category;
  const near = closeness(a.neighborhood, place);
  const where =
    a.neighborhood === 'Citywide'
      ? 'Several locations'
      : place && near.tier !== 0 && near.miles != null
        ? `${a.neighborhood} · about ${Math.max(1, Math.round(near.miles))} mi`
        : a.neighborhood;
  const unknown = agesUnknown(a);
  const facts = [
    { k: 'When', v: dateLine || 'Schedule on their site', muted: !dateLine },
    { k: 'Ages', v: unknown ? 'Not posted yet' : `${a.ageMin}–${a.ageMax}`, warn: unknown },
    { k: 'Where', v: where },
    { k: 'Cost', v: costText(a), muted: a.price == null },
  ];
  return (
    <article className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(10,74,90,0.07)] p-[18px] flex flex-col gap-3.5">
      <div className="flex gap-3 items-start">
        <div className="shrink-0 w-[46px] h-[46px] rounded-[14px] flex items-center justify-center" style={{ background: TINTS[a.category] ?? '#F3EBDD' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A6A3E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={iconFor(a.category)} />
          </svg>
        </div>
        <div className="flex flex-col gap-[3px] min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#1A7A8A]">{kindLine}</span>
          <h3 className="font-['Cormorant_Garamond'] text-[21px] font-medium leading-[1.15] text-[#1C3A4A]">{a.title}</h3>
          <span className="text-[13px] text-[#4E6B78]">{a.provider}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3.5 gap-y-2.5 px-3.5 py-3 rounded-[14px] bg-[#F8F4EA]">
        {facts.map((f) => (
          <div key={f.k} className="flex flex-col gap-0.5 min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5F7A86]">{f.k}</dt>
            <dd className={`text-[13.5px] leading-snug ${f.warn ? 'text-[#8A5A1F]' : f.muted ? 'text-[#5F7A86]' : 'text-[#1C3A4A]'}`}>{f.v}</dd>
          </div>
        ))}
      </dl>
      {a.serves && (
        <p className="text-[12.5px] leading-snug text-[#4E6B78] -mt-1">
          <span className="font-semibold text-[#2E4A58]">Who can join:</span> {a.serves}
        </p>
      )}
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onToggleSave(a)}
          aria-pressed={saved}
          className={`flex-1 min-h-[44px] rounded-full text-[14px] font-semibold border-[1.5px] border-[#0D5C6E] transition-colors ${
            saved ? 'bg-[#0D5C6E] text-white hover:bg-[#1A7A8A]' : 'bg-white text-[#0D5C6E] hover:bg-[#F5EFE0]'
          }`}
        >
          {saved ? savedLabel : saveLabel}
        </button>
        <a
          href={a.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-h-[44px] flex items-center justify-center rounded-full border-[1.5px] border-[#C5D8E8] text-[14px] font-medium text-[#0D5C6E] hover:border-[#0D5C6E] transition-colors"
        >
          Their site
        </a>
      </div>
    </article>
  );
}

export default function Discover() {
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState<string | null>(null);
  const [theme, setTheme] = useState('All');
  const [level, setLevel] = useState<'All' | 'rec' | 'club'>('All');
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0]);
  const [sort, setSort] = useState('match');
  // What the search box understood (shown as removable chips).
  const [act, setAct] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [showFar, setShowFar] = useState(false);
  const [ageExact, setAgeExact] = useState<number | null>(null);
  const [free, setFree] = useState(false);
  const [under, setUnder] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);

  const [providerActivities, setProviderActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileArea, setProfileArea] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Browsing for one child: their age and interests filter the results, and
  // what's saved remembers them (so its sessions land on their calendar).
  const [kids, setKids] = useState<MatchKid[]>([]);
  const [forKidId, setForKidId] = useState<string | null>(null);
  const [useInterests, setUseInterests] = useState(true);
  const [savedFor, setSavedFor] = useState<Record<string, string | null>>({});
  const forKid = useMemo(() => kids.find((k) => k.id === forKidId) ?? null, [kids, forKidId]);
  const [saveNote, setSaveNote] = useState<{ ok: boolean; text: string } | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showSaveNote(ok: boolean, msg: string) {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setSaveNote({ ok, text: msg });
    noteTimer.current = setTimeout(() => setSaveNote(null), ok ? 6000 : 8000);
  }
  const [claimedSeedIds, setClaimedSeedIds] = useState<Set<string>>(new Set());
  const [dateLines, setDateLines] = useState<Record<string, string>>({});
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // A slim bar pins to the top once the hero scrolls away.
  const heroRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [heroGone, setHeroGone] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Seed listings a provider has claimed are dropped from the static set: the
  // provider's own copy (same id) comes through providerActivities instead.
  const activities = useMemo<Activity[]>(() => {
    const seeds = (staticActivities as Activity[]).filter((a) => !claimedSeedIds.has(a.id));
    return [...seeds, ...providerActivities];
  }, [providerActivities, claimedSeedIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat && CATEGORY_NAMES.includes(cat)) setCategory(cat);
    const th = params.get('theme');
    if (cat === 'Camps' && th && (CAMP_THEMES as readonly string[]).includes(th)) setTheme(th);
    const forId = params.get('for');
    if (forId) setForKidId(forId);
    const age = params.get('age');
    if (age) {
      // Homepage links use an en dash (2–4); keys use a hyphen.
      const normalized = age.replace('–', '-');
      const group = AGE_GROUPS.find((g) => g.key === normalized);
      if (group) setAgeGroup(group);
    }
    const q = params.get('q');
    if (q) setPendingQuery(q);
  }, []);

  useEffect(() => {
    fetch('/api/activities')
      .then((r) => r.json())
      .then((data) => {
        if (data.activities) setProviderActivities(data.activities);
        if (Array.isArray(data.claimedSeedIds)) setClaimedSeedIds(new Set(data.claimedSeedIds));
        if (data.dateLines && typeof data.dateLines === 'object') setDateLines(data.dateLines);
      })
      .catch(() => {}); // Static data still shows.
  }, []);

  // Who's signed in, their kids and neighborhood, and what they've saved.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from('profiles')
        .select('kids, neighborhood')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }: { data: { kids: unknown; neighborhood: string | null } | null }) => {
          setKids(browsableKids(data?.kids));
          if (data?.neighborhood && data.neighborhood !== 'Citywide') setProfileArea(data.neighborhood);
        });
      const useRows = (rows: { activity_id: string; kid_id?: string | null }[] | null) => {
        if (!rows) return;
        setSavedIds(new Set(rows.map((r) => r.activity_id)));
        setSavedFor(Object.fromEntries(rows.map((r) => [r.activity_id, r.kid_id ?? null])));
      };
      supabase
        .from('saved_activities')
        .select('activity_id, kid_id')
        .eq('user_id', user.id)
        .then(({ data, error }: { data: { activity_id: string; kid_id: string | null }[] | null; error: { message?: string } | null }) => {
          // Before the kid_id column exists (supabase/saved-activities.sql not re-run yet).
          if (error) {
            supabase
              .from('saved_activities')
              .select('activity_id')
              .eq('user_id', user.id)
              .then(({ data: d }: { data: { activity_id: string }[] | null }) => useRows(d));
          } else useRows(data);
        });
    });
  }, []);

  // ?q= runs once the kids are known (so "choir for Ella" can pick Ella).
  useEffect(() => {
    if (pendingQuery == null) return;
    applySearch(parse(pendingQuery, kids));
    setPendingQuery(null);
    // Clear ?q= so a refresh after editing the chips doesn't bring it back.
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery, kids]);

  function chooseCategory(c: string) {
    setCategory(c);
    setKind(null);
    setTheme('All');
    setLevel('All');
    setAct(null);
    setText(null);
    const url = new URL(window.location.href);
    if (c === 'All') url.searchParams.delete('category');
    else url.searchParams.set('category', c);
    url.searchParams.delete('theme');
    window.history.replaceState(null, '', url.toString());
  }

  function chooseKid(id: string | null) {
    setForKidId(id);
    setUseInterests(true);
    setAgeExact(null);
    setAgeGroup(AGE_GROUPS[0]);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('for', id);
    else url.searchParams.delete('for');
    url.searchParams.delete('age');
    window.history.replaceState(null, '', url.toString());
  }

  function applySearch(q: SearchQuery) {
    if (q.cat) {
      setCategory(q.cat);
      setKind(q.kind ?? null);
      setTheme(q.theme ?? 'All');
      setLevel('All');
      setAct(q.act ?? null);
      setText(null);
    }
    if (q.place) { setPlace(q.place); setShowFar(false); }
    if (q.age != null) { setAgeExact(q.age); setForKidId(null); }
    if (q.kidId) { setForKidId(q.kidId); setAgeExact(null); }
    if (q.free) setFree(true);
    if (q.under) setUnder(q.under);
    if (q.text) {
      setText(q.text);
      setCategory('All');
      setKind(null);
      setTheme('All');
      setAct(null);
    }
  }

  function clearSearch() {
    setAct(null);
    setKind(null);
    setTheme('All');
    setPlace(null);
    setShowFar(false);
    setAgeExact(null);
    setFree(false);
    setUnder(null);
    setText(null);
  }

  // On a phone the tiles scroll sideways: keep the chosen one in view.
  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector('[aria-pressed="true"]') as HTMLElement | null;
    if (!rail || !el) return;
    // Scroll the rail sideways only (never the page).
    const r = rail.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    if (e.left < r.left || e.right > r.right) rail.scrollBy({ left: e.left - r.left - 16, behavior: 'smooth' });
  }, [category]);

  const kidAge = ageExact ?? forKid?.age ?? null;
  const ageFits = (a: Activity) =>
    kidAge != null ? agesUnknown(a) || (a.ageMin <= kidAge && kidAge <= a.ageMax) : a.ageMax >= ageGroup.min && a.ageMin <= ageGroup.max;
  const textFits = (a: Activity) => {
    if (!text) return true;
    const hay = `${a.title} ${a.provider} ${a.neighborhood} ${a.description ?? ''}`.toLowerCase();
    return text.split(' ').every((w) => hay.includes(w));
  };
  // Everything except the category, kind, theme and level.
  const baseFits = (a: Activity, allowFar: boolean) =>
    ageFits(a) &&
    (!free || a.price === 0) &&
    (!under || (a.price != null && a.price <= under)) &&
    textFits(a) &&
    (allowFar || closeness(a.neighborhood, place).tier !== 3) &&
    // A child's interests only narrow the "All" view.
    (!forKid || category !== 'All' || !useInterests || !!text || fitsKid(a, forKid, true));

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of activities) if (baseFits(a, showFar)) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, kidAge, ageGroup, free, under, text, place, showFar, forKid, useInterests, category]);

  const inCategory = (a: Activity) =>
    (category === 'All' || a.category === category) &&
    (category !== 'Camps' || theme === 'All' || campTheme(a) === theme) &&
    (level === 'All' || a.level === level);

  const pool = useMemo(
    () => activities.filter((a) => inCategory(a) && baseFits(a, showFar)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, category, theme, level, kidAge, ageGroup, free, under, text, place, showFar, forKid, useInterests]
  );

  const kindDef = category !== 'All' ? KIND_DEFS[category] : undefined;
  const categoryTotal = activities.filter((a) => a.category === category).length;
  const withKinds = category !== 'All' && showKinds(category, categoryTotal);
  const kindCounts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!withKinds) return c;
    for (const a of pool) for (const k of kindsOf(a)) c[k] = (c[k] ?? 0) + 1;
    return c;
  }, [pool, withKinds]);

  const results = useMemo(() => {
    const list = pool.filter((a) => !kind || kindsOf(a).includes(kind));
    const sortKey = (a: Activity) => {
      if (sort === 'price') return a.price ?? 1e9;
      if (sort === 'soon') return dateLines[a.id] ? 0 : 1;
      return agesUnknown(a) ? 1 : 0;
    };
    return list
      .map((a, i) => ({ a, i, near: closeness(a.neighborhood, place) }))
      .sort((x, y) =>
        x.near.tier - y.near.tier ||
        (x.near.miles ?? 0) - (y.near.miles ?? 0) ||
        sortKey(x.a) - sortKey(y.a) ||
        x.i - y.i
      )
      .map((x) => x.a);
  }, [pool, kind, sort, dateLines, place]);

  const farCount = useMemo(() => {
    if (!place || showFar) return 0;
    return activities.filter(
      (a) => inCategory(a) && baseFits(a, true) && closeness(a.neighborhood, place).tier === 3 && (!kind || kindsOf(a).includes(kind))
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, place, showFar, category, theme, level, kind, kidAge, ageGroup, free, under, text, forKid, useInterests]);

  // On a subject page (e.g. Outdoor): its camps live under Camps.
  const campsForSubject =
    category === 'All' || category === 'Camps' ? 0 : activities.filter((a) => a.category === 'Camps' && campTheme(a) === category && baseFits(a, showFar)).length;

  const campThemes = useMemo(
    () => (category === 'Camps' ? CAMP_THEMES.filter((t) => activities.some((a) => a.category === 'Camps' && campTheme(a) === t)) : []),
    [activities, category]
  );
  const showLevels = category !== 'All' && activities.some((a) => a.category === category && (a.level === 'rec' || a.level === 'club'));

  const chips: { label: string; remove: () => void }[] = [];
  if (act) chips.push({ label: act, remove: () => { setAct(null); setKind(null); setTheme('All'); } });
  if (place) chips.push({ label: placeLabel(place), remove: () => { setPlace(null); setShowFar(false); } });
  if (ageExact != null) chips.push({ label: `Age ${ageExact}`, remove: () => setAgeExact(null) });
  if (free) chips.push({ label: 'Free', remove: () => setFree(false) });
  if (under) chips.push({ label: `Under $${under}`, remove: () => setUnder(null) });
  if (text) chips.push({ label: `“${text}”`, remove: () => setText(null) });

  const kidName = (id: string | null | undefined) => kids.find((k) => k.id === id)?.name ?? null;
  function labelsFor(a: Activity) {
    const who = kidName(savedFor[a.id]);
    return {
      saveLabel: forKid ? `Save for ${forKid.name}` : 'Save',
      savedLabel: who ? `Saved for ${who}` : 'Saved',
    };
  }

  const clearAll = () => {
    chooseKid(null);
    clearSearch();
    chooseCategory('All');
    setAgeGroup(AGE_GROUPS[0]);
    setSort('match');
  };

  // Save / unsave an activity. Optimistic; reverts on error. Writes go straight
  // to Supabase from the browser (anon client); RLS scopes rows to this user.
  async function toggleSave(a: Activity) {
    if (!userId) {
      window.location.href = '/families/login?next=/discover';
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const isSaved = savedIds.has(a.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
    const revert = () =>
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(a.id);
        else next.delete(a.id);
        return next;
      });

    if (isSaved) {
      const { error } = await supabase.from('saved_activities').delete().eq('user_id', userId).eq('activity_id', a.id);
      if (error) {
        revert();
        showSaveNote(false, 'Couldn’t remove it. Please try again.');
      } else setSaveNote(null);
    } else {
      const row: Record<string, unknown> = {
        user_id: userId,
        activity_id: a.id,
        title: a.title,
        provider: a.provider,
        category: a.category,
        neighborhood: a.neighborhood,
        age_min: a.ageMin,
        age_max: a.ageMax,
        price: a.price,
        price_unit: a.priceUnit,
        website: a.website,
      };
      if (forKid) row.kid_id = forKid.id;
      const save = (r: Record<string, unknown>) =>
        supabase.from('saved_activities').upsert(r, { onConflict: 'user_id,activity_id', ignoreDuplicates: true });
      let { error } = await save(row);
      if (error && row.kid_id && /kid_id/.test(error.message ?? '')) {
        delete row.kid_id;
        ({ error } = await save(row));
      }
      if (error) {
        revert();
        showSaveNote(false, 'Couldn’t save it. Please try again.');
      } else {
        setSavedFor((prev) => ({ ...prev, [a.id]: (row.kid_id as string | undefined) ?? null }));
        showSaveNote(
          true,
          forKid
            ? `Saved “${a.title}” for ${forKid.name}. Sessions you add from your dashboard go on ${forKid.name}’s calendar.`
            : `Saved “${a.title}”. Open your dashboard to add its dates to your calendar.`
        );
      }
    }
  }

  const catLabel = category === 'All' ? null : CATEGORIES.find((c) => c.name === category)?.label ?? category;
  const heading = text
    ? `Results for “${text}”`
    : catLabel
      ? `${catLabel}${forKid ? ` for ${forKid.name}` : ''}`
      : forKid
        ? `Everything for ${forKid.name}`
        : 'Everything for your kids';
  const subline = place
    ? `Closest to ${place.area} first, then nearby, then programs with several locations.`
    : category !== 'All'
      ? CATEGORY_LINES[category] ?? ''
      : `${activities.length} camps, classes and teams across Seattle and the south end.`;
  const pickedKind = kind && category !== 'All' ? kindLabel(category, kind) : null;
  const searchSummary = [catLabel, ...chips.map((c) => c.label)].filter(Boolean).join(' · ');

  return (
    <main className="min-h-screen bg-[#F5EFE0]">

      {saveNote && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[400px] z-50 rounded-[16px] shadow-[0_12px_32px_rgba(10,74,90,0.25)] px-5 py-4 flex items-start gap-3 ${
            saveNote.ok ? 'bg-[#0D5C6E] text-white' : 'bg-[#C0544A] text-white'
          }`}
        >
          <p className="text-[14px] leading-snug flex-1">
            {saveNote.text}
            {saveNote.ok && (
              <>
                {' '}
                <a href="/families/dashboard" className="font-semibold underline whitespace-nowrap">Open dashboard →</a>
              </>
            )}
          </p>
          <button type="button" onClick={() => setSaveNote(null)} aria-label="Dismiss" className="text-white/80 hover:text-white text-[18px] leading-none">×</button>
        </div>
      )}

      {/* Slim bar once the hero has scrolled away */}
      {heroGone && (
        <div className="fixed top-16 left-0 right-0 z-20 bg-[#0D5C6E]/95 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.12)] px-4 md:px-10">
          <div className="max-w-[1200px] mx-auto min-h-[52px] flex items-center justify-between gap-3">
            <p className="text-[14px] text-white truncate">
              <span className="font-semibold">{results.length}</span> {results.length === 1 ? 'program' : 'programs'}
              {searchSummary ? <span className="text-[#C5D8E8]"> · {searchSummary}</span> : null}
            </p>
            <button
              type="button"
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => searchRef.current?.focus(), 400); }}
              className="shrink-0 min-h-[40px] px-4 rounded-full bg-white text-[#0D5C6E] text-[14px] font-semibold"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Hero: who it's for + the search */}
      <section ref={heroRef} className="bg-[#0D5C6E] px-4 md:px-10 pt-24 pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="flex flex-col gap-3.5 flex-[1_1_380px] min-w-0">
            <h1 className="font-['Cormorant_Garamond'] font-light text-[clamp(34px,4.4vw,50px)] leading-[1.05] text-white">
              {forKid ? <>What&rsquo;s next for <em className="italic text-[#C4A882]">{forKid.name}?</em></> : <>Everything for your kids, <em className="italic text-[#C4A882]">in one place.</em></>}
            </h1>
            {kids.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Browsing for">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C5D8E8] mr-1">Browsing for</span>
                  {[null, ...kids].map((k) => {
                    const on = (k?.id ?? null) === (forKid?.id ?? null);
                    return (
                      <button
                        key={k?.id ?? 'everyone'}
                        type="button"
                        onClick={() => chooseKid(k?.id ?? null)}
                        aria-pressed={on}
                        className={`min-h-[40px] px-4 rounded-full text-[14px] font-medium border-[1.5px] transition-colors ${
                          on ? 'bg-white text-[#0D5C6E] border-white' : 'bg-transparent text-white border-white/35 hover:border-white'
                        }`}
                      >
                        {k ? `${k.name}${k.age != null ? ` · ${k.age}` : ''}` : 'Everyone'}
                      </button>
                    );
                  })}
                </div>
                {forKid && category === 'All' && !text && (
                  <p className="text-[13px] text-[#C5D8E8]">
                    {forKid.interests.length > 0 && useInterests ? (
                      <>
                        Matching {forKid.name}&rsquo;s interests{forKid.age != null ? `, age ${forKid.age}` : ''}.{' '}
                        <button type="button" onClick={() => setUseInterests(false)} className="font-semibold text-white underline underline-offset-2">
                          Show everything{forKid.age != null ? ` for age ${forKid.age}` : ''}
                        </button>
                      </>
                    ) : forKid.interests.length > 0 ? (
                      <button type="button" onClick={() => setUseInterests(true)} className="font-semibold text-white underline underline-offset-2">
                        Just {forKid.name}&rsquo;s interests
                      </button>
                    ) : (
                      <a href="/families/dashboard#family-profile" className="font-semibold text-white underline underline-offset-2">
                        Add {forKid.name}&rsquo;s interests for better matches
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex-[1_1_400px] max-w-[580px] min-w-0">
            <SearchBox
              activities={activities}
              kids={kids}
              profileArea={profileArea}
              chips={chips}
              onApply={applySearch}
              onClear={clearSearch}
              inputRef={searchRef}
            />
          </div>
        </div>
      </section>

      {/* Category tiles: one row on desktop (2 lines), two rows that swipe on a phone */}
      <section className="px-4 md:px-10 pt-5 pb-1 border-b border-[#E3DAC5]">
        <div
          ref={railRef}
          className="max-w-[1200px] mx-auto grid grid-flow-col grid-rows-2 auto-cols-[minmax(160px,1fr)] gap-2.5 overflow-x-auto pb-4 scrollbar-hide"
          role="group"
          aria-label="Category"
        >
          {CATEGORIES.map((c) => {
            const on = category === c.name;
            const n = counts[c.name] ?? 0;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => chooseCategory(on ? 'All' : c.name)}
                aria-pressed={on}
                className={`min-h-[60px] px-3.5 py-2 rounded-[16px] border-[1.5px] flex items-center gap-2.5 text-left transition-colors ${
                  on ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white' : 'bg-white border-[#E3DAC5] text-[#1C3A4A] hover:border-[#1A7A8A]'
                }`}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={on ? '#F5EFE0' : '#A8865A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d={c.icon} />
                </svg>
                <span className="flex flex-col gap-px min-w-0">
                  <span className="text-[14px] font-semibold leading-tight">{c.label}</span>
                  <span className={`text-[12px] leading-tight ${on ? 'text-[#D6E6EC]' : 'text-[#4E6B78]'}`}>
                    {n} {n === 1 ? 'program' : 'programs'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 md:px-10 pt-7 pb-16">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5">

          <div className="flex flex-col gap-1">
            {category !== 'All' && (
              <button type="button" onClick={() => chooseCategory('All')} className="self-start min-h-[32px] text-[13px] font-semibold text-[#1A7A8A] hover:text-[#0D5C6E]">
                ← All categories
              </button>
            )}
            <h2 className="font-['Cormorant_Garamond'] font-normal text-[clamp(32px,3.6vw,42px)] leading-[1.1] text-[#1C3A4A]">{heading}</h2>
            {subline && <p className="text-[15px] leading-relaxed text-[#4E6B78]">{subline}</p>}
          </div>

          {withKinds && kindDef && (
            <div className="flex flex-col gap-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4E6B78]">
                {kindDef.question.replace('{name}', forKid?.name ?? 'your child')}
              </span>
              {kindDef.mode === 'tiles' ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                  {kindDef.kinds.map((k) => {
                    const n = kindCounts[k.key] ?? 0;
                    const on = kind === k.key;
                    return (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => { setKind(on ? null : k.key); setAct(null); }}
                        aria-pressed={on}
                        className={`min-h-[88px] px-3.5 py-3 rounded-[18px] border-[1.5px] text-left flex flex-col gap-1.5 transition-colors ${
                          on ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white' : 'bg-white border-[#E3DAC5] text-[#1C3A4A] hover:border-[#1A7A8A]'
                        } ${n === 0 && !on ? 'opacity-60' : ''}`}
                      >
                        <span className="flex justify-between items-baseline gap-2 w-full">
                          <span className="font-['Cormorant_Garamond'] text-[22px] font-medium leading-[1.1]">{k.label}</span>
                          <span className={`shrink-0 text-[13px] font-semibold px-2 py-0.5 rounded-full ${on ? 'bg-white/20 text-white' : 'bg-[#F5EFE0] text-[#0D5C6E]'}`}>{n}</span>
                        </span>
                        <span className={`text-[13px] leading-snug ${on ? 'text-[#E3EEF1]' : 'text-[#4E6B78]'}`}>{k.ex}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap">
                  {kindDef.kinds.filter((k) => (kindCounts[k.key] ?? 0) > 0 || kind === k.key).map((k) => {
                    const on = kind === k.key;
                    return (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => { setKind(on ? null : k.key); setAct(null); }}
                        aria-pressed={on}
                        className={`shrink-0 min-h-[40px] px-4 rounded-full border-[1.5px] text-[14px] font-medium whitespace-nowrap transition-colors ${
                          on ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white' : 'bg-white border-[#DCD2BC] text-[#2E4A58] hover:border-[#1A7A8A]'
                        }`}
                      >
                        {k.label} <span className={on ? 'text-white/80' : 'text-[#5F7A86]'}>{kindCounts[k.key] ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {campThemes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap" role="group" aria-label="Camp theme">
              {['All', ...campThemes].map((t) => {
                const on = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTheme(t); setAct(null); }}
                    aria-pressed={on}
                    className={`shrink-0 min-h-[40px] px-4 rounded-full border-[1.5px] text-[14px] font-medium whitespace-nowrap transition-colors ${
                      on ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white' : 'bg-white border-[#DCD2BC] text-[#2E4A58] hover:border-[#1A7A8A]'
                    }`}
                  >
                    {t === 'All' ? 'Any theme' : themeLabel(t)}
                  </button>
                );
              })}
            </div>
          )}

          {campsForSubject > 0 && (
            <button
              type="button"
              onClick={() => { const c = category; chooseCategory('Camps'); setTheme(c); }}
              className="self-start min-h-[44px] px-4 rounded-full bg-[#C4A882]/20 text-[13px] font-semibold text-[#6E5230] hover:bg-[#C4A882]/30 transition-colors"
            >
              {campsForSubject} {category === 'STEM' ? 'STEM' : category.toLowerCase()} {campsForSubject === 1 ? 'camp is' : 'camps are'} under Camps: see {campsForSubject === 1 ? 'it' : 'them'} →
            </button>
          )}

          {/* Refine: count, age, level, sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E3DAC5]">
            <p className="text-[15px] text-[#2E4A58]">
              <span className="font-semibold text-[#1C3A4A]">{results.length}</span> {results.length === 1 ? 'program' : 'programs'}
              {pickedKind ? ` · ${pickedKind}` : ''}
              {forKid ? ` for ${forKid.name}` : ageExact != null ? ` for age ${ageExact}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {kidAge == null && (
                <div className="flex gap-1 p-1 rounded-full bg-white border border-[#E3DAC5]" role="group" aria-label="Age">
                  {AGE_GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setAgeGroup(g)}
                      aria-pressed={ageGroup.key === g.key}
                      className={`min-h-[34px] px-3 rounded-full text-[13px] font-medium transition-colors ${
                        ageGroup.key === g.key ? 'bg-[#0D5C6E] text-white' : 'text-[#2E4A58] hover:bg-[#F5EFE0]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
              {showLevels && (
                <div className="flex gap-1 p-1 rounded-full bg-white border border-[#E3DAC5]" role="group" aria-label="Level">
                  {([{ key: 'All', short: 'Any level' }, ...LEVELS] as { key: 'All' | 'rec' | 'club'; short: string }[]).map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLevel(l.key)}
                      aria-pressed={level === l.key}
                      className={`min-h-[34px] px-3 rounded-full text-[13px] font-medium transition-colors ${
                        level === l.key ? 'bg-[#0D5C6E] text-white' : 'text-[#2E4A58] hover:bg-[#F5EFE0]'
                      }`}
                    >
                      {l.short}
                    </button>
                  ))}
                </div>
              )}
              <label htmlFor="ls-sort" className="text-[13px] text-[#4E6B78]">Sort</label>
              <select
                id="ls-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-[40px] px-3.5 rounded-full border border-[#E3DAC5] bg-white text-[14px] text-[#1C3A4A] cursor-pointer"
              >
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-14 px-6 rounded-[20px] bg-white">
              <p className="font-['Cormorant_Garamond'] text-[28px] text-[#1C3A4A] mb-2">Nothing fits all of that yet.</p>
              <p className="text-[15px] text-[#3A5A6A] mb-6">
                {chips.length ? 'Remove a chip under the search box to widen it, or start over.' : 'We’re adding providers across Seattle every week.'}
              </p>
              <button type="button" onClick={clearAll} className="min-h-[44px] px-6 rounded-full bg-[#0D5C6E] text-white text-[14px] font-semibold hover:bg-[#1A7A8A] transition-colors">
                Start over
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {results.map((a) => (
                <ActivityCard
                  key={a.id}
                  a={a}
                  saved={savedIds.has(a.id)}
                  onToggleSave={toggleSave}
                  dateLine={dateLines[a.id]}
                  place={place}
                  {...labelsFor(a)}
                />
              ))}
            </div>
          )}

          {farCount > 0 && (
            <button
              type="button"
              onClick={() => setShowFar(true)}
              className="self-center min-h-[48px] px-6 rounded-full border-[1.5px] border-[#0D5C6E] text-[15px] font-semibold text-[#0D5C6E] hover:bg-white transition-colors"
            >
              Show {farCount} farther away
            </button>
          )}
        </div>
      </section>

      {/* Provider CTA */}
      <section className="bg-[#0D5C6E] px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(28px,3.5vw,40px)] font-light text-white mb-4">
            Run a camp or class in Seattle?
          </h2>
          <p className="text-[16px] text-[#D6EEF2] leading-relaxed mb-8">
            Families are searching for what you offer. Get your listing featured on Little Sound.
          </p>
          <a
            href="/providers/signup"
            className="inline-block px-8 py-4 rounded-full bg-[#C4A882] text-[#1C3A4A] text-[15px] font-semibold hover:bg-[#A8865A] hover:text-white transition-colors"
          >
            List your activity
          </a>
          <p className="text-[14px] text-[#D6EEF2]/80 mt-6">
            Already listed?{' '}
            <a href="/providers/claim" className="text-white font-semibold underline underline-offset-2 hover:text-[#C4A882]">
              Claim your listing →
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
