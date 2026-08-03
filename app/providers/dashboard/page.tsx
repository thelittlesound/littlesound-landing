import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import ProviderDashboardClient, { type Listing, type ProviderProfile } from './ProviderDashboardClient';

export default async function ProviderDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/providers/login');
  }

  const { data: profileRow } = await supabaseAdmin
    .from('provider_profiles')
    .select('first_name, last_name, email, business_name, category, website, phone')
    .eq('id', user.id)
    .maybeSingle();

  const { data: listingsRow } = await supabaseAdmin
    .from('submissions')
    .select('id, created_at, status, title, category, subcategory, age_min, age_max, price, price_unit, neighborhood, admin_notes, reviewed_at')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: false });

  const profile: ProviderProfile = {
    first_name: profileRow?.first_name ?? '',
    last_name: profileRow?.last_name ?? '',
    email: profileRow?.email ?? user.email ?? '',
    business_name: profileRow?.business_name ?? '',
    category: profileRow?.category ?? '',
    website: profileRow?.website ?? '',
    phone: profileRow?.phone ?? '',
  };

  return <ProviderDashboardClient profile={profile} listings={(listingsRow as Listing[]) ?? []} />;
}
