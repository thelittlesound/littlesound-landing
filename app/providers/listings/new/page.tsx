import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import ListingForm from './ListingForm';

export default async function ProviderListingNewPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/providers/login?next=/providers/listings/new');
  }

  const { data: profile } = await supabaseAdmin
    .from('provider_profiles')
    .select('first_name, last_name, email, business_name, category')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <ListingForm
      contactName={
        profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : ''
      }
      contactEmail={profile?.email ?? user.email ?? ''}
      businessName={profile?.business_name ?? ''}
      defaultCategory={profile?.category ?? ''}
    />
  );
}
