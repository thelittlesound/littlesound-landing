'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import staticActivities from '../data/activities.json';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { browsableKids, fitsKid, type MatchKid } from '@/lib/kid-match';
import { CAMP_WHEN, CAMP_THEMES, campTheme, campWhens, themeLabel } from '@/lib/camps';

type Activity = Omit<typeof staticActivities[0], 'price' | 'level' | 'serves' | 'theme' | 'subcategory'> & {
  /** null when the provider doesn't post a fee. */
  price: number | null;
  subcategory?: string;
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
  { key: 'club', label: 'Club · tryouts', short: 'Club' },
];

const CATEGORIES = ['All', 'Sports', 'Swimming', 'Arts', 'Outdoor', 'STEM', 'Music', 'Dance', 'Cooking', 'Language', 'Martial Arts', 'Early Childhood', 'Theater', 'Camps', 'Academic'];

const SUBCATEGORY_ORDER: Record<string, string[]> = {
  Swimming:       ['Year-Round', 'Group Lessons', 'Private Lessons', 'Swim Team', 'Outdoor & Beach', 'Seasonal'],
  Sports:         ['Soccer', 'Baseball & Softball', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Running', 'Roller Derby', 'Multi-Sport', 'Gymnastics', 'Climbing', 'Ice Skating', 'Skateboarding'],
  Arts:           ['Classes & Workshops', 'Drawing & Painting', 'Pottery & Ceramics', 'Private Lessons', 'Workshops & Intensives'],
  STEM:           ['Coding & AI', 'Robotics', 'Science'],
  Music:          ['Private Lessons', 'Bands & Performance', 'Early Childhood'],
  Dance:          ['Multi-Style', 'Hip Hop & Jazz', 'Performing Arts'],
  Theater:        ['Acting & Improv', 'Youth Productions'],
  'Martial Arts': ['Karate', 'Karate & Kickboxing', 'Mixed Martial Arts'],
  'Early Childhood': ['Movement & Play', 'Nature Programs'],
  Outdoor:        ['Nature & Forest', 'Zoo Programs', 'Water Sports'],
  Camps:          [...CAMP_WHEN],
  Academic:       ['Academic Camps'],
  Cooking:        ['Classes & Workshops', 'Summer Camps'],
  Language:       ['Group Classes', 'Summer Camps', 'Year-Round Programs'],
};

const AGE_GROUPS = [
  { label: 'All ages', min: 0, max: 18 },
  { label: '2-4', min: 2, max: 4 },
  { label: '5-7', min: 5, max: 7 },
  { label: '8-11', min: 8, max: 11 },
  { label: '12+', min: 12, max: 18 },
];


const CATEGORY_STYLES: Record<string, { from: string; to: string; emoji: string }> = {
  'Swimming':        { from: '#B8D8EE', to: '#7FB8D8', emoji: '🏊' },
  'Sports':          { from: '#B8D8B8', to: '#80B880', emoji: '⚽' },
  'Arts':            { from: '#E8D0E8', to: '#C8A0C8', emoji: '🎨' },
  'STEM':            { from: '#B8DCE8', to: '#7CBCCC', emoji: '🧠' },
  'Music':           { from: '#F0E4C0', to: '#D4BC80', emoji: '🎵' },
  'Dance':           { from: '#F0D0D0', to: '#D4A0A0', emoji: '💃' },
  'Theater':         { from: '#E8D0B8', to: '#C8A070', emoji: '🎭' },
  'Martial Arts':    { from: '#C8D0DC', to: '#98B0BC', emoji: '🥋' },
  'Early Childhood': { from: '#F0EEB8', to: '#D4CC70', emoji: '🌱' },
  'Outdoor':         { from: '#B8D8B0', to: '#78B870', emoji: '🌲' },
  'Camps':           { from: '#F0DDB8', to: '#D4B870', emoji: '🏕️' },
  'Academic':        { from: '#C0C8EC', to: '#8898CC', emoji: '📚' },
  'Cooking':         { from: '#F5DDB8', to: '#E0B870', emoji: '🍳' },
  'Language':        { from: '#B8E8D0', to: '#70C8A0', emoji: '🌍' },
};

function ActivityCard({
  a,
  saved,
  onToggleSave,
  dateLine,
  saveLabel = 'Save to my dashboard',
  savedLabel = 'Saved to your dashboard',
}: {
  a: Activity;
  saved: boolean;
  onToggleSave: (a: Activity) => void;
  dateLine?: string; // e.g. "Registration opens Mar 3" — from approved dates only
  saveLabel?: string; // e.g. "Save for Ella" when browsing for one child
  savedLabel?: string;
}) {
  const style = CATEGORY_STYLES[a.category] ?? { from: '#C5D8E8', to: '#A8C8D8', emoji: '✨' };
  return (
    <article className="bg-white border border-[#E8DFC8] rounded-[20px] overflow-hidden hover:shadow-[0_12px_32px_rgba(10,74,90,0.14)] transition-shadow duration-300 flex flex-col">
      <div
        className="h-[160px] relative flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
      >
        <span className="absolute bottom-3 right-4 text-[64px] opacity-20 select-none pointer-events-none leading-none" aria-hidden="true">
          {style.emoji}
        </span>
        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/80 text-[11px] font-semibold uppercase tracking-wide text-[#1A7A8A]">
          {a.category === 'Camps' && campTheme(a) !== 'All-around' ? `Camps · ${campTheme(a)}` : a.category}
        </span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleSave(a); }}
          aria-label={saved ? 'Remove from saved' : 'Save activity'}
          aria-pressed={saved}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill={saved ? '#0D5C6E' : 'none'}
            stroke="#0D5C6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        <span className="px-3 py-1 rounded-full bg-white/70 font-['Cormorant_Garamond'] text-[14px] italic text-[#0D5C6E] relative z-10">
          {a.neighborhood}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-['Cormorant_Garamond'] text-[21px] font-semibold text-[#1C3A4A] leading-snug mb-1">
          {a.title}
        </h3>
        <p className="text-[13px] text-[#1A7A8A] font-medium mb-3">
          {a.provider}
        </p>
        {(a.level === 'rec' || a.level === 'club') && (
          <p className="self-start text-[11px] font-semibold uppercase tracking-[0.06em] rounded-full px-2.5 py-1 mb-3 border border-[#1A7A8A]/30 text-[#0D5C6E]">
            {LEVELS.find((l) => l.key === a.level)!.label}
          </p>
        )}
        {dateLine && (
          <p className="inline-flex items-center gap-1.5 self-start text-[12px] font-semibold text-[#7A5A2E] bg-[#C4A882]/15 rounded-full px-3 py-1 mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8865A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            {dateLine}
          </p>
        )}
        <p className="text-[14px] leading-[1.7] text-[#3A5A6A] mb-5 flex-1">
          {a.description}
        </p>
        <div className="flex items-center gap-3 text-[12px] text-[#7A9AAA] mb-5 pt-4 border-t border-[#E8DFC8]">
          <span>Ages {a.ageMin}&ndash;{a.ageMax}</span>
          <span>&middot;</span>
          <span>{a.neighborhood}</span>
        </div>
        {a.serves && (
          <p className="text-[12px] leading-snug text-[#5A7A8A] -mt-3 mb-5">
            <span className="font-semibold text-[#3A5A6A]">Who can join:</span> {a.serves}
          </p>
        )}
        <div className="flex items-center justify-between">
          {a.price == null ? (
            <span className="text-[13px] text-[#7A9AAA] max-w-[9rem] leading-snug">Fees on their site</span>
          ) : (
            <div>
              <span className="font-['Cormorant_Garamond'] text-[24px] font-medium text-[#1C3A4A]">
                ${a.price}
              </span>
              <span className="text-[13px] text-[#7A9AAA]"> /{a.priceUnit}</span>
            </div>
          )}
          <a
            href={a.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-[#1A7A8A] text-white text-[13px] font-medium hover:bg-[#2A9AAA] transition-colors"
          >
            View details
          </a>
        </div>
        <button
          type="button"
          onClick={() => onToggleSave(a)}
          aria-pressed={saved}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full text-[14px] font-semibold transition-colors ${
            saved
              ? 'bg-[#0D5C6E] text-white hover:bg-[#1A7A8A]'
              : 'border-2 border-[#0D5C6E] text-[#0D5C6E] hover:bg-[#0D5C6E] hover:text-white'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          {saved ? savedLabel : saveLabel}
        </button>
      </div>
    </article>
  );
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [level, setLevel] = useState<'All' | 'rec' | 'club'>('All');
  // Camps only: which theme (a subject category or "All-around").
  const [theme, setTheme] = useState('All');
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0]);
  const [sort, setSort] = useState('default');
  const [providerActivities, setProviderActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Browsing for one child: their age and interests filter the results, and
  // what's saved remembers them (so its sessions land on their calendar).
  const [kids, setKids] = useState<MatchKid[]>([]);
  const [forKidId, setForKidId] = useState<string | null>(null);
  const [useInterests, setUseInterests] = useState(true);
  const [savedFor, setSavedFor] = useState<Record<string, string | null>>({});
  const forKid = useMemo(() => kids.find((k) => k.id === forKidId) ?? null, [kids, forKidId]);
  // Short confirmation after saving (and a visible message if a save fails).
  const [saveNote, setSaveNote] = useState<{ ok: boolean; text: string } | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showSaveNote(ok: boolean, text: string) {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setSaveNote({ ok, text });
    noteTimer.current = setTimeout(() => setSaveNote(null), ok ? 6000 : 8000);
  }
  const [claimedSeedIds, setClaimedSeedIds] = useState<Set<string>>(new Set());
  const [dateLines, setDateLines] = useState<Record<string, string>>({});

  // Merge static seed data with approved provider submissions. Seed listings a
  // provider has claimed are dropped from the static set — the provider's own
  // copy (same id) comes through providerActivities instead.
  const activities = useMemo<Activity[]>(() => {
    const seeds = (staticActivities as Activity[]).filter((a) => !claimedSeedIds.has(a.id));
    return [...seeds, ...providerActivities];
  }, [providerActivities, claimedSeedIds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat && CATEGORIES.includes(cat)) setCategory(cat);
    const th = params.get('theme');
    if (cat === 'Camps' && th && (CAMP_THEMES as readonly string[]).includes(th)) setTheme(th);
    const forId = params.get('for');
    if (forId) setForKidId(forId);
    const age = params.get('age');
    if (age) {
      // Normalize dashes — homepage uses en-dash (–), Discover uses hyphen (-)
      const normalized = age.replace('–', '-');
      const group = AGE_GROUPS.find(g => g.label.replace('–', '-') === normalized);
      if (group) setAgeGroup(group);
    }
  }, []);

  // Fetch approved provider listings from Supabase (via API)
  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => {
        if (data.activities) setProviderActivities(data.activities);
        if (Array.isArray(data.claimedSeedIds)) setClaimedSeedIds(new Set(data.claimedSeedIds));
        if (data.dateLines && typeof data.dateLines === 'object') setDateLines(data.dateLines);
      })
      .catch(() => {}); // Fail silently — static data still shows
  }, []);

  // Who's signed in + which activities they've already saved (for heart state).
  // Logged-out visitors (past the site gate but with no family session) just
  // get empty saved state; tapping a heart sends them to sign in.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from('profiles')
        .select('kids')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }: { data: { kids: unknown } | null }) => setKids(browsableKids(data?.kids)));
      const useRows = (data: { activity_id: string; kid_id?: string | null }[] | null) => {
        if (!data) return;
        setSavedIds(new Set(data.map((r) => r.activity_id)));
        setSavedFor(Object.fromEntries(data.map((r) => [r.activity_id, r.kid_id ?? null])));
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

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('All');
    setLevel('All');
  }, [category]);

  const results = useMemo(() => {
    const filtered = activities.filter((a) => {
      const matchesQuery =
        query === '' ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.provider.toLowerCase().includes(query.toLowerCase()) ||
        a.neighborhood.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || a.category === category;
      const matchesAge = a.ageMax >= ageGroup.min && a.ageMin <= ageGroup.max;
      // For one child: their age, and (unless a category is picked or they
      // asked for everything) the categories their interests point to.
      const matchesKid = !forKid || fitsKid(a, forKid, useInterests && category === 'All');
      const matchesLevel = level === 'All' || a.level === level;
      const matchesTheme = category !== 'Camps' || theme === 'All' || campTheme(a) === theme;
      return matchesQuery && matchesCategory && matchesAge && matchesKid && matchesLevel && matchesTheme;
    });
    const arr = [...filtered];
    // Listings without a posted fee go last either way.
    const fee = (a: Activity, none: number) => a.price ?? none;
    if (sort === 'price-asc')  arr.sort((a, b) => fee(a, Infinity) - fee(b, Infinity));
    if (sort === 'price-desc') arr.sort((a, b) => fee(b, -Infinity) - fee(a, -Infinity));
    if (sort === 'age-asc')    arr.sort((a, b) => a.ageMin - b.ageMin);
    if (sort === 'age-desc')   arr.sort((a, b) => b.ageMin - a.ageMin);
    return arr;
    // `activities` must be a dependency: provider listings arrive from the API
    // after first render, and without it they never appeared until a filter
    // changed.
  }, [activities, query, category, ageGroup, sort, forKid, useInterests, level, theme]);

  // Inside Camps the subcategory is when it runs, and one camp can run in
  // several (e.g. summer and school breaks).
  const subsOf = (a: Activity): string[] => (a.category === 'Camps' ? campWhens(a) : [a.subcategory ?? 'Other']);

  // Camps: the theme pills (only themes that have camps).
  const campThemes = useMemo(
    () => (category === 'Camps' ? CAMP_THEMES.filter((t) => activities.some((a) => a.category === 'Camps' && campTheme(a) === t)) : []),
    [activities, category]
  );

  // On a subject page (e.g. Outdoor): how many camps of that subject fit, for
  // the "see them under Camps" link. Camps live only in Camps.
  const campsForSubject = useMemo(() => {
    if (category === 'All' || category === 'Camps') return 0;
    return activities.filter(
      (a) => a.category === 'Camps' && campTheme(a) === category &&
        a.ageMax >= ageGroup.min && a.ageMin <= ageGroup.max &&
        (!forKid || fitsKid(a, forKid, false))
    ).length;
  }, [activities, category, ageGroup, forKid]);

  // Rec vs club pills, when the chosen category has listings with a level.
  const showLevels = useMemo(
    () => category !== 'All' && activities.some((a) => a.category === category && (a.level === 'rec' || a.level === 'club')),
    [activities, category]
  );

  // Subcategory pills — ordered, derived from current results
  const availableSubcategories = useMemo(() => {
    if (category === 'All') return [];
    const order = SUBCATEGORY_ORDER[category] ?? [];
    const present = new Set(results.flatMap((a) => subsOf(a as Activity)));
    const ordered = order.filter(s => present.has(s));
    present.forEach(s => { if (!order.includes(s)) ordered.push(s); });
    return ordered;
  }, [results, category]);

  // Results after subcategory filter
  const filteredResults = useMemo(() => {
    if (subcategory === 'All') return results;
    return results.filter((a) => subsOf(a as Activity).includes(subcategory));
  }, [results, subcategory]);

  const grouped = useMemo(() => {
    if (category === 'All' || query !== '' || subcategory !== 'All') return null;
    const groups: Record<string, typeof results> = {};
    results.forEach((a) => {
      for (const key of subsOf(a as Activity)) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
      }
    });
    const order = SUBCATEGORY_ORDER[category] ?? [];
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [results, category, query]);

  function chooseKid(id: string | null) {
    setForKidId(id);
    setUseInterests(true);
    setCategory('All');
    setTheme('All');
    setAgeGroup(AGE_GROUPS[0]);
    // Keep the address in step, so a refresh or a shared link shows the same.
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('for', id);
    else url.searchParams.delete('for');
    url.searchParams.delete('age');
    url.searchParams.delete('category');
    window.history.replaceState(null, '', url.toString());
  }

  const kidName = (id: string | null | undefined) => kids.find((k) => k.id === id)?.name ?? null;
  function labelsFor(a: Activity) {
    const who = kidName(savedFor[a.id]);
    return {
      saveLabel: forKid ? `Save for ${forKid.name}` : 'Save to my dashboard',
      savedLabel: who ? `Saved for ${who}` : 'Saved to your dashboard',
    };
  }

  const clearAll = () => {
    chooseKid(null);
    setQuery('');
    setCategory('All');
    setTheme('All');
    setSubcategory('All');
    setLevel('All');
    setAgeGroup(AGE_GROUPS[0]);
    setSort('default');
  };

  // Save / unsave an activity. Optimistic — revert on error. Writes go straight
  // to Supabase from the browser (anon client); RLS scopes rows to this user.
  async function toggleSave(a: Activity) {
    if (!userId) {
      // Not signed in — send to family sign in, then back to Discover.
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
      const { error } = await supabase
        .from('saved_activities')
        .delete()
        .eq('user_id', userId)
        .eq('activity_id', a.id);
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
        // kid_id column not added yet: still save, just without the child.
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

  return (
    <main className="min-h-screen bg-white">

      {/* Save confirmation */}
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
                <a href="/families/dashboard" className="font-semibold underline whitespace-nowrap">
                  Open dashboard →
                </a>
              </>
            )}
          </p>
          <button type="button" onClick={() => setSaveNote(null)} aria-label="Dismiss" className="text-white/80 hover:text-white text-[18px] leading-none">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <section className="bg-[#0D5C6E] px-6 md:px-10 lg:px-16 pt-32 pb-12">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7A9AAA] mb-4">
            Seattle Metro
          </p>
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(38px,5vw,64px)] font-light leading-[1.1] tracking-tight text-white mb-4">
            Everything for your kids,<br />
            <em className="italic text-[#C4A882]">in one place.</em>
          </h1>
          <p className="text-[17px] text-[#D6EEF2] leading-relaxed max-w-[520px] mb-10">
            Camps, classes, and activities across Seattle. Search once &mdash; find what fits.
          </p>
          <div className="relative max-w-[560px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'soccer', 'Ballard', or 'art camp'..."
              className="w-full bg-white text-[#1C3A4A] text-[16px] rounded-full pl-14 pr-6 py-4 outline-none border-2 border-transparent focus:border-[#2A9AAA] transition-colors placeholder:text-[#7A9AAA]"
            />
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A9AAA]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-[#E8DFC8] bg-[#F5EFE0] px-6 md:px-10 lg:px-16 py-6 sticky top-16 z-10">
        <div className="max-w-[1280px] mx-auto space-y-4">

          {kids.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A9AAA] mb-2">
                Browsing for
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible scrollbar-hide">
                {[null, ...kids].map((k) => {
                  const active = (k?.id ?? null) === (forKid?.id ?? null);
                  return (
                    <button
                      key={k?.id ?? 'everyone'}
                      type="button"
                      onClick={() => chooseKid(k?.id ?? null)}
                      aria-pressed={active}
                      className={
                        active
                          ? 'px-4 py-2 rounded-full text-[13px] font-semibold bg-[#0D5C6E] text-white shadow-sm whitespace-nowrap shrink-0 transition-all'
                          : 'px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'
                      }
                    >
                      {k ? `${k.name}${k.age != null ? ` · ${k.age}` : ''}` : 'Everyone'}
                    </button>
                  );
                })}
              </div>
              {forKid && (
                <p className="text-[12.5px] text-[#5A7A8A] mt-2">
                  {forKid.interests.length > 0 && useInterests && category === 'All' ? (
                    <>
                      Matching {forKid.name}&rsquo;s interests: {forKid.interests.join(', ')}
                      {forKid.age != null ? `, for age ${forKid.age}` : ''}.{' '}
                      <button type="button" onClick={() => setUseInterests(false)} className="font-semibold text-[#1A7A8A] underline">
                        Show everything{forKid.age != null ? ` for age ${forKid.age}` : ''}
                      </button>
                    </>
                  ) : (
                    <>
                      {forKid.age != null ? `Everything for age ${forKid.age}.` : `Everything for ${forKid.name}.`}{' '}
                      {forKid.interests.length > 0 ? (
                        category === 'All' && (
                          <button type="button" onClick={() => setUseInterests(true)} className="font-semibold text-[#1A7A8A] underline">
                            Just {forKid.name}&rsquo;s interests
                          </button>
                        )
                      ) : (
                        <a href="/families/dashboard#family-profile" className="font-semibold text-[#1A7A8A] underline">
                          Add {forKid.name}&rsquo;s interests for better matches
                        </a>
                      )}
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A9AAA] mb-2">
              Category
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setTheme('All'); }}
                  className={
                    category === c
                      ? 'px-4 py-2 rounded-full text-[13px] font-medium bg-[#1A7A8A] text-white shadow-sm whitespace-nowrap shrink-0 transition-all'
                      : 'px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {!(forKid && forKid.age != null) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A9AAA] mb-2">
              Age
            </p>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setAgeGroup(g)}
                  className={
                    ageGroup.label === g.label
                      ? 'px-4 py-2 rounded-full text-[13px] font-medium bg-[#1A7A8A] text-white shadow-sm transition-all'
                      : 'px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] transition-all'
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          )}

        </div>
      </section>

      {/* Results */}
      <section className="px-6 md:px-10 lg:px-16 py-12">
        <div className="max-w-[1280px] mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <p className="text-[14px] text-[#3A5A6A] shrink-0">
              <span className="font-semibold text-[#1C3A4A]">{filteredResults.length}</span>
              {filteredResults.length === 1 ? ' activity' : ' activities'} found
            </p>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="sm:ml-auto text-[12px] text-[#3A5A6A] border border-[#E8DFC8] rounded-full px-4 py-1.5 bg-white outline-none cursor-pointer hover:border-[#1A7A8A] transition-colors shrink-0"
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="age-asc">Age: Youngest first</option>
              <option value="age-desc">Age: Oldest first</option>
            </select>
            {availableSubcategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSubcategory('All')}
                  className={subcategory === 'All'
                    ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#1A7A8A] text-white whitespace-nowrap shrink-0 transition-all'
                    : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'}
                >
                  All
                </button>
                {availableSubcategories.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubcategory(s)}
                    className={subcategory === s
                      ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#1A7A8A] text-white whitespace-nowrap shrink-0 transition-all'
                      : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {showLevels && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Level">
                {([{ key: 'All', label: 'Any level' }, ...LEVELS] as { key: 'All' | 'rec' | 'club'; label: string }[]).map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setLevel(l.key)}
                    aria-pressed={level === l.key}
                    className={level === l.key
                      ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#0D5C6E] text-white whitespace-nowrap shrink-0 transition-all'
                      : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#F5EFE0] text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#0D5C6E] whitespace-nowrap shrink-0 transition-all'}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
            {campThemes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Camp theme">
                {['All', ...campThemes].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    aria-pressed={theme === t}
                    className={theme === t
                      ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#0D5C6E] text-white whitespace-nowrap shrink-0 transition-all'
                      : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#F5EFE0] text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#0D5C6E] whitespace-nowrap shrink-0 transition-all'}
                  >
                    {t === 'All' ? 'Any theme' : themeLabel(t)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {campsForSubject > 0 && (
            <button
              type="button"
              onClick={() => { const c = category; setCategory('Camps'); setTheme(c); }}
              className="mb-8 -mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-[#C4A882]/15 text-[13px] font-semibold text-[#7A5A2E] hover:bg-[#C4A882]/25 transition-colors"
            >
              {campsForSubject} {category === 'STEM' ? 'STEM' : category.toLowerCase()} {campsForSubject === 1 ? 'camp' : 'camps'} are under Camps: see {campsForSubject === 1 ? 'it' : 'them'} →
            </button>
          )}

          {filteredResults.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-['Cormorant_Garamond'] text-[28px] text-[#1C3A4A] mb-3">
                Nothing matches that &mdash; yet.
              </p>
              <p className="text-[15px] text-[#3A5A6A] mb-6">
                We&apos;re adding new providers across Seattle every week.
              </p>
              <button
                onClick={clearAll}
                className="px-6 py-3 rounded-full bg-[#1A7A8A] text-white text-[14px] font-medium hover:bg-[#2A9AAA] transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : grouped ? (
            <div className="space-y-14">
              {grouped.map(([subcat, items]) => (
                <div key={subcat}>
                  <div className="flex items-baseline gap-3 mb-6 pb-3 border-b border-[#E8DFC8]">
                    <h2 className="font-['Cormorant_Garamond'] text-[24px] font-semibold text-[#1C3A4A]">
                      {subcat}
                    </h2>
                    <span className="text-[13px] text-[#7A9AAA]">{items.length} {items.length === 1 ? 'provider' : 'providers'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((a) => (
                      <ActivityCard key={a.id} a={a} saved={savedIds.has(a.id)} onToggleSave={toggleSave} dateLine={dateLines[a.id]} {...labelsFor(a)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((a) => (
                <ActivityCard key={a.id} a={a} saved={savedIds.has(a.id)} onToggleSave={toggleSave} dateLine={dateLines[a.id]} {...labelsFor(a)} />
              ))}
            </div>
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
