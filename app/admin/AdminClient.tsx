'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

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
}

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
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
    setTimeout(() => setToast(null), 3500);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes[id] || null }),
      });
      if (!res.ok) throw new Error();
      showToast(`Listing ${status}!`, true);
      fetchSubmissions();
      setSelectedId(null);
    } catch {
      showToast('Something went wrong', false);
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
    <div className="min-h-screen bg-[#F5EFE0] font-['DM_Sans']">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#E8DFC8] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#0D5C6E]">
            Little Sound Admin
          </h1>
          <p className="text-[#7A9AAA] text-xs mt-0.5">
            Provider listing submissions{adminEmail ? ` · ${adminEmail}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSubmissions}
            className="text-[#0D5C6E] text-sm border border-[#C5D8E8] rounded-full px-4 py-1.5 hover:bg-[#C5D8E8]/20 transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-[#7A9AAA] text-sm hover:text-[#0D5C6E] transition-colors"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

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
                    ? 'bg-[#0D5C6E] text-white'
                    : 'bg-white text-[#0D5C6E] border border-[#C5D8E8] hover:bg-[#C5D8E8]/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-[#7A9AAA] text-sm py-8 text-center">Loading…</p>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DFC8] p-8 text-center">
              <p className="text-[#7A9AAA] text-sm">No {filter !== 'all' ? filter : ''} submissions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                  className={`w-full text-left bg-white rounded-2xl border transition-all px-5 py-4 ${
                    selectedId === s.id
                      ? 'border-[#0D5C6E] shadow-md'
                      : 'border-[#E8DFC8] hover:border-[#C5D8E8] hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1C3A4A] text-sm truncate">{s.title}</p>
                      <p className="text-[#7A9AAA] text-xs mt-0.5 truncate">
                        {s.contact_name} · {s.contact_email}
                      </p>
                      <p className="text-[#7A9AAA] text-xs mt-0.5">
                        {[s.category, s.subcategory].filter(Boolean).join(' › ')}
                        {s.neighborhood ? ` · ${s.neighborhood}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                        {s.status}
                      </span>
                      <span className="text-[#B0C8D0] text-xs">
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
            <div className="bg-white rounded-2xl border border-[#E8DFC8] p-5 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#0D5C6E] leading-tight">
                  {selected.title}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

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
                    <dt className="text-[#7A9AAA] w-20 shrink-0">Website</dt>
                    <dd>
                      <a
                        href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1A7A8A] underline break-all"
                      >
                        {selected.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {selected.description && (
                <div className="bg-[#F5EFE0] rounded-xl p-3 mb-4">
                  <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-[#1C3A4A] leading-relaxed">{selected.description}</p>
                </div>
              )}

              {/* Admin notes */}
              <div className="mb-4">
                <label className="text-xs text-[#7A9AAA] uppercase tracking-wider block mb-1.5">
                  Admin notes
                </label>
                <textarea
                  rows={3}
                  value={notes[selected.id] ?? selected.admin_notes ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [selected.id]: e.target.value }))}
                  placeholder="Internal notes…"
                  className="w-full border border-[#E8DFC8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0D5C6E] resize-none"
                />
              </div>

              {/* Actions */}
              {selected.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, 'approved')}
                    disabled={!!actionLoading}
                    className="flex-1 bg-[#0D5C6E] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selected.id + 'approved' ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'rejected')}
                    disabled={!!actionLoading}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-full py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selected.id + 'rejected' ? '…' : 'Reject'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {selected.status === 'approved' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'rejected')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-full py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {selected.status === 'rejected' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'approved')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-[#0D5C6E] text-white rounded-full py-2.5 text-sm font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                </div>
              )}

              {selected.reviewed_at && (
                <p className="text-xs text-[#B0C8D0] mt-3 text-center">
                  Reviewed {new Date(selected.reviewed_at).toLocaleDateString()}
                  {selected.reviewed_by ? ` by ${selected.reviewed_by}` : ''}
                </p>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
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
