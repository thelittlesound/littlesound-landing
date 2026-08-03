'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const NEIGHBORHOODS = [
  'Ballard', 'Beacon Hill', 'Capitol Hill', 'Central District', 'Columbia City',
  'Eastlake', 'First Hill', 'Fremont', 'Green Lake', 'Greenwood',
  'Interbay', 'Kirkland', 'Lake City', 'Laurelhurst', 'Leschi',
  'Magnolia', 'Madrona', 'Mercer Island', 'Mount Baker', 'North Seattle',
  'Phinney Ridge', 'Queen Anne', 'Rainier Beach', 'Redmond', 'Shoreline',
  'South Lake Union', 'South Seattle', 'University District', 'Wallingford',
  'West Seattle', 'White Center', 'Citywide',
];

const INTERESTS = [
  'Camps', 'Sports & Athletics', 'Arts & Crafts', 'Music & Dance',
  'Academic & Tutoring', 'Outdoor Adventure', 'STEM & Tech',
  'Swim & Aquatics', 'Dance & Movement', 'Theater & Performance',
];

interface Kid {
  age: number;
}

export interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  neighborhood: string;
  kids: Kid[];
  preferences: string[];
}

export default function DashboardClient({ profile }: { profile: Profile }) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    neighborhood: profile.neighborhood,
    kidsAges: profile.kids.length ? profile.kids.map((k) => String(k.age)) : [''],
    preferences: profile.preferences,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const isProfileEmpty =
    !profile.neighborhood && profile.kids.length === 0 && profile.preferences.length === 0;

  function toggleInterest(interest: string) {
    setForm((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(interest)
        ? prev.preferences.filter((p) => p !== interest)
        : [...prev.preferences, interest],
    }));
  }

  function updateKidAge(i: number, age: string) {
    setForm((prev) => ({
      ...prev,
      kidsAges: prev.kidsAges.map((a, idx) => (idx === i ? age : a)),
    }));
  }

  function addKid() {
    setForm((prev) => ({ ...prev, kidsAges: [...prev.kidsAges, ''] }));
  }

  function removeKid(i: number) {
    setForm((prev) => ({ ...prev, kidsAges: prev.kidsAges.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveError('Your session expired — please sign in again.');
      setSaving(false);
      return;
    }

    const kids = form.kidsAges
      .filter((a) => a.trim() !== '')
      .map((a) => ({ age: Number(a) }));

    const { error } = await supabase
      .from('profiles')
      .update({
        neighborhood: form.neighborhood || null,
        kids,
        preferences: form.preferences,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setSaveError('Could not save changes. Please try again.');
      return;
    }

    setEditing(false);
    router.refresh();
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5EFE0] px-4 py-16 pt-28">
      <div className="max-w-[640px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E]">Family Dashboard</span>
            </div>
            <h1 className="font-['Cormorant_Garamond'] text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-tight text-[#1C3A4A]">
              Hi {profile.first_name || 'there'}<em className="italic text-[#0D5C6E]">.</em>
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-[13px] font-medium text-[#7A9AAA] hover:text-[#0D5C6E] transition-colors shrink-0"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        {isProfileEmpty && !editing && (
          <div className="bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-[16px] px-5 py-4 mb-6">
            <p className="text-[14px] text-[#0D5C6E] font-medium">
              Complete your family profile to get activity picks matched to your kids.
            </p>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-8 md:p-10 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#1C3A4A]">
              Your family profile
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[13px] font-semibold text-[#1A7A8A] hover:text-[#0D5C6E]"
              >
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            <div className="flex flex-col gap-4">
              <ReadRow label="Email" value={profile.email} />
              <ReadRow label="Neighborhood" value={profile.neighborhood || '—'} />
              <ReadRow
                label="Kids"
                value={profile.kids.length ? profile.kids.map((k) => `${k.age} yrs`).join(', ') : '—'}
              />
              <div>
                <p className="text-[13px] font-medium text-[#0D5C6E] mb-1.5">Interests</p>
                {profile.preferences.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.preferences.map((p) => (
                      <span
                        key={p}
                        className="px-3 py-1 rounded-full text-[12px] font-medium bg-[#C5D8E8]/40 text-[#0D5C6E]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] text-[#1C3A4A]">—</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#0D5C6E]">Neighborhood</label>
                <div className="relative">
                  <select
                    value={form.neighborhood}
                    onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                    className="w-full h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 pr-10 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white appearance-none transition-colors focus:outline-none focus:border-[#0D5C6E]"
                  >
                    <option value="">Select a neighborhood</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#0D5C6E] text-xs">▾</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#0D5C6E]">Kids' ages</label>
                {form.kidsAges.map((age, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={18}
                      value={age}
                      onChange={(e) => updateKidAge(i, e.target.value)}
                      placeholder={`Kid ${i + 1} age`}
                      className="h-12 flex-1 rounded-[12px] border-2 border-[#E8DFC8] px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white transition-colors focus:outline-none focus:border-[#0D5C6E]"
                    />
                    {form.kidsAges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKid(i)}
                        className="text-[#7A9AAA] hover:text-[#C0544A] text-sm px-2"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addKid}
                  className="self-start text-[13px] font-medium text-[#1A7A8A] hover:text-[#0D5C6E] mt-1"
                >
                  + Add another kid
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#0D5C6E]">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const active = form.preferences.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border-2 transition-colors ${
                          active
                            ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white'
                            : 'bg-white border-[#E8DFC8] text-[#3A5A6A] hover:border-[#C5D8E8]'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {saveError && (
                <p className="text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
                  {saveError}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-[48px] rounded-full border-2 border-[#E8DFC8] text-[#3A5A6A] font-semibold text-[14px] px-6 hover:border-[#C5D8E8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`h-[48px] flex-1 rounded-full bg-[#0D5C6E] text-white font-semibold text-[14px] transition-all duration-200 ${
                    saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A7A8A]'
                  }`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Placeholder for what's next */}
        <div className="bg-white/60 border border-[#E8DFC8] rounded-[20px] p-6 text-center">
          <p className="text-[14px] text-[#5A7A8A]">
            Saved activities and booking history are coming soon.{' '}
            <a href="/discover" className="text-[#1A7A8A] underline underline-offset-2">
              Browse activities →
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-[#0D5C6E] mb-0.5">{label}</p>
      <p className="text-[15px] text-[#1C3A4A]">{value}</p>
    </div>
  );
}
