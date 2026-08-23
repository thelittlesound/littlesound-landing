import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import DashboardClient, { type Profile, type SavedActivity } from './DashboardClient';

// Always render fresh — avoids ever serving a router-cached snapshot from
// before a profile update or sign-in.
export const dynamic = 'force-dynamic';

export default async function FamilyDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this route, but redirect defensively in case
  // the page is ever reached without a session (e.g. cookie edge cases).
  if (!user) {
    redirect('/families/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, neighborhood, kids, preferences')
    .eq('id', user.id)
    .maybeSingle();

  // Activities this family has saved from Discover. RLS scopes this to the
  // signed-in user's own rows. Newest first.
  const { data: savedRows } = await supabase
    .from('saved_activities')
    .select('activity_id, title, provider, category, neighborhood, age_min, age_max, price, price_unit, website, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const initialProfile: Profile = {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    email: profile?.email ?? user.email ?? '',
    neighborhood: profile?.neighborhood ?? '',
    kids: profile?.kids ?? [],
    preferences: profile?.preferences ?? [],
  };

  const savedActivities: SavedActivity[] = (savedRows as SavedActivity[]) ?? [];

  return <DashboardClient profile={initialProfile} savedActivities={savedActivities} />;
}
