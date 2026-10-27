import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveListings } from '@/lib/claimable';
import ProviderDashboardClient, { type Listing, type ProviderProfile, type ClaimRequest } from './ProviderDashboardClient';

// Always render fresh — this page shows live listing status, so it should
// never serve a cached snapshot from before the most recent change.
export const dynamic = 'force-dynamic';

export default async function ProviderDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/providers/login');
  }

  const { data: profileRow } = await supabaseAdmin
    .from('provider_profiles')
    .select('first_name, last_name, email, business_name, category, website, phone')
    .eq('id', user.id)
    .maybeSingle();

  const { data: listingsRow } = await supabaseAdmin
    .from('submissions')
    .select('id, created_at, status, title, category, subcategory, age_min, age_max, price, price_unit, neighborhood, admin_notes, reviewed_at, reapproval_needed, edited_at, seed_id')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: false });

  // Claim requests still in review, or turned down. (Approved claims need no
  // row of their own — those listings now appear in the list above.)
  const { data: claimRows } = await supabaseAdmin
    .from('listing_claims')
    .select('id, created_at, status, activity_ids, business_name, admin_notes')
    .eq('provider_id', user.id)
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false });

  const claimList = (claimRows ?? []) as (Omit<ClaimRequest, 'titles'> & { activity_ids: string[] })[];
  const resolvedClaims = await resolveListings(Array.from(new Set(claimList.flatMap((c) => c.activity_ids))));
  const claims: ClaimRequest[] = claimList.map((c) => ({
    id: c.id,
    created_at: c.created_at,
    status: c.status,
    business_name: c.business_name,
    admin_notes: c.admin_notes,
    titles: c.activity_ids.map((id) => resolvedClaims.get(id)?.title ?? 'Listing'),
  }));

  const profile: ProviderProfile = {
    first_name: profileRow?.first_name ?? '',
    last_name: profileRow?.last_name ?? '',
    email: profileRow?.email ?? user.email ?? '',
    business_name: profileRow?.business_name ?? '',
    category: profileRow?.category ?? '',
    website: profileRow?.website ?? '',
    phone: profileRow?.phone ?? '',
  };

  return <ProviderDashboardClient profile={profile} listings={(listingsRow as Listing[]) ?? []} claims={claims} />;
}
