import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { resolveListings } from '@/lib/claimable';
import { loadClaimContext } from '../loadClaimContext';
import ClaimClient from '../ClaimClient';

export const dynamic = 'force-dynamic';

// /providers/claim/42 — a direct claim link for one listing (what goes in
// outreach emails). Opens with that listing's business preselected; the
// business's other unowned listings are offered as checkboxes.
export default async function ClaimListingPage({ params }: { params: { activityId: string } }) {
  const activityId = decodeURIComponent(params.activityId);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/providers/login?next=/providers/claim/${encodeURIComponent(activityId)}`);
  }

  const [ctx, resolved] = await Promise.all([
    loadClaimContext(user.id),
    resolveListings([activityId]),
  ]);
  const listing = resolved.get(activityId) ?? null;

  let notice: 'not_found' | 'yours' | 'taken' | null = null;
  if (!listing) notice = 'not_found';
  else if (!listing.claimable) notice = listing.ownerId === user.id ? 'yours' : 'taken';

  return (
    <ClaimClient
      {...ctx}
      initialId={notice ? null : activityId}
      notice={notice}
      noticeTitle={listing?.title ?? null}
    />
  );
}
