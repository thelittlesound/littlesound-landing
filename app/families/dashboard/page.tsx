import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import DashboardClient, { type Profile } from './DashboardClient';

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

  const initialProfile: Profile = {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    email: profile?.email ?? user.email ?? '',
    neighborhood: profile?.neighborhood ?? '',
    kids: profile?.kids ?? [],
    preferences: profile?.preferences ?? [],
  };

  return <DashboardClient profile={initialProfile} />;
}
