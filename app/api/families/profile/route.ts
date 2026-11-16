import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cleanProfile } from '@/lib/family-profile';

export const dynamic = 'force-dynamic';

// Saves the family profile from the dashboard: first name, neighborhood, and
// each child's first name, age and interests.
//
// It creates the profile row when there isn't one. Accounts that didn't come
// through family signup (e.g. an admin account) have no row, and the old
// browser-side update matched nothing and failed silently.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 });

  const cleaned = cleanProfile(await request.json().catch(() => null));
  if ('error' in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        first_name: cleaned.first_name,
        neighborhood: cleaned.neighborhood,
        kids: cleaned.kids,
        preferences: cleaned.preferences,
      },
      { onConflict: 'id' }
    )
    .select('id');
  if (error || !data?.length) {
    console.error('profile save error:', error);
    return NextResponse.json({ error: 'Could not save your profile. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
