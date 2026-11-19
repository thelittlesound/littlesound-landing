import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog-server';
import { catalogStats } from '@/lib/catalog-stats';

// Live counts for the For Families / For Providers stat cards.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(catalogStats(await getCatalog()));
  } catch (e) {
    console.error('stats error:', e);
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
