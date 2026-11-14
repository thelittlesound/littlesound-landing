import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getListingsForDates } from '@/lib/activity-dates-server';
import { checkListing } from '@/lib/date-agent';

// Reading a few pages + one AI call can take up to ~50 seconds.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Run the agent on one listing. The Agent tab calls this once per listing
// (that's how "Run on all listings" works without hitting time limits).
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const catalog = await getListingsForDates();
  const listing = catalog.find((l) => l.activityId === body.activityId);
  if (!listing) {
    return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
  }
  try {
    const result = await checkListing(listing, { catalog, force: body.force === true });
    return NextResponse.json(result);
  } catch (e) {
    console.error('agent check crashed:', listing.activityId, e);
    return NextResponse.json({ error: 'The agent hit an unexpected error on this listing.' }, { status: 500 });
  }
}
