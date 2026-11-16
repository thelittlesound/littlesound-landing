import { NextResponse } from 'next/server';
import { getDateLines } from '@/lib/activity-dates-server';
import { getProviderActivities } from '@/lib/catalog-server';

// Live data: never serve a build-time snapshot. (A GET handler that doesn't
// read the request is static by default in Next 14, so without this, newly
// approved listings — and approved claims — wouldn't reach Discover until the
// next deploy.)
export const dynamic = 'force-dynamic';

export async function GET() {
  const [{ activities, claimedSeedIds, error }, dateLines] = await Promise.all([
    getProviderActivities(),
    // One upcoming-date line per listing ("Registration opens Mar 3"), keyed by
    // Discover id — covers seed listings too, not just provider ones.
    getDateLines(),
  ]);

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ activities: [], claimedSeedIds: [], dateLines });
  }

  return NextResponse.json({ activities, claimedSeedIds, dateLines });
}
