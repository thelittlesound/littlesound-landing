'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ClaimListingInfo {
  activityId: string;
  title: string;
  business: string | null;
  website: string | null;
  exists: boolean;
  claimable: boolean;
  ownedByClaimant: boolean;
  ownedBySomeoneElse: boolean;
}

interface Claim {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string | null;
  role: string | null;
  message: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  claimant: { name: string; email: string | null; businessName: string | null; website: string | null; phone: string | null } | null;
  listings: ClaimListingInfo[];
  verification: { emailMatchesWebsite: boolean; profileWebsiteMatches: boolean };
}

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
};

// Review queue for listing claims (provider asks to own an existing listing).
// Approving transfers ownership — see app/api/admin/claims/[id]/route.ts.
export default function ClaimsPanel({
  refreshKey,
  onToast,
}: {
  refreshKey: number;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  // The parent passes a new onToast function on every render; keep the latest
  // one in a ref so it isn't a fetch dependency (that would refetch on every
  // toast, and loop if a fetch error triggers a toast).
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/claims?status=${filter === 'all' ? '' : filter}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      setClaims(data.claims || []);
    } catch {
      toastRef.current('Failed to load claims', false);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims, refreshKey]);

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id + action);
    try {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: notes[id] || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      onToast(action === 'approve' ? 'Claim approved — listings transferred' : 'Claim rejected', true);
      setSelectedId(null);
      fetchClaims();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Something went wrong', false);
    } finally {
      setActing(null);
    }
  }

  const selected = claims.find((c) => c.id === selectedId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-5">
      {/* List */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedId(null); }}
              className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors ${
                filter === f ? 'bg-[#0D5C6E] text-white' : 'bg-white text-[#0D5C6E] border border-[#C5D8E8] hover:bg-[#C5D8E8]/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-[#7A9AAA] text-sm py-8 text-center">Loading…</p>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DFC8] p-8 text-center">
            <p className="text-[#7A9AAA] text-sm">No {filter !== 'all' ? filter : ''} claims</p>
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                className={`w-full text-left bg-white rounded-2xl border transition-all px-5 py-4 ${
                  selectedId === c.id ? 'border-[#0D5C6E] shadow-md' : 'border-[#E8DFC8] hover:border-[#C5D8E8] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1C3A4A] text-sm truncate">{c.business_name ?? 'Listing claim'}</p>
                    <p className="text-[#7A9AAA] text-xs mt-0.5 truncate">
                      {c.claimant ? `${c.claimant.name} · ${c.claimant.email}` : 'Claimant profile missing'}
                    </p>
                    <p className="text-[#7A9AAA] text-xs mt-0.5">
                      {c.listings.length} listing{c.listings.length === 1 ? '' : 's'}
                      {c.verification.emailMatchesWebsite ? ' · ✓ email domain matches' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    <span className="text-[#B0C8D0] text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      {selected && (
        <div className="w-full md:w-96 shrink-0">
          <div className="bg-white rounded-2xl border border-[#E8DFC8] p-5 md:sticky md:top-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#0D5C6E] leading-tight">
                {selected.business_name ?? 'Listing claim'}
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[selected.status]}`}>
                {selected.status}
              </span>
            </div>

            {/* Who is asking */}
            <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-1.5">Claimant</p>
            {selected.claimant ? (
              <dl className="space-y-1.5 text-sm mb-4">
                <Row label="Name" value={selected.claimant.name} />
                <Row label="Role" value={selected.role} />
                <Row label="Email" value={selected.claimant.email} />
                <Row label="Business" value={selected.claimant.businessName} />
                <Row label="Website" value={selected.claimant.website} />
                <Row label="Phone" value={selected.claimant.phone} />
              </dl>
            ) : (
              <p className="text-sm text-red-600 mb-4">This account has no provider profile — it can't be approved.</p>
            )}

            {/* Verification hints */}
            <div className="bg-[#F5EFE0] rounded-xl p-3 mb-4 space-y-1">
              <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-1">Verification hints</p>
              <Hint ok={selected.verification.emailMatchesWebsite} yes="Email domain matches the listing's website" no="Email domain doesn't match the listing's website" />
              <Hint ok={selected.verification.profileWebsiteMatches} yes="Profile website matches the listing" no="Profile website doesn't match the listing" />
              <p className="text-[11px] text-[#7A9AAA] pt-1">Hints, not proof. When unsure, call the number on the business's own website.</p>
            </div>

            {selected.message && (
              <div className="bg-[#F5EFE0] rounded-xl p-3 mb-4">
                <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-1">Their note</p>
                <p className="text-sm text-[#1C3A4A] leading-relaxed">{selected.message}</p>
              </div>
            )}

            {/* Listings requested */}
            <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-1.5">Listings requested</p>
            <ul className="space-y-1.5 mb-4">
              {selected.listings.map((l) => (
                <li key={l.activityId} className="text-sm">
                  <span className="text-[#1C3A4A]">{l.title}</span>
                  {l.website && (
                    <a
                      href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-[#1A7A8A] underline break-all"
                    >
                      {l.website}
                    </a>
                  )}
                  {l.ownedBySomeoneElse && <span className="block text-xs text-red-600">Already owned by another provider</span>}
                  {l.ownedByClaimant && <span className="block text-xs text-emerald-700">Already transferred to this claimant</span>}
                  {!l.exists && <span className="block text-xs text-red-600">No longer exists</span>}
                </li>
              ))}
            </ul>

            {selected.status === 'pending' ? (
              <>
                <label className="text-xs text-[#7A9AAA] uppercase tracking-wider block mb-1.5">
                  Note to the provider (optional, included in the email)
                </label>
                <textarea
                  rows={3}
                  value={notes[selected.id] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                  placeholder="e.g. Could you reply from your business email so we can confirm?"
                  className="w-full border border-[#E8DFC8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0D5C6E] resize-none mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => act(selected.id, 'approve')}
                    disabled={!!acting || !selected.claimant}
                    className="flex-1 bg-[#0D5C6E] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-50"
                  >
                    {acting === selected.id + 'approve' ? '…' : 'Approve & transfer'}
                  </button>
                  <button
                    onClick={() => act(selected.id, 'reject')}
                    disabled={!!acting}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-full py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {acting === selected.id + 'reject' ? '…' : 'Reject'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#B0C8D0] text-center">
                {selected.status === 'approved' ? 'Approved' : 'Rejected'}
                {selected.reviewed_at ? ` ${new Date(selected.reviewed_at).toLocaleDateString()}` : ''}
                {selected.reviewed_by ? ` by ${selected.reviewed_by}` : ''}
                {selected.admin_notes ? ` · “${selected.admin_notes}”` : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Hint({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <p className={`text-sm ${ok ? 'text-emerald-700' : 'text-[#7A9AAA]'}`}>
      {ok ? '✓ ' : '– '}
      {ok ? yes : no}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-[#7A9AAA] w-20 shrink-0">{label}</dt>
      <dd className="text-[#1C3A4A] break-all">{value}</dd>
    </div>
  );
}
