'use client';

// Discover's search box: type it the way you'd say it. What we understood
// shows as chips the parent can remove (the page owns those); while typing, a
// "Reads as…" line and suggestions (activities, places, programs).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  describe, nearestArea, parse, suggestActivities, suggestPlaces, SEARCH_EXAMPLES,
  type Place, type SearchQuery,
} from '@/lib/search';
import { kindsOf } from '@/lib/kinds';
import { campTheme } from '@/lib/camps';

type Listing = { id: string; title: string; provider: string; category: string; subcategory?: string | null; theme?: string | null };

interface Option {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

// Short enough to fit a phone's search box.
const PLACEHOLDERS = [
  'Try “swim near 98126”',
  'Try “jiu-jitsu, age 7”',
  'Try “free summer camp”',
  'Try “piano under $150”',
];

export default function SearchBox({
  activities,
  kids,
  profileArea,
  chips,
  onApply,
  onClear,
  inputRef,
}: {
  activities: Listing[];
  kids: { id: string; name: string }[];
  /** The family's neighborhood from their profile, if signed in. */
  profileArea: string | null;
  chips: { label: string; remove: () => void }[];
  onApply: (q: SearchQuery) => void;
  onClear: () => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [ph, setPh] = useState(0);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? ownRef;

  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  function apply(query: SearchQuery) {
    onApply(query);
    setQ('');
    setOpen(false);
    setActive(-1);
    setLocNote(null);
  }
  const run = (text: string) => () => apply(parse(text, kids));
  const applyPlace = (place: Place) => () => apply({ place });

  function useLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocNote('Your browser can’t share a location. Type your ZIP or neighborhood instead.');
      return;
    }
    setLocating(true);
    setLocNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const near = nearestArea(pos.coords.latitude, pos.coords.longitude);
        if (near.miles > 15) {
          setLocNote('You seem to be outside the Seattle area. Type a ZIP or neighborhood instead.');
          return;
        }
        apply({ place: { area: near.area, me: true } });
      },
      () => {
        setLocating(false);
        setLocNote('We couldn’t get your location. Type your ZIP or neighborhood instead.');
        ref.current?.focus();
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  // How many listings an activity suggestion would show.
  const countFor = (label: string): number | null => {
    const p = parse(label);
    if (!p.cat) return null;
    return activities.filter(
      (a) =>
        a.category === p.cat &&
        (!p.kind || kindsOf(a).includes(p.kind)) &&
        (!p.theme || p.theme === 'All' || campTheme(a) === p.theme)
    ).length;
  };

  const typed = q.trim();
  const sections = useMemo(() => {
    const out: { title: string; options: Option[] }[] = [];
    if (!typed) {
      const first: Option[] = [];
      if (profileArea) first.push({ id: 'profile', label: `Near ${profileArea}`, hint: 'Your neighborhood', run: applyPlace({ area: profileArea, profile: true }) });
      first.push({ id: 'loc', label: locating ? 'Finding you…' : 'Use my location', hint: '', run: useLocation });
      out.push({ title: '', options: first });
      out.push({ title: 'Try', options: SEARCH_EXAMPLES.map((x, i) => ({ id: `ex${i}`, label: x, run: run(x) })) });
      return out;
    }
    out.push({ title: '', options: [{ id: 'typed', label: `Search for “${typed}”`, hint: '', run: run(typed) }] });
    const acts = suggestActivities(typed).map((label, i) => {
      const n = countFor(label);
      return { id: `a${i}`, label, hint: n == null ? '' : `${n} ${n === 1 ? 'program' : 'programs'}`, run: run(label) };
    });
    if (acts.length) out.push({ title: 'Activities', options: acts });
    const places = suggestPlaces(typed).map((p, i) => ({ id: `p${i}`, label: p.label, hint: p.hint, run: run(p.query) }));
    if (places.length) out.push({ title: 'Places', options: places });
    if (typed.length >= 3) {
      const low = typed.toLowerCase();
      const progs = activities
        .filter((a) => `${a.title} ${a.provider}`.toLowerCase().includes(low))
        .slice(0, 3)
        .map((a, i) => ({ id: `g${i}`, label: a.title, hint: a.provider, run: () => apply({ text: a.title.toLowerCase() }) }));
      if (progs.length) out.push({ title: 'Programs', options: progs });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, activities, kids, profileArea, locating]);

  const flat = sections.flatMap((s) => s.options);
  const preview = typed ? describe(parse(typed, kids), kids) : [];

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && flat[active]) flat[active].run();
      else if (typed) apply(parse(typed, kids));
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor="ls-search" className="font-['Cormorant_Garamond'] text-[22px] font-medium text-white">
        What are you looking for?
      </label>
      <div className="relative">
        <div className="flex items-center gap-2.5 min-h-[56px] pl-[18px] pr-1.5 rounded-full bg-white shadow-[0_8px_28px_rgba(0,0,0,0.14)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E6B78" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={ref}
            id="ls-search"
            type="search"
            role="combobox"
            autoComplete="off"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setOpen(true); }}
            onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
            onKeyDown={onKeyDown}
            placeholder={PLACEHOLDERS[ph]}
            aria-expanded={open}
            aria-controls="ls-suggest"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 && flat[active] ? `ls-opt-${flat[active].id}` : undefined}
            aria-describedby="ls-search-hint"
            className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#1C3A4A] placeholder:text-[#6A8794]"
          />
          <button
            type="button"
            onClick={() => (typed ? apply(parse(typed, kids)) : ref.current?.focus())}
            className="shrink-0 min-h-[44px] px-5 rounded-full bg-[#0D5C6E] text-white text-[15px] font-semibold hover:bg-[#1A7A8A] transition-colors"
          >
            Search
          </button>
        </div>

        {open && (
          <div
            id="ls-suggest"
            role="listbox"
            className="absolute top-[64px] left-0 right-0 z-30 bg-white rounded-[20px] shadow-[0_16px_48px_rgba(10,40,50,0.22)] p-2.5 flex flex-col gap-1 max-h-[440px] overflow-y-auto"
          >
            {typed && (
              <p className="px-3 pt-1 pb-2 text-[13px] text-[#4E6B78]">
                {preview.length ? <>Reads as: <span className="font-semibold text-[#1C3A4A]">{preview.join(' · ')}</span></> : 'Keep typing: an activity, a place, an age…'}
              </p>
            )}
            {locNote && <p className="px-3 py-2 text-[13px] text-[#8A5A1F]">{locNote}</p>}
            {sections.map((s, si) => (
              <div key={si} className="flex flex-col">
                {s.title && (
                  <span className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5F7A86]">{s.title}</span>
                )}
                {s.options.map((o) => {
                  const idx = flat.indexOf(o);
                  const isActive = idx === active;
                  const strong = o.id === 'typed' || o.id === 'loc' || o.id === 'profile';
                  return (
                    <button
                      key={o.id}
                      id={`ls-opt-${o.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(e) => { e.preventDefault(); o.run(); }}
                      onMouseEnter={() => setActive(idx)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-[12px] text-left flex items-baseline justify-between gap-3 transition-colors ${
                        isActive ? 'bg-[#E4ECF3]' : strong ? 'bg-[#F5EFE0]' : 'bg-transparent'
                      }`}
                    >
                      <span className={`text-[15px] ${strong ? 'font-semibold text-[#0D5C6E]' : 'text-[#1C3A4A]'}`}>{o.label}</span>
                      {o.hint && <span className="shrink-0 text-[12.5px] text-[#5F7A86]">{o.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {chips.length === 0 ? (
        <p id="ls-search-hint" className="text-[13px] leading-snug text-[#C5D8E8]">
          An activity, a neighborhood or ZIP, an age, or “free”. Say it however you like.
        </p>
      ) : (
        <div id="ls-search-hint" className="flex flex-wrap items-center gap-2" aria-label="What you searched for">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.remove}
              aria-label={`Remove ${c.label}`}
              className="min-h-[36px] pl-3.5 pr-2 rounded-full bg-white text-[#0D5C6E] text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#F5EFE0] transition-colors"
            >
              {c.label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E6B78" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
          <button type="button" onClick={onClear} className="min-h-[36px] px-2 text-[13px] font-semibold text-[#C5D8E8] underline underline-offset-2 hover:text-white">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
