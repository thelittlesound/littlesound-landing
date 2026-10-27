'use client';

import { useMemo, useState } from 'react';
import type { ClaimListing } from '@/lib/claimable'; // type-only: erased, no server code reaches the client
import { CLAIM_ROLES } from '@/lib/claim-roles';

interface Props {
  listings: ClaimListing[];
  pendingIds: string[];
  isProviderAccount: boolean;
  email: string;
  initialId: string | null;
  notice: 'not_found' | 'yours' | 'taken' | null;
  noticeTitle?: string | null;
}

export default function ClaimClient({
  listings,
  pendingIds,
  isProviderAccount,
  email,
  initialId,
  notice,
  noticeTitle,
}: Props) {
  const pending = useMemo(() => new Set(pendingIds), [pendingIds]);

  // Group listings by business name for the search list + sibling checkboxes.
  const byBusiness = useMemo(() => {
    const m = new Map<string, ClaimListing[]>();
    for (const l of listings) {
      const arr = m.get(l.business) ?? [];
      arr.push(l);
      m.set(l.business, arr);
    }
    return m;
  }, [listings]);

  const initialBusiness = initialId ? listings.find((l) => l.activityId === initialId)?.business ?? null : null;

  const [business, setBusiness] = useState<string | null>(initialBusiness);
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (!initialBusiness) return new Set();
    // Start with every unpending listing from this business ticked.
    return new Set(
      (byBusiness.get(initialBusiness) ?? []).map((l) => l.activityId).filter((id) => !pending.has(id))
    );
  });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = Array.from(byBusiness.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (!q) return entries;
    return entries.filter(
      ([name, items]) =>
        name.toLowerCase().includes(q) || items.some((l) => l.title.toLowerCase().includes(q))
    );
  }, [byBusiness, query]);

  function pickBusiness(name: string) {
    setBusiness(name);
    setChecked(
      new Set((byBusiness.get(name) ?? []).map((l) => l.activityId).filter((id) => !pending.has(id)))
    );
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError('');
    if (checked.size === 0) return setError('Pick at least one listing.');
    if (!role) return setError('Tell us your role at the business.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/providers/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityIds: Array.from(checked), role, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/providers/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0D5C6E]/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-[#0D5C6E] text-2xl">✓</span>
          </div>
          <h1 className="font-['Cormorant_Garamond'] text-[30px] font-light text-[#1C3A4A] mb-3">Claim submitted</h1>
          <p className="text-[15px] text-[#3A5A6A] leading-relaxed mb-8">
            We review every claim by hand to make sure listings stay with the people who run them. We&apos;ll email
            you{email ? <> at <strong className="text-[#1C3A4A]">{email}</strong></> : null} as soon as it&apos;s approved —
            then your listing{checked.size === 1 ? '' : 's'} will show up on your dashboard, ready to edit.
          </p>
          {/* Plain <a>: full navigation so the dashboard renders fresh. */}
          <a
            href="/providers/dashboard"
            className="inline-flex items-center justify-center h-12 rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-8 hover:bg-[#1A7A8A] transition-colors"
          >
            Go to your dashboard →
          </a>
        </div>
      </Shell>
    );
  }

  if (!isProviderAccount) {
    return (
      <Shell>
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-8 md:p-10">
          <h1 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1C3A4A] mb-3">
            This is a family account
          </h1>
          <p className="text-[15px] text-[#3A5A6A] leading-relaxed">
            Claiming a listing needs a provider account. Sign out, then create a provider account at{' '}
            <a href="/providers/signup" className="text-[#1A7A8A] underline underline-offset-2">
              thelittlesound.com/providers/signup
            </a>{' '}
            — it takes about two minutes.
          </p>
        </div>
      </Shell>
    );
  }

  const selected = business ? byBusiness.get(business) ?? [] : [];

  return (
    <Shell>
      {notice && <Notice kind={notice} title={noticeTitle ?? null} />}

      {!business ? (
        // ── Step 1: find your business ──────────────────────────────────────
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-6 md:p-10">
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(26px,4vw,36px)] font-light text-[#1C3A4A] mb-2">
            Find your listing
          </h1>
          <p className="text-[15px] text-[#3A5A6A] leading-relaxed mb-6">
            We&apos;ve already added many Seattle programs to Little Sound. Find yours, claim it, and you can
            keep the details accurate yourself.
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by business or program name"
            className="w-full h-12 rounded-full border-2 border-[#E8DFC8] px-5 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white focus:outline-none focus:border-[#0D5C6E] mb-5"
          />
          {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[15px] text-[#3A5A6A] mb-4">No unclaimed listings match that.</p>
              <a
                href="/providers/listings/new"
                className="inline-flex items-center justify-center h-11 rounded-full bg-[#0D5C6E] text-white font-semibold text-[14px] px-6 hover:bg-[#1A7A8A] transition-colors"
              >
                Create a new listing instead →
              </a>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map(([name, items]) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => pickBusiness(name)}
                    className="w-full text-left border border-[#E8DFC8] rounded-[16px] px-4 py-3.5 hover:border-[#1A7A8A] hover:bg-[#F5EFE0]/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-[#1C3A4A] truncate">{name}</span>
                      <span className="block text-[12px] text-[#7A9AAA] truncate">
                        {items.length === 1 ? items[0].title : `${items.length} listings`}
                        {items[0].neighborhood ? ` · ${items[0].neighborhood}` : ''}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold text-[#1A7A8A] shrink-0">This is mine →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        // ── Step 2: confirm listings + tell us who you are ──────────────────
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-6 md:p-10">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="font-['Cormorant_Garamond'] text-[clamp(26px,4vw,36px)] font-light text-[#1C3A4A] leading-tight">
              Claim {business}
            </h1>
            <button
              type="button"
              onClick={() => { setBusiness(null); setChecked(new Set()); setError(''); }}
              className="text-[13px] font-medium text-[#1A7A8A] hover:text-[#0D5C6E] shrink-0 pt-2"
            >
              Change
            </button>
          </div>
          <p className="text-[14px] text-[#3A5A6A] mb-5">Choose which listings are yours.</p>

          <div className="flex flex-col gap-2 mb-6">
            {selected.map((l) => {
              const isPending = pending.has(l.activityId);
              return (
                <label
                  key={l.activityId}
                  className={`flex items-start gap-3 border rounded-[14px] px-4 py-3 ${
                    isPending ? 'border-[#E8DFC8] opacity-60' : 'border-[#E8DFC8] cursor-pointer hover:border-[#C5D8E8]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#0D5C6E] shrink-0"
                    checked={checked.has(l.activityId)}
                    disabled={isPending}
                    onChange={() => toggle(l.activityId)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#1C3A4A]">{l.title}</span>
                    <span className="block text-[12px] text-[#7A9AAA]">
                      {[l.category, l.neighborhood].filter(Boolean).join(' · ')}
                      {l.ageMin != null ? ` · Ages ${l.ageMin}–${l.ageMax}` : ''}
                      {l.price != null ? ` · $${l.price}${l.priceUnit ? `/${l.priceUnit}` : ''}` : ''}
                      {isPending ? ' · Claim already in review' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[13px] font-medium text-[#0D5C6E]">Your role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 pr-10 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white appearance-none focus:outline-none focus:border-[#0D5C6E]"
              >
                <option value="">Select your role</option>
                {CLAIM_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#0D5C6E] text-xs">▾</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-5">
            <label className="text-[13px] font-medium text-[#0D5C6E]">Anything that helps us verify you (optional)</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I'm the program director — you can reach me at the front desk number on our website."
              className="rounded-[12px] border-2 border-[#E8DFC8] px-4 py-3 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white resize-y focus:outline-none focus:border-[#0D5C6E]"
            />
          </div>

          <div className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[14px] px-5 py-4 mb-6">
            <p className="text-[13px] text-[#3A5A6A] leading-relaxed">
              We check every claim by hand so listings stay with the people who run them. Signing up with an
              email at your business&apos;s own domain makes it quickest.
            </p>
          </div>

          {error && (
            <p className="mb-4 text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || checked.size === 0}
            className={`w-full h-12 rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] transition-all duration-200 ${
              submitting || checked.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A7A8A]'
            }`}
          >
            {submitting
              ? 'Submitting…'
              : checked.size === 0
              ? 'Select a listing to claim'
              : `Claim ${checked.size === 1 ? 'this listing' : `${checked.size} listings`} →`}
          </button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F5EFE0] px-4 py-16 pt-28">
      <div className="max-w-[640px] mx-auto">
        <div className="mb-6">
          <a href="/providers/dashboard" className="text-[13px] text-[#1A7A8A] font-medium hover:underline">
            ← Back to dashboard
          </a>
        </div>
        {children}
      </div>
    </main>
  );
}

function Notice({ kind, title }: { kind: 'not_found' | 'yours' | 'taken'; title: string | null }) {
  const text =
    kind === 'yours'
      ? `${title ? `“${title}”` : 'That listing'} is already yours — you'll find it on your dashboard.`
      : kind === 'taken'
      ? `${title ? `“${title}”` : 'That listing'} has already been claimed by another provider. If you think that's a mistake, email hello@thelittlesound.com and we'll sort it out.`
      : "We couldn't find that listing — it may have been removed. Search for yours below.";
  return (
    <div className="bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-[16px] px-5 py-4 mb-5">
      <p className="text-[14px] text-[#0D5C6E] font-medium leading-relaxed">{text}</p>
    </div>
  );
}
