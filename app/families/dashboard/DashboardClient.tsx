'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { CalendarPanel, SessionPicker, type CalendarPick, type CalendarSession } from './CalendarParts';
import FamilyRhythm from './FamilyRhythm';
import { KID_ID_RE, kidColor, kidLabel, newKidId, type Kid as CalendarKid } from '@/lib/calendar-grid';
import type { DateItem } from '@/lib/activity-dates';

import { INTERESTS, NEIGHBORHOODS } from '@/lib/family-profile';
import { normalizeInterests } from '@/lib/categories';
import SavedList from './SavedList';
import { LineIcon } from '@/app/components/LineIcon';

interface Kid {
  age?: number;
  name?: string;
  id?: string; // stable id so calendar items can be assigned to a child
  interests?: string[];
}

export interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  neighborhood: string;
  kids: Kid[];
  preferences: string[];
}

export interface SavedActivity {
  activity_id: string;
  title: string | null;
  provider: string | null;
  category: string | null;
  neighborhood: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  price_unit: string | null;
  website: string | null;
  created_at: string;
  /** Saved for this child (Discover's "Browsing for"), if any. */
  kid_id?: string | null;
}

export interface CalendarData {
  /** Hour of day in Seattle when the page was made (for the greeting). */
  hour: number;
  feedUrl: string;
  emailAlerts: boolean;
  today: string;
  /** Upcoming sessions per saved activity id. */
  sessions: Record<string, CalendarSession[]>;
  /** Upcoming registration windows per saved activity id. */
  registrations: Record<string, DateItem[]>;
  picks: CalendarPick[];
  /** The family's kids with stable ids (for coloring calendar items). */
  kids: CalendarKid[];
  /** "activityId|YYYY-MM-DD" registration openings with "Remind me" on. */
  reminders: string[];
}

export default function DashboardClient({
  profile,
  savedActivities,
  dateLines,
  calendar,
}: {
  profile: Profile;
  savedActivities: SavedActivity[];
  dateLines: Record<string, string>;
  calendar: CalendarData | null;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  // Interests are per child. Older profiles only have family-wide interests
  // (`preferences`): with one child those become that child's; with several
  // we don't guess.
  const [form, setForm] = useState({
    first_name: profile.first_name,
    neighborhood: profile.neighborhood,
    kids: profile.kids.length
      ? profile.kids.map((k) => ({
          id: k.id && KID_ID_RE.test(k.id) ? k.id : newKidId(),
          name: k.name ?? '',
          age: String(k.age ?? ''),
          interests: normalizeInterests(k.interests ?? (profile.kids.length === 1 ? profile.preferences : [])),
        }))
      : [{ id: newKidId(), name: '', age: '', interests: [] as string[] }],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [saved, setSaved] = useState<SavedActivity[]>(savedActivities);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Calendar picks, shared by the month calendar and the activity cards.
  const [picks, setPicks] = useState<CalendarPick[]>(calendar?.picks ?? []);
  const [calBusy, setCalBusy] = useState<string | null>(null);
  const [calError, setCalError] = useState('');
  const [showSync, setShowSync] = useState(false);
  const [reminders, setReminders] = useState<string[]>(calendar?.reminders ?? []);

  // "Switch to the Saturday class": add the new session for the same child, then drop the old one.
  async function switchSession(activityId: string, fromKey: string, toKey: string, kidId: string | null) {
    const added = await pickAction(activityId, toKey, 'add', kidId);
    if (added) await pickAction(activityId, fromKey, 'remove');
  }

  async function setReminder(activityId: string, date: string, on: boolean) {
    const id = `${activityId}|${date}`;
    setCalBusy(`reminder|${id}`);
    setCalError('');
    try {
      const res = await fetch('/api/families/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, date, on }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Could not change the reminder. Please try again.');
      setReminders((prev) => (on ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));
    } catch (e) {
      setCalError(e instanceof Error ? e.message : 'Could not change the reminder. Please try again.');
    } finally {
      setCalBusy(null);
    }
  }

  async function pickAction(activityId: string, key: string, action: 'add' | 'remove' | 'assign', kidId: string | null = null): Promise<boolean> {
    setCalBusy(`${activityId}|${key}`);
    setCalError('');
    try {
      const res = await fetch('/api/families/calendar/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, sessionKey: key, action, kidId }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Something went wrong. Please try again.');
      setPicks((prev) => {
        const rest = prev.filter((p) => !(p.activityId === activityId && p.key === key));
        if (action === 'remove') return rest;
        const existing = prev.find((p) => p.activityId === activityId && p.key === key);
        if (action === 'assign') return existing ? [...rest, { ...existing, kidId }] : prev;
        const session = calendar?.sessions[activityId]?.find((x) => x.key === key);
        return [
          ...rest,
          { activityId, key, status: 'active', changeNote: null, text: session?.text ?? '', kidId, anchor: calendar?.today ?? '' },
        ];
      });
      return true;
    } catch (e) {
      setCalError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      return false;
    } finally {
      setCalBusy(null);
    }
  }

  // The child a saved activity is for, if they're still in the profile.
  function forKidOf(s: SavedActivity): { id: string; label: string } | null {
    const kids = calendar?.kids ?? [];
    const i = s.kid_id ? kids.findIndex((k) => k.id === s.kid_id) : -1;
    return i >= 0 ? { id: kids[i].id, label: kidLabel(kids[i], i) } : null;
  }

  const isProfileEmpty =
    !profile.first_name && !profile.neighborhood && profile.kids.length === 0 && profile.preferences.length === 0;

  function toggleKidInterest(i: number, interest: string) {
    setForm((prev) => ({
      ...prev,
      kids: prev.kids.map((k, idx) =>
        idx !== i ? k : { ...k, interests: k.interests.includes(interest) ? k.interests.filter((x) => x !== interest) : [...k.interests, interest] }
      ),
    }));
  }

  function updateKid(i: number, field: 'name' | 'age', value: string) {
    setForm((prev) => ({
      ...prev,
      kids: prev.kids.map((k, idx) => (idx === i ? { ...k, [field]: value } : k)),
    }));
  }

  function addKid() {
    setForm((prev) => ({ ...prev, kids: [...prev.kids, { id: newKidId(), name: '', age: '', interests: [] as string[] }] }));
  }

  function removeKid(i: number) {
    setForm((prev) => ({ ...prev, kids: prev.kids.filter((_, idx) => idx !== i) }));
  }

  // Saved by the server (it creates the profile row if this account doesn't
  // have one yet), so a failed save always shows a message.
  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/families/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          neighborhood: form.neighborhood,
          // Keep each child's id: calendar items assigned to a child point at it.
          kids: form.kids.map((k) => ({ id: k.id, name: k.name, age: k.age.trim(), interests: k.interests })),
        }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Could not save changes. Please try again.');
      setEditing(false);
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function handleRemoveSaved(activityId: string) {
    setRemovingId(activityId);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRemovingId(null);
      return;
    }

    const prev = saved;
    setSaved((s) => s.filter((x) => x.activity_id !== activityId)); // optimistic

    const { error } = await supabase
      .from('saved_activities')
      .delete()
      .eq('user_id', user.id)
      .eq('activity_id', activityId);

    setRemovingId(null);

    if (error) {
      setSaved(prev); // revert
      return;
    }
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream-500 px-4 py-16 pt-28">
      <div className="max-w-[1080px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-teal-800/[0.08] border border-teal-800/15 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-800 whitespace-nowrap">Family Dashboard</span>
            </div>
            {!calendar && (
              <h1 className="font-display text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-tight text-text-dark">
                Hi {profile.first_name || 'there'}<em className="italic text-teal-800">.</em>
              </h1>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href="/discover"
              aria-label="Browse activities"
              className="inline-flex items-center justify-center gap-1.5 h-10 min-w-10 rounded-full bg-teal-800 text-white text-[13px] font-semibold px-4 hover:bg-teal-700 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="hidden sm:inline">Browse activities</span>
            </a>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="min-h-10 text-[13px] font-medium text-text-muted hover:text-teal-800 transition-colors whitespace-nowrap"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {isProfileEmpty && !editing && (
          <div className="max-w-[760px] mx-auto bg-teal-800/[0.08] border border-teal-800/15 rounded-[16px] px-5 py-4 mb-6">
            <p className="text-[14px] text-teal-800 font-medium">
              Complete your family profile to get activity picks matched to your kids.
            </p>
          </div>
        )}

        {/* Family Rhythm */}
        {calendar && (
          <>
            <FamilyRhythm
              firstName={profile.first_name}
              hour={calendar.hour}
              today={calendar.today}
              activities={saved.map((s) => ({
                activityId: s.activity_id,
                title: s.title ?? 'Activity',
                provider: s.provider,
                website: s.website,
                neighborhood: s.neighborhood,
                ageMin: s.age_min,
                ageMax: s.age_max,
                category: s.category,
                forKid: s.kid_id ?? null,
              }))}
              sessions={calendar.sessions}
              registrations={calendar.registrations}
              picks={picks}
              kids={calendar.kids}
              reminders={reminders}
              busy={calBusy}
              onAdd={(a, k, kid) => pickAction(a, k, 'add', kid)}
              onRemove={(a, k) => pickAction(a, k, 'remove')}
              onAssign={(a, k, kid) => pickAction(a, k, 'assign', kid)}
              onSwitch={switchSession}
              onReminder={setReminder}
            />
            {calError && (
              <p className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-[420px] z-50 rounded-[14px] bg-error text-white text-[14px] px-4 py-3 shadow-lg" role="alert">
                {calError}
              </p>
            )}
          </>
        )}

        {/* Saved activities + your family (approved 2026-11-20, canvas
            https://claude.ai/artifact/EUtavJuUysZ3SSMzXS88Ny). The family
            panel sits beside the list and takes the full width while editing. */}
        <div className="flex flex-wrap items-start gap-6 mt-10">
          <div className={`min-w-0 ${editing ? 'basis-full' : 'flex-[999_1_600px]'}`}>
            <SavedList
              saved={saved}
              kids={calendar?.kids ?? []}
              dateLines={dateLines}
              removingId={removingId}
              onRemove={handleRemoveSaved}
              sessions={(s) =>
                calendar && ((calendar.sessions[s.activity_id] ?? []).length || picks.some((p) => p.activityId === s.activity_id && p.status === 'gone')) ? (
                  <SessionPicker
                    activity={{
                      activityId: s.activity_id,
                      title: s.title ?? 'Activity',
                      provider: s.provider,
                      website: s.website,
                      neighborhood: s.neighborhood,
                    }}
                    sessions={calendar.sessions[s.activity_id] ?? []}
                    picks={picks.filter((p) => p.activityId === s.activity_id)}
                    today={calendar.today}
                    busy={calBusy}
                    kidName={forKidOf(s)?.label}
                    onToggle={(key, isPicked) => pickAction(s.activity_id, key, isPicked ? 'remove' : 'add', isPicked ? null : forKidOf(s)?.id ?? null)}
                  />
                ) : null
              }
            />
          </div>
          <aside className={`min-w-0 flex flex-col gap-3 ${editing ? 'basis-full order-first' : 'flex-[1_1_280px]'}`}>
        {/* Profile card */}
        <div id="family-profile" className="scroll-mt-24 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(10,74,90,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[24px] font-normal text-text-dark">
              Your family
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="min-h-[36px] px-3.5 rounded-pill border-[1.5px] border-cream-700 bg-white text-[13px] font-semibold text-teal-700 hover:border-teal-700"
              >
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] text-text-dark flex items-center gap-1.5">
                  <LineIcon name="pin" size={16} color="#A8865A" className="shrink-0" />
                  {[[profile.first_name, profile.last_name].filter(Boolean).join(' '), profile.neighborhood].filter(Boolean).join(' · ') || 'Add your name and neighborhood'}
                </p>
                <p className="text-[12.5px] text-text-mid pl-[22px] break-all">{profile.email}</p>
              </div>
              {profile.kids.map((k, i) => {
                const interests = normalizeInterests(k.interests ?? (profile.kids.length === 1 ? profile.preferences : []));
                const color = calendar ? kidColor(calendar.kids, k.id) : '#0D5C6E';
                const name = k.name || `Kid ${i + 1}`;
                return (
                  <div key={k.id ?? i} className="flex gap-2.5 items-start pt-3 border-t border-cream-700">
                    <span className="shrink-0 w-[34px] h-[34px] rounded-full text-white text-[14px] font-semibold inline-flex items-center justify-center" style={{ background: color }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <p className="text-[14.5px] font-semibold text-text-dark">
                        {name}
                        {k.age != null && <span className="font-normal text-text-mid"> · {k.age}</span>}
                      </p>
                      {interests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {interests.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-blue-grey-300/40 text-teal-800">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {profile.kids.length === 0 && <p className="text-[14px] text-text-mid">Add your kids to get picks matched to each of them.</p>}
              {profile.kids.length > 1 && profile.preferences.length > 0 && !profile.kids.some((k) => k.interests?.length) && (
                <p className="text-[12px] text-text-muted">Family interests from signup: {normalizeInterests(profile.preferences).join(', ')}. Tap Edit to choose them for each child.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-first-name" className="text-[13px] font-medium text-teal-800">Your first name</label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={form.first_name}
                  maxLength={40}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="So we can say hello"
                  className="h-12 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white transition-colors focus:outline-none focus:border-teal-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-teal-800">Neighborhood</label>
                <div className="relative">
                  <select
                    value={form.neighborhood}
                    onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                    className="w-full h-12 rounded-[12px] border-2 border-cream-700 px-4 pr-10 text-[15px] font-body text-text-dark bg-white appearance-none transition-colors focus:outline-none focus:border-teal-800"
                  >
                    <option value="">Select a neighborhood</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-teal-800 text-xs">▾</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[13px] font-medium text-teal-800">Kids</p>
                  <p className="text-[12px] text-text-muted">First names label and color your Family Rhythm; interests help us suggest the right things for each child.</p>
                  <p className="text-[12px] text-text-mid mt-1">Interests now match Discover&apos;s categories. Martial Arts, Early Childhood, Language and Cooking have their own choices.</p>
                </div>
                {form.kids.map((kid, i) => (
                  <div key={kid.id} className="rounded-[16px] border-2 border-cream-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={kid.name}
                        maxLength={40}
                        onChange={(e) => updateKid(i, 'name', e.target.value)}
                        placeholder="First name"
                        aria-label={`Kid ${i + 1} first name`}
                        className="h-11 flex-[3] min-w-0 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white transition-colors focus:outline-none focus:border-teal-800"
                      />
                      <input
                        type="number"
                        min={0}
                        max={18}
                        value={kid.age}
                        onChange={(e) => updateKid(i, 'age', e.target.value)}
                        placeholder="Age"
                        aria-label={`Kid ${i + 1} age`}
                        className="h-11 flex-[2] min-w-0 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white transition-colors focus:outline-none focus:border-teal-800"
                      />
                      {form.kids.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKid(i)}
                          className="text-text-muted hover:text-error text-sm px-2"
                          aria-label={`Remove ${kid.name || `kid ${i + 1}`}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-text-mid mb-1.5">{kid.name ? `${kid.name}’s interests` : 'Interests'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {INTERESTS.map((interest) => {
                        const active = kid.interests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleKidInterest(i, interest)}
                            className={`min-h-[36px] px-3 py-1.5 rounded-full text-[12.5px] font-medium border-2 transition-colors inline-flex items-center gap-1.5 ${
                              active ? 'bg-teal-800 border-teal-800 text-white' : 'bg-white border-cream-700 text-text-mid hover:border-blue-grey-300'
                            }`}
                          >
                            <LineIcon name={interest} size={16} color={active ? '#F5EFE0' : '#A8865A'} className="shrink-0" />
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {form.kids.length < 8 && (
                  <button
                    type="button"
                    onClick={addKid}
                    className="self-start text-[13px] font-semibold text-teal-700 hover:text-teal-800"
                  >
                    + Add a child
                  </button>
                )}
              </div>

              {saveError && (
                <p className="text-[13px] text-error bg-error/[0.08] border border-error/20 rounded-[10px] px-4 py-3">
                  {saveError}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-[48px] rounded-full border-2 border-cream-700 text-text-mid font-semibold text-[14px] px-6 hover:border-blue-grey-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`h-[48px] flex-1 rounded-full bg-teal-800 text-white font-semibold text-[14px] transition-all duration-200 ${
                    saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-700'
                  }`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
            {calendar && (
            <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(10,74,90,0.07)] px-4 py-3.5">
              <button
                type="button"
                onClick={() => setShowSync((v) => !v)}
                aria-expanded={showSync}
                className="min-h-[36px] w-full flex items-center gap-2.5 text-left text-[14px] font-semibold text-text-dark hover:text-teal-800"
              >
                <LineIcon name="fresh" size={20} color="#A8865A" className="shrink-0" />
                <span className="flex-1">Sync to your phone &amp; email alerts</span>
                <span className="text-teal-700" aria-hidden="true">{showSync ? '▾' : '▸'}</span>
              </button>
              {showSync && (
                <div className="mt-3">
                  <CalendarPanel feedUrl={calendar.feedUrl} emailAlerts={calendar.emailAlerts} />
                </div>
              )}
            </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
