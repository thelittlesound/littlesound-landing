import { supabaseAdmin } from '@/lib/supabase';
import { getClaimableListings, type ClaimListing } from '@/lib/claimable';

// Data both claim pages need: everything claimable, the activity ids this
// provider already has a claim in review for, and whether the signed-in
// account is a provider at all (family accounts can't claim).
export async function loadClaimContext(userId: string): Promise<{
  listings: ClaimListing[];
  pendingIds: string[];
  isProviderAccount: boolean;
  email: string;
}> {
  const [listings, { data: profile }, { data: pending }] = await Promise.all([
    getClaimableListings(),
    supabaseAdmin.from('provider_profiles').select('email').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('listing_claims')
      .select('activity_ids')
      .eq('provider_id', userId)
      .eq('status', 'pending'),
  ]);

  return {
    listings,
    pendingIds: ((pending ?? []) as { activity_ids: string[] }[]).flatMap((c) => c.activity_ids),
    isProviderAccount: !!profile,
    email: profile?.email ?? '',
  };
}
