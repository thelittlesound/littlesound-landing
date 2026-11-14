import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { feedUrl, resetFeedToken } from '@/lib/family-calendar-server';

export const dynamic = 'force-dynamic';

// New calendar link; the old one stops working right away (for a link that
// was shared by mistake). The family re-subscribes with the new one.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const token = await resetFeedToken(user.id);
  if (!token) return NextResponse.json({ error: 'Could not reset the link. Please try again.' }, { status: 500 });
  return NextResponse.json({ url: feedUrl(token) });
}
