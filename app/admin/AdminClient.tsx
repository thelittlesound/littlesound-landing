'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import ClaimsPanel from './ClaimsPanel';
import DatesPanel from './DatesPanel';
import AgentPanel from './AgentPanel';

interface Submission {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  contact_name: string;
  contact_email: string;
  phone: string | null;
  title: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  price_unit: string | null;
  neighborhood: string | null;
  website: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reapproval_needed: boolean | null;
  edited_at: string | null;
}

const STATUS_COLORS = {
  pending: 'bg-warning-light text-gold-deep',
  approved: 'bg-success-light text-success-dark',
  rejected: 'bg-error-light text-error-dark',
};

export default function AdminClient({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [view, setView] = useState<'listings' | 'claims' | 'dates' | 'agent'>('listings');
  const [claimsRefresh, setClaimsRefresh] = useState(0);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?status=${filter === 'all' ? '' : filter}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      showToast('Failed to load submissions', false);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), ok ? 3500 : 9000); // errors stay up long enough to read
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes[id] || null }),
      });
      if (!res.ok) {
        const r = await res.json().catch(() => ({}));
        throw new Error(res.status === 401 ? 'Signed out. Sign in again.' : r.error || `HTTP ${res.status}`);
      }
      showToast(`Listing ${status}!`, true);
      fetchSubmissions();
      setSelectedId(null);
    } catch (e) {
      showToast(e instanceof Error && e.message ? e.message : 'Something went wrong', false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const selected = submissions.find(s => s.id === selectedId);

  return (
    // pt-16 clears the site's fixed top nav (h-16, rendered by app/layout.tsx),
    // which otherwise covers the admin header.
    <div className="min-h-screen bg-cream-500 font-body pt-16">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.ok ? 'bg-success text-white' : 'bg-error-dark text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-cream-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light text-teal-800">
            Little Sound Admin
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            Listings, claims &amp; dates{adminEmail ? ` · ${adminEmail}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(view === 'listings' || view === 'claims') && (
          <button
            onClick={() => (view === 'listings' ? fetchSubmissions() : setClaimsRefresh((n: number) => n + 1))}
            className="text-teal-800 text-sm border border-blue-grey-300 rounded-full px-4 py-1.5 hover:bg-blue-grey-300/20 transition-colors"
          >
            ↻ Refresh
          </button>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-text-muted text-sm hover:text-teal-800 transition-colors"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      {/* View switch: listing submissions · ownership claims · activity dates */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex gap-6 border-b border-cream-700">
        {([['listings', 'Listings'], ['claims', 'Claims'], ['dates', 'Dates'], ['agent', 'Agent']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${
              view === key ? 'border-teal-800 text-teal-800' : 'border-transparent text-text-muted hover:text-teal-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'agent' ? (
        <AgentPanel onToast={showToast} />
      ) : view === 'dates' ? (
        <DatesPanel onToast={showToast} />
      ) : view === 'claims' ? (
        <ClaimsPanel refreshKey={claimsRefresh} onToast={showToast} />
      ) : (
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-5">

        {/* Left: list */}
        <div className="flex-1 min-w-0">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedId(null); }}
                className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors ${
                  filter === f
                    ? 'bg-teal-800 text-white'
                    : 'bg-white text-teal-800 border border-blue-grey-300 hover:bg-blue-grey-300/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-text-muted text-sm py-8 text-center">Loading…</p>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-700 p-8 text-center">
              <p className="text-text-muted text-sm">No {filter !== 'all' ? filter : ''} submissions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                  className={`w-full text-left bg-white rounded-2xl border transition-all px-5 py-4 ${
                    selectedId === s.id
                      ? 'border-teal-800 shadow-md'
                      : 'border-cream-700 hover:border-blue-grey-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-dark text-sm truncate">{s.title}</p>
                      <p className="text-text-muted text-xs mt-0.5 truncate">
                        {s.contact_name} · {s.contact_email}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {[s.category, s.subcategory].filter(Boolean).join(' › ')}
                        {s.neighborhood ? ` · ${s.neighborhood}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                        {s.status}
                      </span>
                      {s.reapproval_needed && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-warning-light text-gold-deep">
                          ✎ edited
                        </span>
                      )}
                      <span className="text-blue-grey-300 text-xs">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-cream-700 p-5 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-xl font-light text-teal-800 leading-tight">
                  {selected.title}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              {selected.reapproval_needed && (
                <div className="bg-warning-light border border-warning/40 rounded-xl px-4 py-3 mb-4">
                  <p className="text-[13px] text-gold-deep font-medium leading-relaxed">
                    Provider edited this live listing{selected.edited_at ? ` on ${new Date(selected.edited_at).toLocaleDateString()}` : ''}. It stays on Discover — approve the changes to clear this flag.
                  </p>
                </div>
              )}

              <dl className="space-y-2 text-sm mb-4">
                <Row label="Contact" value={selected.contact_name} />
                <Row label="Email" value={selected.contact_email} />
                {selected.phone && <Row label="Phone" value={selected.phone} />}
                <Row label="Category" value={[selected.category, selected.subcategory].filter(Boolean).join(' › ')} />
                {selected.age_min != null && (
                  <Row label="Ages" value={`${selected.age_min}–${selected.age_max} yrs`} />
                )}
                {selected.price != null && (
                  <Row label="Price" value={`$${selected.price} / ${selected.price_unit}`} />
                )}
                {selected.neighborhood && <Row label="Location" value={selected.neighborhood} />}
                {selected.website && (
                  <div className="flex gap-2">
                    <dt className="text-text-muted w-20 shrink-0">Website</dt>
                    <dd>
                      <a
                        href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 underline break-all"
                      >
                        {selected.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {selected.description && (
                <div className="bg-cream-500 rounded-xl p-3 mb-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-text-dark leading-relaxed">{selected.description}</p>
                </div>
              )}

              {/* Admin notes */}
              <div className="mb-4">
                <label className="text-xs text-text-muted uppercase tracking-wider block mb-1.5">
                  Admin notes
                </label>
                <textarea
                  rows={3}
                  value={notes[selected.id] ?? selected.admin_notes ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [selected.id]: e.target.value }))}
                  placeholder="Internal notes…"
                  className="w-full border border-cream-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-800 resize-none"
                />
              </div>

              {/* Actions */}
              {selected.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, 'approved')}
                    disabled={!!actionLoading}
                    className="flex-1 bg-teal-800 text-white rounded-full py-2.5 text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selected.id + 'approved' ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'rejected')}
                    disabled={!!actionLoading}
                    className="flex-1 bg-error-light text-error-dark border border-error/30 rounded-full py-2.5 text-sm font-semibold hover:bg-error-light transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selected.id + 'rejected' ? '…' : 'Reject'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {selected.status === 'approved' && (
                    <>
                      {selected.reapproval_needed && (
                        <button
                          onClick={() => updateStatus(selected.id, 'approved')}
                          disabled={!!actionLoading}
                          className="flex-1 bg-teal-800 text-white rounded-full py-2.5 text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === selected.id + 'approved' ? '…' : 'Approve changes'}
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(selected.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-error-light text-error-dark border border-error/30 rounded-full py-2.5 text-sm font-semibold hover:bg-error-light transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selected.status === 'rejected' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'approved')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-teal-800 text-white rounded-full py-2.5 text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                </div>
              )}

              {selected.reviewed_at && (
                <p className="text-xs text-blue-grey-300 mt-3 text-center">
                  Reviewed {new Date(selected.reviewed_at).toLocaleDateString()}
                  {selected.reviewed_by ? ` by ${selected.reviewed_by}` : ''}
                </p>
              )}

            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-text-muted w-20 shrink-0">{label}</dt>
      <dd className="text-text-dark break-all">{value}</dd>
    </div>
  );
}
