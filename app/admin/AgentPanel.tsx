'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { seattleToday, type DateItem } from '@/lib/activity-dates';
import { describeItem } from '@/lib/date-agent-logic';

interface ListingStatus {
  activityId: string;
  title: string;
  business: string;
  website: string | null;
  lastCheckedAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  checkedUrls: string[];
  dateCount: number;
}
interface Draft {
  id: string;
  activityId: string;
  title: string;
  business: string;
  createdAt: string;
  items: DateItem[];
  warnings: string[];
  reason: string | null;
  sourceUrls: string[];
  current: DateItem[];
}
interface Suggestion {
  id: string;
  business: string | null;
  title: string;
  category: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  price_unit: string | null;
  description: string | null;
  website: string | null;
  neighborhood: string | null;
  items: DateItem[];
}
interface Overview {
  listings: ListingStatus[];
  drafts: Draft[];
  suggestions: Suggestion[];
  aiConfigured: boolean;
  scheduleConfigured: boolean;
  tablesMissing: boolean;
}
interface LogLine {
  title: string;
  status: string;
  message: string;
}

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800',
  review: 'bg-amber-100 text-amber-800',
  unchanged: 'bg-[#C5D8E8]/50 text-[#0D5C6E]',
  no_dates: 'bg-gray-100 text-gray-600',
  unreadable: 'bg-red-50 text-red-700',
  error: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-100 text-gray-600',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Published',
  review: 'Needs review',
  unchanged: 'Unchanged',
  no_dates: 'No dates on site',
  unreadable: 'Couldn’t read',
  error: 'Error',
  skipped: 'Skipped',
};
const CONCURRENCY = 2;

function Pill({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not checked</span>;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// The date agent's control room: run it, watch it, and handle the few things
// it couldn't settle on its own.
export default function AgentPanel({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [log, setLog] = useState<LogLine[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const stopRef = useRef(false);
  const today = seattleToday();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agent');
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      setData(await res.json());
    } catch {
      toastRef.current('Failed to load agent status', false);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(mode: 'unchecked' | 'unreadable' | 'all') {
    if (!data) return;
    const queue = data.listings
      .filter((l) =>
        mode === 'unchecked'
          ? !l.lastCheckedAt
          : mode === 'unreadable'
          ? l.lastStatus === 'unreadable' || l.lastStatus === 'error'
          : true
      )
      .sort((a, b) => (a.lastCheckedAt ?? '').localeCompare(b.lastCheckedAt ?? ''));
    if (!queue.length) { toastRef.current('Nothing to check', true); return; }

    stopRef.current = false;
    setRunning(true);
    setLog([]);
    setProgress({ done: 0, total: queue.length, current: '' });
    let done = 0;
    let next = 0;

    const worker = async () => {
      while (!stopRef.current && next < queue.length) {
        const l = queue[next++];
        setProgress((p) => ({ ...p, current: l.title }));
        let line: LogLine;
        try {
          const res = await fetch('/api/admin/agent/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: l.activityId }),
          });
          if (res.status === 401) { stopRef.current = true; toastRef.current('Signed out — sign in again to continue', false); return; }
          const r = await res.json().catch(() => ({}));
          line = res.ok
            ? { title: l.title, status: r.status, message: r.message }
            : { title: l.title, status: 'error', message: r.error || `HTTP ${res.status}` };
        } catch {
          line = { title: l.title, status: 'error', message: 'Network error' };
        }
        done += 1;
        setLog((prev) => [line, ...prev].slice(0, 200));
        setProgress((p) => ({ ...p, done }));
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    setProgress((p) => ({ ...p, current: '' }));
    toastRef.current(stopRef.current ? `Stopped after ${done}` : `Checked ${done} listing${done === 1 ? '' : 's'}`, true);
    load();
  }

  async function checkOne(l: ListingStatus) {
    setActing(l.activityId);
    try {
      const res = await fetch('/api/admin/agent/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: l.activityId, force: true }),
      });
      const r = await res.json().catch(() => ({}));
      toastRef.current(res.ok ? `${l.title}: ${STATUS_LABEL[r.status] ?? r.status}` : r.error || 'Failed', res.ok);
      load();
    } finally {
      setActing(null);
    }
  }

  async function act(kind: 'drafts' | 'suggestions', id: string, action: string, okMsg: string) {
    setActing(id + action);
    try {
      const res = await fetch(`/api/admin/agent/${kind}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Failed');
      toastRef.current(okMsg, true);
      load();
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : 'Failed', false);
    } finally {
      setActing(null);
    }
  }

  if (!data) {
    return <p className="text-[#7A9AAA] text-sm py-10 text-center">{loading ? 'Loading…' : 'Could not load the agent.'}</p>;
  }

  const L = data.listings;
  const checked = L.filter((l) => l.lastCheckedAt).length;
  const withDates = L.filter((l) => l.dateCount > 0).length;
  const unreadable = L.filter((l) => l.lastStatus === 'unreadable' || l.lastStatus === 'error');
  const card = 'bg-white rounded-2xl border border-[#E8DFC8] p-5';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Setup problems */}
      {data.tablesMissing && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          The agent&apos;s tables don&apos;t exist yet. Run <code>supabase/date-agent.sql</code> in Supabase.
        </div>
      )}
      {!data.aiConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          No ANTHROPIC_API_KEY in Vercel, so the agent can read sites but not extract dates.
        </div>
      )}
      {!data.scheduleConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
          The daily automatic check is off: add a <code>CRON_SECRET</code> environment variable in Vercel (any long random text), then redeploy. Running from this page works either way.
        </div>
      )}

      {/* Overview + run */}
      <div className={card}>
        <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#0D5C6E] mb-1">Date agent</h2>
        <p className="text-sm text-[#3A5A6A] mb-4">
          Visits each listing&apos;s website, reads its schedule pages, and publishes dates it can verify word-for-word
          on the page. Anything uncertain lands in your inbox below. Re-checks automatically every day.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            ['Checked', `${checked} / ${L.length}`],
            ['With dates', String(withDates)],
            ['Needs review', String(data.drafts.length)],
            ['Suggestions', String(data.suggestions.length)],
            ['Couldn’t read', String(unreadable.length)],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#F5EFE0] rounded-xl px-3 py-2">
              <p className="text-[11px] text-[#7A9AAA] uppercase tracking-wider">{k}</p>
              <p className="text-lg font-semibold text-[#1C3A4A]">{v}</p>
            </div>
          ))}
        </div>

        {running ? (
          <div>
            <div className="flex items-center justify-between text-sm text-[#3A5A6A] mb-1.5">
              <span>
                Checking {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}
                {progress.current ? ` · ${progress.current}` : ''}
              </span>
              <button onClick={() => { stopRef.current = true; }} className="text-red-600 font-semibold">Stop</button>
            </div>
            <div className="h-2 bg-[#F5EFE0] rounded-full overflow-hidden">
              <div className="h-full bg-[#0D5C6E] transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
            </div>
            <p className="text-xs text-[#7A9AAA] mt-1.5">Keep this tab open while it runs (about 20–40 seconds per site that changed).</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => run('unchecked')}
              disabled={!data.aiConfigured || data.tablesMissing || checked === L.length}
              className="bg-[#0D5C6E] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#1A7A8A] disabled:opacity-50"
            >
              Check unchecked listings ({L.length - checked})
            </button>
            <button
              onClick={() => run('all')}
              disabled={!data.aiConfigured || data.tablesMissing}
              className="border border-[#C5D8E8] text-[#0D5C6E] rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#C5D8E8]/20 disabled:opacity-50"
            >
              Re-check all {L.length}
            </button>
            {unreadable.length > 0 && (
              <button
                onClick={() => run('unreadable')}
                disabled={!data.aiConfigured || data.tablesMissing}
                className="border border-[#C5D8E8] text-[#0D5C6E] rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#C5D8E8]/20 disabled:opacity-50"
              >
                Retry couldn&apos;t-read ({unreadable.length})
              </button>
            )}
          </div>
        )}

        {log.length > 0 && (
          <ul className="mt-4 max-h-64 overflow-y-auto divide-y divide-[#E8DFC8] border border-[#E8DFC8] rounded-xl">
            {log.map((l, i) => (
              <li key={i} className="flex items-start gap-2 px-3 py-2 text-sm">
                <Pill status={l.status} />
                <span className="min-w-0">
                  <span className="font-medium text-[#1C3A4A]">{l.title}</span>
                  <span className="text-[#7A9AAA]"> — {l.message}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Review inbox */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-[#1C3A4A] mb-3">Needs your review ({data.drafts.length})</h3>
        {data.drafts.length === 0 ? (
          <p className="text-sm text-[#7A9AAA]">Nothing waiting. Verified dates were published automatically.</p>
        ) : (
          <div className="space-y-3">
            {data.drafts.map((d) => (
              <div key={d.id} className="border border-[#E8DFC8] rounded-xl p-4">
                <p className="font-semibold text-[#1C3A4A]">{d.title}</p>
                <p className="text-xs text-[#7A9AAA] mb-2">{d.business}</p>
                {d.reason && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-2">{d.reason}</p>}
                {d.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-amber-900 mb-2">
                    {d.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-[11px] text-[#7A9AAA] uppercase tracking-wider mb-1">Agent found</p>
                    {d.items.length ? (
                      <ul className="space-y-0.5">{d.items.map((i, k) => <li key={k} className="text-[#1C3A4A]">{describeItem(i, today)}</li>)}</ul>
                    ) : <p className="text-[#7A9AAA]">No dates</p>}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#7A9AAA] uppercase tracking-wider mb-1">Live now</p>
                    {d.current.length ? (
                      <ul className="space-y-0.5">{d.current.map((i, k) => <li key={k} className="text-[#3A5A6A]">{describeItem(i, today)}</li>)}</ul>
                    ) : <p className="text-[#7A9AAA]">Nothing</p>}
                  </div>
                </div>
                <p className="text-xs text-[#7A9AAA] mb-3">
                  Read from:{' '}
                  {d.sourceUrls.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-[#1A7A8A] underline break-all">
                      {i ? ', ' : ''}{u.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => act('drafts', d.id, 'approve', `Published dates for ${d.title}`)}
                    disabled={!!acting || d.items.length === 0}
                    className="bg-[#0D5C6E] text-white rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-[#1A7A8A] disabled:opacity-50"
                  >
                    {acting === d.id + 'approve' ? '…' : 'Approve & publish'}
                  </button>
                  <button
                    onClick={() => act('drafts', d.id, 'dismiss', 'Dismissed')}
                    disabled={!!acting}
                    className="border border-[#E8DFC8] text-[#3A5A6A] rounded-full px-4 py-1.5 text-sm hover:border-[#C5D8E8] disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <span className="text-xs text-[#B0C8D0]">To fix a date first, edit this listing in the Dates tab instead.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-[#1C3A4A] mb-1">Suggested new listings ({data.suggestions.length})</h3>
        <p className="text-xs text-[#7A9AAA] mb-3">Kids&apos; programs the agent found on provider sites that aren&apos;t on Little Sound yet. Adding one puts it on Discover (claimable by the provider later).</p>
        {data.suggestions.length === 0 ? (
          <p className="text-sm text-[#7A9AAA]">None right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.suggestions.map((s) => (
              <div key={s.id} className="border border-[#E8DFC8] rounded-xl p-4">
                <p className="font-semibold text-[#1C3A4A]">{s.title}</p>
                <p className="text-xs text-[#7A9AAA] mb-2">
                  {[s.business, s.category, s.neighborhood].filter(Boolean).join(' · ')}
                  {s.age_min != null ? ` · Ages ${s.age_min}–${s.age_max ?? s.age_min}` : ''}
                  {s.price != null ? ` · $${s.price}${s.price_unit ? `/${s.price_unit}` : ''}` : ''}
                </p>
                {s.description && <p className="text-sm text-[#3A5A6A] mb-2">{s.description}</p>}
                {s.items.length > 0 && (
                  <ul className="text-sm text-[#1C3A4A] mb-2 space-y-0.5">
                    {s.items.slice(0, 5).map((i, k) => <li key={k}>{describeItem(i, today)}</li>)}
                    {s.items.length > 5 && <li className="text-[#7A9AAA]">+{s.items.length - 5} more</li>}
                  </ul>
                )}
                {s.website && (
                  <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1A7A8A] underline break-all block mb-3">
                    {s.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => act('suggestions', s.id, 'add', `Added "${s.title}" to Discover`)}
                    disabled={!!acting}
                    className="bg-[#0D5C6E] text-white rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-[#1A7A8A] disabled:opacity-50"
                  >
                    {acting === s.id + 'add' ? '…' : 'Add listing'}
                  </button>
                  <button
                    onClick={() => act('suggestions', s.id, 'dismiss', 'Dismissed')}
                    disabled={!!acting}
                    className="border border-[#E8DFC8] text-[#3A5A6A] rounded-full px-4 py-1.5 text-sm hover:border-[#C5D8E8] disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Couldn't read */}
      {unreadable.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-semibold text-[#1C3A4A] mb-1">Couldn&apos;t read ({unreadable.length})</h3>
          <p className="text-xs text-[#7A9AAA] mb-3">These are the only listings that need hands-on help: paste their schedule in the Dates tab.</p>
          <ul className="divide-y divide-[#E8DFC8]">
            {unreadable.map((l) => (
              <li key={l.activityId} className="py-2 flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-[#1C3A4A]">{l.title}</span>
                  <span className="text-[#7A9AAA]"> · {l.business} — {l.lastMessage}</span>
                </span>
                <button onClick={() => checkOne(l)} disabled={!!acting} className="text-xs text-[#1A7A8A] shrink-0 hover:underline disabled:opacity-50">
                  {acting === l.activityId ? 'Checking…' : 'Try again'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All listings */}
      <div className={card}>
        <button onClick={() => setShowAll((v) => !v)} className="text-sm font-semibold text-[#0D5C6E]">
          {showAll ? '▾' : '▸'} Every listing ({L.length})
        </button>
        {showAll && (
          <ul className="mt-3 divide-y divide-[#E8DFC8]">
            {[...L].sort((a, b) => a.business.localeCompare(b.business)).map((l) => (
              <li key={l.activityId} className="py-2 flex items-center gap-3 text-sm">
                <Pill status={l.lastStatus} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-[#1C3A4A]">{l.title}</span>
                  <span className="text-[#7A9AAA]"> · {l.business}{l.dateCount ? ` · ${l.dateCount} dates` : ''}</span>
                </span>
                <span className="text-xs text-[#B0C8D0] hidden sm:inline">
                  {l.lastCheckedAt ? new Date(l.lastCheckedAt).toLocaleDateString() : ''}
                </span>
                <button onClick={() => checkOne(l)} disabled={!!acting || running} className="text-xs text-[#1A7A8A] hover:underline disabled:opacity-50">
                  {acting === l.activityId ? '…' : 'Check now'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
