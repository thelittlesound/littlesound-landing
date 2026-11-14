import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getListingsForDates } from '@/lib/activity-dates-server';
import { extractDates } from '@/lib/extract-dates';
import { seattleToday } from '@/lib/activity-dates';

// An AI extraction can take 10–30 seconds; the default function limit can be
// shorter than that.
export const maxDuration = 60;

// Draft dates from pasted page text. Saves nothing — the admin reviews and
// edits the draft, then saves through PUT /api/admin/dates/[activityId].
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const activityId = typeof body.activityId === 'string' ? body.activityId : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;
  if (!text) {
    return NextResponse.json({ error: 'Paste the text from the provider’s page first.' }, { status: 400 });
  }

  const listing = (await getListingsForDates()).find((l) => l.activityId === activityId);
  if (!listing) {
    return NextResponse.json({ error: 'Unknown listing.' }, { status: 404 });
  }

  const result = await extractDates({ pages: [{ url: sourceUrl, text }], listing, today: seattleToday() });
  // `'error' in` (not `!result.ok`): with strict mode off, TypeScript won't
  // narrow this union on the boolean flag.
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  // Here (manual paste) other programs on the page are just worth knowing
  // about; the Agent tab turns them into suggested listings.
  const notes = result.otherPrograms.map((p) => `Also on this page (not added here): ${p.title}`);
  return NextResponse.json({ items: result.items, warnings: [...result.warnings, ...notes] });
}
