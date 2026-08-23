'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export interface ProviderProfile {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  category: string;
  website: string;
  phone: string;
}

export interface Listing {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  title: string;
  category: string | null;
  subcategory: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  price_unit: string | null;
  neighborhood: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reapproval_needed: boolean | null;
  edited_at: string | null;
}

const STATUS_COPY = {
  pending: { label: 'In review', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Live on Discover', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Not approved', color: 'bg-red-100 text-red-700' },
};

export default function ProviderDashboardClient({
  profile,
  listings,
}: {
  profile: ProviderProfile;
  listings: Listing[];
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5EFE0] px-4 py-16 pt-28">
      <div className="max-w-[720px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E]">Provider Dashboard</span>
            </div>
            <h1 className="font-['Cormorant_Garamond'] text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-tight text-[#1C3A4A]">
              {profile.business_name || 'Your listings'}
            </h1>
            <p className="text-[#5A7A8A] text-[14px] mt-1">
              {profile.first_name} {profile.last_name} · {profile.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-[13px] font-medium text-[#7A9AAA] hover:text-[#0D5C6E] transition-colors shrink-0"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        {/* Add listing CTA */}
        <Link
          href="/providers/listings/new"
          className="inline-flex items-center justify-center h-12 rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-7 hover:bg-[#1A7A8A] hover:-translate-y-0.5 transition-all duration-200 mb-8"
        >
          + List another activity
        </Link>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] p-10 text-center">
            <p className="text-[#3A5A6A] text-[15px] leading-relaxed mb-6">
              You haven&apos;t submitted a listing yet.
            </p>
            <Link
              href="/providers/listings/new"
              className="inline-flex items-center justify-center h-12 rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-7 hover:bg-[#1A7A8A] transition-colors"
            >
              Create your first listing →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((listing) => {
              const status = STATUS_COPY[listing.status];
              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-[20px] shadow-[0_2px_16px_rgba(10,74,90,0.06)] p-6"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-['Cormorant_Garamond'] text-[22px] font-light text-[#1C3A4A] leading-tight">
                      {listing.title}
                    </h2>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {listing.status === 'approved' && listing.reapproval_needed && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800">
                          Changes pending review
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#7A9AAA] mb-3">
                    {[listing.category, listing.subcategory].filter(Boolean).join(' › ')}
                    {listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
                    {listing.age_min != null ? ` · Ages ${listing.age_min}–${listing.age_max}` : ''}
                  </p>
                  {listing.price != null && (
                    <p className="text-[14px] text-[#3A5A6A] mb-2">
                      ${listing.price} / {listing.price_unit}
                    </p>
                  )}
                  {listing.status === 'rejected' && listing.admin_notes && (
                    <div className="bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3 mt-3">
                      <p className="text-[12px] font-semibold text-[#C0544A] uppercase tracking-wide mb-1">
                        Note from Little Sound
                      </p>
                      <p className="text-[13px] text-[#8A3A32]">{listing.admin_notes}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E8DFC8]">
                    <p className="text-[12px] text-[#B0C8D0]">
                      Submitted {new Date(listing.created_at).toLocaleDateString()}
                      {listing.edited_at ? ` · Edited ${new Date(listing.edited_at).toLocaleDateString()}` : ''}
                      {listing.reviewed_at ? ` · Reviewed ${new Date(listing.reviewed_at).toLocaleDateString()}` : ''}
                    </p>
                    <Link
                      href={`/providers/listings/${listing.id}/edit`}
                      className="text-[13px] font-semibold text-[#1A7A8A] hover:text-[#0D5C6E] shrink-0"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[13px] text-[#7A9AAA] mt-8">
          Use “Edit” on any listing to update its details. Need something else — a change to your
          account, or to remove a listing? Email{' '}
          <a href="mailto:hello@thelittlesound.com" className="text-[#1A7A8A] underline underline-offset-2">
            hello@thelittlesound.com
          </a>.
        </p>
      </div>
    </main>
  );
}
