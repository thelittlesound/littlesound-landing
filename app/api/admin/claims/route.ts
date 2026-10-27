import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveListings, emailMatchesWebsite, sameWebsite } from '@/lib/claimable';

interface ClaimRow {
  id: string;
  created_at: string;
  provider_id: string;
  activity_ids: string[];
  business_name: string | null;
  role: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  business_name: string | null;
  website: string | null;
  phone: string | null;
}

// Claims for the /admin review queue, with the claimant's profile, the
// current ownership state of every requested listing, and verification hints.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get('status');

  let query = supabaseAdmin.from('listing_claims').select('*').order('created_at', { ascending: false });
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Claims fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }
  const claims = (data ?? []) as ClaimRow[];

  const providerIds = Array.from(new Set(claims.map((c) => c.provider_id)));
  const { data: profileRows } = providerIds.length
    ? await supabaseAdmin
        .from('provider_profiles')
        .select('id, first_name, last_name, email, business_name, website, phone')
        .in('id', providerIds)
    : { data: [] as ProfileRow[] };
  const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  const resolved = await resolveListings(Array.from(new Set(claims.flatMap((c) => c.activity_ids))));

  return NextResponse.json({
    claims: claims.map((c) => {
      const p = profiles.get(c.provider_id) ?? null;
      const listings = c.activity_ids.map((id) => {
        const l = resolved.get(id) ?? null;
        return {
          activityId: id,
          title: l?.title ?? '(listing no longer exists)',
          business: l?.business ?? null,
          website: l?.website ?? null,
          exists: !!l,
          claimable: l?.claimable ?? false,
          ownedByClaimant: !!l && l.ownerId === c.provider_id,
          ownedBySomeoneElse: !!l && !l.claimable && l.ownerId !== c.provider_id,
        };
      });
      return {
        ...c,
        claimant: p && {
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
          email: p.email,
          businessName: p.business_name,
          website: p.website,
          phone: p.phone,
        },
        listings,
        verification: {
          emailMatchesWebsite: listings.some((l) => emailMatchesWebsite(p?.email ?? null, l.website)),
          profileWebsiteMatches: listings.some((l) => sameWebsite(p?.website ?? null, l.website)),
        },
      };
    }),
  });
}
